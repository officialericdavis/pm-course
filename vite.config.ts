import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// ESM-compatible __dirname for Vite config when using "type: module"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached across all pages
          'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],
          // Router — shared across all pages
          'vendor-router': ['react-router'],
          // Icons — large, shared across many components
          'vendor-icons': ['lucide-react'],
          // Charts — only loaded on admin analytics pages
          'vendor-charts': ['recharts'],
          // UI utils
          'vendor-ui': ['sonner', 'xlsx'],
        },
      },
    },
  },
})
