const fs = require('fs')
const os = require('os')
const https = require('https')
const { spawn } = require('child_process')
const _7z = require('7zip')['7z']
const chalk = require('chalk')
const packageJson = require('../package.json')

const isWindows = os.platform() === 'win32'
const platformFolder = isWindows ? 'build_server_windows' : 'build_proot_linux'
const baseUrl = `https://runtime.fivem.net/artifacts/fivem/${platformFolder}/master/`
const serverVersion = packageJson.data.serverVersion
const downloadRegex = new RegExp(`${serverVersion}-[a-f0-9]+/(?:server|fx)\\.[a-z0-9.]+`, 'gim')
const activeDownloads = new Set()

if (fs.existsSync(serverVersion)) {
  console.log(chalk.yellow(`[INFO] A versão do servidor (${serverVersion}) já está instalada.`))
  process.exit(0)
}

const downloadServer = serverFile => {
  const fileExtension = serverFile.split('.').pop()
  const filename = `server-${serverVersion}.${fileExtension}`

  if (activeDownloads.has(filename)) {
    console.log(chalk.blue(`[INFO] Download já em andamento para: ${filename}`))
    return
  }
  activeDownloads.add(filename)

  console.log(chalk.green(`[DOWNLOAD] Iniciando download de: ${serverFile}`))

  https
    .get(`${baseUrl}${serverFile}`, res => {
      const chunks = []

      res.on('data', chunk => chunks.push(chunk))

      res.on('end', () => {
        const fileBuffer = Buffer.concat(chunks)
        console.log(chalk.green(`[DOWNLOAD CONCLUÍDO] Arquivo salvo como: ${filename}`))

        fs.mkdirSync(serverVersion, { recursive: true })
        fs.writeFileSync(`${serverVersion}/${filename}`, fileBuffer)

        console.log(chalk.blue(`[EXTRAÇÃO] Extraindo arquivos para a pasta: ${serverVersion}`))
        const extractTask = isWindows
          ? spawn(_7z, ['x', `${serverVersion}/${filename}`, '-y', `-o${serverVersion}`])
          : spawn('tar', ['-xf', `${serverVersion}/${filename}`, '-C', serverVersion])

        extractTask.stdout.on('data', data =>
          console.log(chalk.blue(`[EXTRAÇÃO] ${data.toString()}`)),
        )
        extractTask.stderr.on('data', data =>
          console.error(chalk.red(`[ERRO EXTRAÇÃO] ${data.toString()}`)),
        )

        extractTask.on('exit', () => {
          console.log(
            chalk.yellow(`[EXTRAÇÃO CONCLUÍDA] Removendo arquivo temporário: ${filename}`),
          )
          fs.unlinkSync(`${serverVersion}/${filename}`)
        })
      })
    })
    .on('error', err => {
      console.error(
        chalk.red(`[ERRO DOWNLOAD] Não foi possível baixar ${serverFile}: ${err.message}`),
      )
    })
}

https
  .get(baseUrl, res => {
    let body = ''

    res.on('data', chunk => {
      body += chunk
    })

    res.on('end', () => {
      const matches = body.match(downloadRegex) || []
      if (matches.length === 0) {
        console.log(chalk.yellow('[INFO] Nenhum arquivo correspondente encontrado para download.'))
      } else {
        matches.forEach(match => downloadServer(match))
      }
    })
  })
  .on('error', err => {
    console.error(
      chalk.red(`[ERRO CONEXÃO] Não foi possível acessar a URL (${baseUrl}): ${err.message}`),
    )
  })
