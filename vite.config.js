import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

//? https://vitejs.dev/config/
export default defineConfig({
  plugins: [
		vue(),
		{
			name: "configure-response-headers",
			configureServer: server => {
				server.middlewares.use((_req, res, next) => {
					res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
					res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
					next();
				})
			},
		}
	],
  base: process.env.NODE_ENV === 'dev' ? '/' : './',
  build: {
    outDir: 'build/Veil',
  },
  server: {
    port: 4160,
		headers: {
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin',
		}
  },
  resolve: {
    alias: {
      '@Veil': fileURLToPath(new URL('./Veil', import.meta.url)),
      '@Chiton': fileURLToPath(new URL('./Chiton', import.meta.url)),
      '@Mouseion': fileURLToPath(new URL('./Mouseion', import.meta.url)),
      '@Iris': fileURLToPath(new URL('./', import.meta.url)),
    }
  }
})
