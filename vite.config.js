import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const offlinePrecacheManifest = {
  name: 'progresso-offline-precache-manifest',
  apply: 'build',
  generateBundle(_options, bundle) {
    const assets = Object.keys(bundle)
      .filter((file) => /\.(?:js|css|woff2?|ttf|otf|svg|png|jpe?g|webp)$/i.test(file))
      .map((file) => `/${file}`)
    this.emitFile({
      type: 'asset',
      fileName: 'precache-manifest.json',
      source: JSON.stringify({ assets }),
    })
  },
}

export default defineConfig({
  plugins: [react(), offlinePrecacheManifest],
})
