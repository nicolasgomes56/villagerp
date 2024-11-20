import { defineConfig } from 'tsup'
import HotReloadPlugin from './hotReloadPlugin'

export default defineConfig({
  entry: ['src/client/client.ts', 'src/server/server.ts'],
  outDir: 'build',
  sourcemap: true,
  clean: true,
  watch: true,
  plugins: [{ name: 'hot-reload', ...new HotReloadPlugin('source') }],
})
