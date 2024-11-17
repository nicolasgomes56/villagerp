import * as udp from 'node:dgram'
import * as fs from 'node:fs'
import * as path from 'node:path'

const findResourceName = (filePath: string): string | null | undefined => {
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
  private chunkVersions: Record<string, string>
  private restartQueue: string[]
  private running: boolean

  constructor(source: string, address = '127.0.0.1', port = 30110, password = 'qwerty') {
    this.source = source
    this.address = address
    this.port = port
    this.password = password
    this.chunkVersions = {}
    this.restartQueue = []
    this.running = false
  }

  private async processRestartQueue() {
    if (this.running || this.restartQueue.length === 0) {
      return
    }
    this.running = true

    const resource = this.restartQueue.shift()
    if (!resource) {
      this.running = false
      return
    }

    await new Promise(res => setTimeout(res, 500))
    const command = `restart ${resource}`
    let socketClosed = false
    const connection = udp.createSocket('udp4')

    connection.on('close', () => {
      socketClosed = true
    })
    connection.on('error', () => {
      connection.close()
    })
    console.log(`RCON [${this.source}] Reiniciando Recurso: ${resource}`)
    const buffer = Buffer.alloc(11 + this.password.length + command.length)
    buffer.writeUInt32LE(0xffffffff, 0)
    buffer.write('rcon ', 4, 'ascii')
    buffer.write(this.password, 9, 'ascii')
    buffer.write(' ', 9 + this.password.length, 'ascii')
    buffer.write(command, 10 + this.password.length, 'ascii')
    buffer.write('\n', 10 + this.password.length + command.length, 'ascii')

    connection.send(buffer, 0, buffer.length, this.port, this.address, () => {
      connection.close()
      this.running = false
      this.processRestartQueue()
    })

    setTimeout(() => {
      if (!socketClosed) {
        connection.close()
        this.running = false
        this.processRestartQueue()
      }
    }, 1000)
  }

  public apply(compiler: {
    hooks: {
      done: {
        tapAsync: (
          arg0: string,
          arg1: (
            stats: {
              compilation: {
                chunks: Array<{ name: string; hash: string; files: string[] }>
              }
            },
            callback: () => void,
          ) => void,
        ) => void
      }
    }
    options: { output: { path: string } }
  }) {
    compiler.hooks.done.tapAsync(
      'HotReloadPlugin',
      (
        stats: {
          compilation: {
            chunks: Array<{ name: string; hash: string; files: string[] }>
          }
        },
        callback: () => void,
      ) => {
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
          this.processRestartQueue()
        }
        callback()
      },
    )
  }
}

export default HotReloadPlugin
