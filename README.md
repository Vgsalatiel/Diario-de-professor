# Diário — Sistema de Gestão de Notas e Aulas

App pessoal do professor para organizar turmas, alunos, notas, presença,
planos de aula e agenda num só lugar. Funciona no navegador e pode ser
instalado no celular como app (PWA).

- **Front-end:** React + TypeScript + Vite, publicado no Netlify.
- **Back-end:** Express + Prisma + PostgreSQL (Supabase), publicado no Render
  — detalhes e variáveis de ambiente em [`backend/README.md`](backend/README.md).

## Funcionalidades

- **Conta** — cadastro com confirmação de e-mail, login e "esqueci minha senha".
- **Início** — o que precisa de atenção: alunos com baixa frequência, notas
  baixas e próximos compromissos; guia de primeiros passos e tour pelo menu.
- **Turmas** — cor, turno, dias de aula, etapa da BNCC; promover a turma para
  o ano seguinte. Anos letivos anteriores ficam só para consulta.
- **Alunos** — cadastro por turma, busca, importação de planilha e registro
  de dificuldades/facilidades de cada aluno.
- **Notas** — média automática (simples ou ponderada por peso), nota ou
  conceito, situação Aprovado/Recuperação; exporta para Excel, HTML e PDF.
- **Presença** — chamada em um toque por aluno nos dias de aula da turma
  (feriados descontados); exporta para Excel e PDF.
- **Histórico** — o que foi registrado em cada aula.
- **Plano de aula** — planos com provas, atividades e registro do que foi
  aplicado; cronograma gerado por IA a partir da BNCC.
- **Agenda** — provas, trabalhos (com controle de entregas), reuniões e
  feriados.
- **Assistente de IA** — listas de exercícios sob medida para cada aluno
  (Gemini).
- **Avisos** — resumo diário da agenda por e-mail e notificação no celular.
- **Acessibilidade** — VLibras (Libras, do gov.br) e telas preparadas para
  leitor de tela.

## Como rodar localmente

Requer **Node.js 20+** (o 18 quebra o build do PWA).

```bash
# API (em outro terminal) — precisa de backend/.env, ver backend/README.md
cd backend
npm install
npm run dev          # http://localhost:3333

# Front-end
npm install
npm run dev          # http://localhost:5173
```

O front-end chama `http://localhost:3333` por padrão; para apontar para outra
API, defina `VITE_API_URL`.

## Testes

```bash
npm test                         # front-end (Vitest)
cd backend && npm test           # back-end, unidade
cd backend && npm run test:integracao   # back-end, integração (Postgres local)
```

Os testes de integração só rodam num banco **local** com "teste" no nome
(padrão `diario_teste`; outro endereço via `DATABASE_URL_TESTE`) — eles
apagam as tabelas entre um teste e outro. O GitHub Actions roda tudo a cada
push e pull request na `main`.

## Build de produção

```bash
npm run build      # gera a pasta dist/
npm run preview    # pré-visualiza o build
```

## Estrutura

```
src/                 front-end
├── App.tsx          rotas (telas carregadas sob demanda)
├── pages/           uma tela por arquivo
├── components/      layout, janelas (Modal/Drawer), editor, tour
├── context/         estado global: login, dados, ano letivo, tema, avisos
└── lib/             cálculo de média e frequência, períodos, exportação, API
backend/
├── prisma/          schema e migrations do banco
└── src/modules/     uma pasta por recurso (auth, turmas, alunos, notas…)
```
