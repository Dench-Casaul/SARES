import { defineConfig } from 'vite'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import preventionSuggestionHandler from './api/generate-prevention-suggestion.js'
import counselorRecommendationHandler from './api/generate-counselor-recommendation.js'

function localApiPlugin() {
  const handlers = {
    '/api/generate-prevention-suggestion': preventionSuggestionHandler,
    '/api/generate-counselor-recommendation': counselorRecommendationHandler,
  }

  return {
    name: 'sares-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname
        if (!pathname.startsWith('/api/')) {
          next()
          return
        }

        const handler = handlers[pathname]
        if (!handler) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'API route not found.' }))
          return
        }

        let body
        if (req.method === 'POST') {
          const chunks = []
          let size = 0
          for await (const chunk of req) {
            size += chunk.length
            if (size > 1_000_000) {
              res.statusCode = 413
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: 'Request body is too large.' }))
              return
            }
            chunks.push(chunk)
          }

          if (chunks.length) {
            try {
              body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            } catch {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: 'Request body must be valid JSON.' }))
              return
            }
          }
        }

        const response = {
          statusCode: 200,
          status(code) {
            this.statusCode = code
            return this
          },
          json(value) {
            res.statusCode = this.statusCode
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(value))
            return this
          },
        }

        try {
          await handler({ method: req.method, headers: req.headers, body }, response)
        } catch (error) {
          console.error(`Local API request failed (${pathname}):`, error)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'The API request failed.' }))
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), localApiPlugin()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    },
  }
})
