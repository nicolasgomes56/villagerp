// create-resource.ts

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const resourceName = process.argv[2];

if (!resourceName) {
	console.error(
		"Por favor, forneça um nome para o recurso: pnpm create-resource <nome>",
	);
	process.exit(1);
}

const resourcePath = path.join("resources", resourceName);

// Cria estrutura de pastas
const folders = [
	resourcePath,
	path.join(resourcePath, "src"),
	path.join(resourcePath, "src", "client"),
	path.join(resourcePath, "src", "server"),
];

for (const folder of folders) {
	if (!fs.existsSync(folder)) {
		fs.mkdirSync(folder, { recursive: true });
	}
}

// Cria arquivo client.ts
const clientContent = `console.log("Hello, world! I'm a client!");\n`;
fs.writeFileSync(
	path.join(resourcePath, "src", "client", "client.ts"),
	clientContent,
);

// Cria arquivo server.ts
const serverContent = `console.log("Hello, world! I'm a server!");\n`;
fs.writeFileSync(
	path.join(resourcePath, "src", "server", "server.ts"),
	serverContent,
);

// Cria tsconfig.json
const tsconfigContent = `{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Node LTS (22)",
  "compilerOptions": {
    "lib": ["ESNext", "dom"],
    "module": "node16", 
    "target": "es2022",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node16"
  }
}\n`;
fs.writeFileSync(path.join(resourcePath, "tsconfig.json"), tsconfigContent);

// Cria package.json
const packageContent = `{
  "name": "${resourceName}",
  "version": "1.0.0",
  "main": "index.js",
  "license": "ISC",
  "scripts": {
    "dev": "concurrently \\"pnpm run dev:client\\" \\"pnpm run dev:server\\"",
    "dev:client": "tsup src/client/client.ts --watch --out-dir dist/client",
    "dev:server": "tsup src/server/server.ts --watch --out-dir dist/server"
  }
}\n`;
fs.writeFileSync(path.join(resourcePath, "package.json"), packageContent);

// Instala dependências
execSync("pnpm install", { stdio: "inherit" });

console.log(`Recurso "${resourceName}" criado com sucesso!`);
