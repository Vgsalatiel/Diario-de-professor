import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Integração (banco de teste local) roda à parte: npm run test:integracao
    exclude: ['src/**/*.integ.test.ts', 'node_modules/**'],
    // lib/jwt.ts exige JWT_SECRET ao ser importado; valor só de teste.
    env: {
      JWT_SECRET: 'segredo-so-para-testes',
      // Vazias de propósito: nenhum teste chama Resend ou Gemini de verdade.
      RESEND_API_KEY: '',
      GEMINI_API_KEY: '',
    },
  },
})
