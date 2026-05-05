import { defineConfig, transformWithOxc } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'load-js-as-jsx',
      enforce: 'pre',
      async transform(code, id) {
        if (!id.includes('/src/') && !id.includes('\\src\\')) return null
        if (!id.endsWith('.js')) return null

        return transformWithOxc(code, id, {
          lang: 'jsx',
        })
      },
    },

    react({
      include: /\.(js|jsx)$/,
    }),
  ],

  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
})