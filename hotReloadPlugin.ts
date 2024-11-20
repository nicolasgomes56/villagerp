import * as fs from 'node:fs'
import * as path from 'node:path'
import { Rcon } from 'rcon-client'

const findResourceName = (filePath: string): string | null => {
  const dirName = path.dirname(filePath)
  if (fs.existsSync(path.resolve(dirName, 'fxmanifest.lua'))) {
    return path.basename(dirName)
  }
  if (dirName === path.parse(dirName).root) {
    return null
  }
  return findResourceName(dirName)
}

class HotReloadPlugin {
  private source: string
  private address: string
  private port: number
  private password: string
  private chunkVersions: Record<string, string> = {}
  private restartQueue: string[] = []
  private running = false

  constructor(source: string, address = '127.0.0.1', port = 30110, password = 'qwerty') {
    this.source = source
    this.address = address
    this.port = port
    this.password = password
    console.log(
      `HotReloadPlugin iniciado com source: ${this.source}, address: ${this.address}, port: ${this.port}`,
    )
  }

  private async restartResource(resource: string) {
    try {
      const rcon = await Rcon.connect({
        host: this.address,
        port: this.port,
        password: this.password,
      })
      console.log(`RCON [${this.source}] Reiniciando Recurso: ${resource}`)
      await rcon.send(`restart ${resource}`)
      rcon.end()
    } catch (error) {
      console.error(`Erro ao reiniciar o recurso ${resource}:`, error)
    }
  }

  private async processRestartQueue() {
    if (this.running || this.restartQueue.length === 0) {
      return
    }
    this.running = true

    while (this.restartQueue.length > 0) {
      const resource = this.restartQueue.shift()
      if (resource) {
        await this.restartResource(resource)
        await this.delay(500) // Espera 500ms entre reinícios
      }
    }

    this.running = false
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public apply(compiler: any) {
    compiler.hooks.done.tapAsync('HotReloadPlugin', (stats: any, callback: () => void) => {
      const outputPath = compiler.options.output.path
      const resources = new Set<string>()

      for (const chunk of stats.compilation.chunks) {
        const oldVersion = this.chunkVersions[chunk.name]
        this.chunkVersions[chunk.name] = chunk.hash
        if (oldVersion && chunk.hash !== oldVersion) {
          for (const file of chunk.files) {
            const resource = findResourceName(path.resolve(outputPath, file))
            if (resource) {
              resources.add(resource)
            }
          }
        }
      }

      for (const resource of resources) {
        if (!this.restartQueue.includes(resource)) {
          this.restartQueue.push(resource)
        }
      }

      this.processRestartQueue()
      callback()
    })
  }
}

export default HotReloadPlugin
