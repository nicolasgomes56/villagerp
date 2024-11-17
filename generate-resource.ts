import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const resourceName = process.argv[2]

if (!resourceName) {
  console.error('Por favor, forneça um nome para o recurso: pnpm create-resource <nome>')
  process.exit(1)
}

const boilerplatePath = '_boilerplate'
const resourcePath = path.join('resources', resourceName)

// Verifica se o _boilerplate existe
if (!fs.existsSync(boilerplatePath)) {
  console.error(`O diretório _boilerplate não foi encontrado em ${boilerplatePath}`)
  process.exit(1)
}

// Copia todo o conteúdo do _boilerplate para o novo resource
fs.cpSync(boilerplatePath, resourcePath, { recursive: true })

// Atualiza o package.json com o nome da nova resource
const packageJsonPath = path.join(resourcePath, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
packageJson.name = resourceName
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))

// Instala as dependências no novo resource
execSync('pnpm install', { cwd: resourcePath, stdio: 'inherit' })

console.log(`Recurso "${resourceName}" criado com sucesso a partir do _boilerplate!`)
