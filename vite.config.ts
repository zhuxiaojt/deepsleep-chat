import fs from 'node:fs'
import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig, type Plugin } from 'vite'

/**
 * 原有服务层使用 NodeNext 风格的 `.js` 后缀导入 TypeScript 文件。
 * 这里在解析时把 `./x.js` 映射到实际的 `./x.ts`，避免逐个修改迁移过来的模块。
 */
const jsToTs = (): Plugin => ({
  name: 'js-to-ts',
  enforce: 'pre',
  resolveId(source, importer) {
    if (!importer || !source.startsWith('.') || !source.endsWith('.js')) {
      return null
    }
    const resolved = path.resolve(path.dirname(importer), source)
    for (const candidate of [resolved.slice(0, -3) + '.ts', resolved.slice(0, -3) + '.tsx']) {
      if (fs.existsSync(candidate)) {
        return candidate.replace(/\\/g, '/')
      }
    }
    return null
  },
})

export default defineConfig({
  base: './',
  plugins: [vue(), vueJsx(), jsToTs()],
  server: {
    port: 8090,
    host: true,
  },
  build: {
    target: 'esnext',
  },
})
