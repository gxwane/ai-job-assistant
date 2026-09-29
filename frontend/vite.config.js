import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    // vendor-echarts (ECharts + zrender) is ~1,134 KB minified. zrender is the rendering
    // engine and cannot be tree-shaken further. Set the limit to 1200 KB so the warning
    // only fires for genuinely unexpected regressions above that baseline.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Function form: receives every module ID so we can rename async chunks too.
        // The object form cannot rename the ECharts async chunk because Rollup uses
        // the package's internal entry filename ("index.js") as the chunk name.
        manualChunks(id) {
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'vendor-echarts'
          }
          if (id.includes('node_modules/element-plus') || id.includes('node_modules/@element-plus')) {
            return 'vendor-element'
          }
          if (id.includes('node_modules/vue') || id.includes('node_modules/vue-router') || id.includes('node_modules/pinia') || id.includes('node_modules/@vue')) {
            return 'vendor-vue'
          }
        },
      },
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['tests/ui/**', 'node_modules/**', 'dist/**'],
  },
})
