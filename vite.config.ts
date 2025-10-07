// vite.config.ts

import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { mochaPlugins } from "@getmocha/vite-plugins";

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [...mochaPlugins(process.env as any), react(), cloudflare()],
  server: {
    // CORREÇÃO: Adicionada configuração explícita de proxy
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788', // O endereço do seu worker local
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
