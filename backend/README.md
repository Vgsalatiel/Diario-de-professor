# Backend — Diário

API em Express + Prisma + PostgreSQL (Supabase), deployada no Render.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha (veja os comentários de cada
variável no próprio arquivo). Em produção (Render), configure as mesmas
variáveis no painel do serviço.

## Configurando o Resend (e-mail de "esqueci minha senha")

1. Crie uma conta em [resend.com](https://resend.com) e gere uma API key em
   **API Keys** → coloque em `RESEND_API_KEY`.
2. **Enquanto o domínio não estiver verificado** (modo sandbox), o Resend só
   deixa enviar e-mail para o próprio endereço cadastrado na conta Resend —
   qualquer outro professor recebe erro 403. Serve só pra testar.
3. **Para enviar de verdade para qualquer professor**, verifique um domínio
   próprio:
   - No painel do Resend, vá em **Domains** → **Add Domain** e informe um
     domínio que você controle (ex.: `arelsabrasil.com.br` ou um subdomínio
     como `mail.arelsabrasil.com.br`).
   - O Resend vai mostrar registros DNS (TXT, MX, DKIM) — adicione-os no
     painel do seu provedor de domínio (Registro.br, GoDaddy, Cloudflare,
     etc.). A verificação costuma levar de alguns minutos a algumas horas.
   - Depois que o domínio aparecer como **Verified** no painel do Resend,
     troque a variável `EMAIL_FROM` para usar esse domínio, por exemplo:
     ```
     EMAIL_FROM="Diário <naoresponda@arelsabrasil.com.br>"
     ```
   - Reinicie o backend (no Render, um novo deploy; localmente, reinicie o
     `npm run dev`) para carregar a variável nova.
4. Sem domínio verificado, o app continua funcionando normalmente para login,
   cadastro etc. — só a redefinição de senha fica limitada ao e-mail de teste
   da conta Resend até você concluir a verificação.

## CORS

A API só aceita chamadas de navegador vindas das origens listadas em
`FRONTEND_URL` (separadas por vírgula se houver mais de uma, ex. produção +
preview). Sem essa variável definida, libera qualquer origem — é o
comportamento padrão em desenvolvimento local, mas **não deve ficar assim em
produção**: configure `FRONTEND_URL` no Render com a URL real do Netlify.

## Exercícios personalizados por IA (Gemini)

O Assistente IA gera listas de exercícios sob medida por aluno, com base
numa observação de dificuldade/facilidade salva no cadastro dele. Chama a
API do Gemini de verdade (`src/lib/gemini.ts`).

1. Gere uma API key em [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   e coloque em `GEMINI_API_KEY`.
2. `GEMINI_MODEL` é opcional (padrão `gemini-3.6-flash`) — o Google
   descontinua modelos de tempos em tempos; se a geração começar a falhar
   com erro 404 "model ... no longer available", a própria resposta de erro
   já diz qual modelo novo usar.
3. Sem `GEMINI_API_KEY` configurada, o endpoint responde com erro em vez de
   gerar — o resto do app continua funcionando normalmente.
4. O Gemini responde `503` (alta demanda) com alguma frequência mesmo em uso
   normal — o código já tenta de novo automaticamente algumas vezes antes de
   desistir, então isso raramente chega a aparecer pro professor.

## Rate limiting

Login, cadastro e "esqueci minha senha" têm limite de tentativas por IP
(`src/middleware/rateLimit.ts`), pra dificultar força bruta de senha e evitar
gasto de e-mail com pedidos de redefinição em série. Como o Render fica atrás
de um proxy reverso, `app.set('trust proxy', 1)` está configurado em
`src/app.ts` — sem isso, o rate limit trataria todo mundo como o mesmo IP (o
do proxy) e bloquearia todo mundo junto na primeira rajada.

## Rodando local

```bash
npm install
npm run prisma:generate
npm run dev
```

API sobe em `http://localhost:3333`. Health check: `GET /saude`.
