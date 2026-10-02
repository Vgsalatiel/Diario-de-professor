import { defineConfig } from 'vitest/config'

// Banco de teste LOCAL — nunca o Supabase. O globalSetup e o setup
// conferem isso antes de mexer em qualquer coisa.
const BANCO_TESTE = process.env.DATABASE_URL_TESTE ?? 'postgresql://vinicius@localhost/diario_teste?host=/var/run/postgresql'

// O globalSetup (migrations) roda no processo principal, fora do "env" dos
// testes — por isso a URL vai também pro process.env daqui.
process.env.DATABASE_URL = BANCO_TESTE
process.env.DIRECT_URL = BANCO_TESTE

export default defineConfig({
  test: {
    include: ['src/**/*.integ.test.ts'],
    env: {
      JWT_SECRET: 'segredo-so-para-testes',
      // Vazias de propósito: o Prisma carrega o .env, e sem isso os testes
      // mandariam e-mail de verdade (Resend) e chamariam o Gemini.
      RESEND_API_KEY: '',
      GEMINI_API_KEY: '',
      DATABASE_URL: BANCO_TESTE,
      DIRECT_URL: BANCO_TESTE,
    },
    globalSetup: ['src/test/globalSetup.ts'],
    setupFiles: ['src/test/setup.ts'],
    // Um arquivo por vez: todos usam o mesmo banco e limpam as tabelas.
    fileParallelism: false,
  },
})
