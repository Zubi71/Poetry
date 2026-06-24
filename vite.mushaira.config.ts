import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dedicated build for the premium Mushaira room + listing experience.
// Output is a self-contained IIFE bundle + single CSS file with stable
// (unhashed) filenames so the static, no-build vanilla-JS site can load
// it via plain <script>/<link> tags, exactly like every other asset.
export default defineConfig({
  root: '.',
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  build: {
    outDir: 'dist/mushaira-room',
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      input: 'src/mushaira-room/index.tsx',
      output: {
        format: 'iife',
        name: 'MushairaRoomReactBundle',
        entryFileNames: 'mushaira-room.js',
        assetFileNames: 'mushaira-room.[ext]'
      }
    }
  }
});
