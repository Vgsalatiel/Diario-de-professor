# Diário — Sistema de Gestão de Notas e Aulas

Plataforma para professores organizarem turmas, alunos, notas e a agenda de
provas e eventos num só lugar. Feita em **React + TypeScript + Vite**.

Este projeto cobre o escopo até o tópico **"Agenda de provas e eventos"** da
proposta original.

## Funcionalidades

- **Login e perfil** — acesso por e-mail e senha (simulado, sem servidor);
  perfil com foto, nome e matéria.
- **Turmas** — cadastrar, editar e excluir turmas, com cor de identificação.
- **Alunos** — cadastro por turma, busca por nome/matrícula e filtro por turma.
- **Notas** — lançamento em tabela com **média automática**. O modelo de
  cálculo é configurável por turma (**média simples** ou **ponderada por peso**)
  e a nota de aprovação define a situação (Aprovado / Recuperação).
- **Exportação** — exporta as notas da turma para **Excel (.xlsx)** e **HTML**.
- **Agenda** — provas, trabalhos, reuniões e outros eventos, com data, horário,
  turma e conteúdo relacionado.
- **Dashboard** — resumo com totais de turmas, alunos, avaliações próximas e a
  lista dos próximos eventos.

## Como rodar

Requer Node.js 18+.

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (algo como `http://localhost:5173`).

**Login de demonstração:**
- E-mail: `professora@escola.com`
- Senha: `123456`

## Build de produção

```bash
npm run build      # gera a pasta dist/
npm run preview    # pré-visualiza o build
```

## Como os dados são guardados

Tudo fica salvo no **navegador (localStorage)** — os dados permanecem entre
sessões, mas ficam apenas naquele computador/navegador. Para começar do zero,
limpe os dados do site nas configurações do navegador. Não há back-end.

## Estrutura

```
src/
├── main.tsx            # ponto de entrada
├── App.tsx             # rotas e providers
├── types.ts            # modelos de dados
├── context/            # estado global (auth + dados)
├── lib/                # cálculo de médias, exportação, storage, eventos
├── components/         # layout, modal, rota protegida
├── pages/              # login, dashboard, turmas, alunos, notas, agenda, perfil
└── data/seed.ts        # dados de exemplo
```

## Próximas etapas (fora deste escopo)

Conforme a proposta original, os próximos módulos seriam: lembretes automáticos
(e-mail/WhatsApp), anotações e planejamento de aulas, e análise de textos com IA.
