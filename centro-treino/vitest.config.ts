import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" lança erro fora do Next; nos testes vira módulo vazio
      "server-only": path.resolve(__dirname, "src/test/vazio.ts"),
    },
  },
  // JSX automático (como no Next), para renderizar o PDF nos testes
  esbuild: { jsx: "automatic" },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
