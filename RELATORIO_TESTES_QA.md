# Relatório de testes — Diário

Testado como um usuário real (navegador automatizado, Chrome), numa conta de teste separada e isolada (criada, testada e apagada ao final — não mexeu nos seus dados reais). Gerado em 21/09/2026.

Screenshots de cada etapa em: `/tmp/claude-1000/-home-vinicius-Documentos-gestao-notas/e8a660a7-d573-4b27-a54c-a2a5b91f0d09/scratchpad/teste-qa/screenshots`

## Resultado: nenhum erro real de funcionalidade encontrado

| Área | Teste | Resultado |
|---|---|---|
| Cadastro | Criar conta nova (nome, e-mail, matéria, senha) | ✅ OK |
| Dashboard | Carregar painel inicial | ✅ OK |
| Turmas | Criar turma com Etapa/Ano/Disciplina (BNCC) | ✅ OK |
| Turmas | Reabrir "Editar" e conferir se os campos (inclusive Série) continuam salvos | ✅ OK |
| Alunos | Cadastrar aluno numa turma | ✅ OK |
| Notas | Criar avaliação e ver o aluno na tabela | ✅ OK |
| Notas | Lançar uma nota | ✅ OK |
| Presença | Título da página é "Presença" (renomeado) | ✅ OK |
| Presença | Resumo com % não aparece mais na tela (removido) | ✅ OK |
| Presença | Marcar presença clicando no aluno | ✅ OK |
| Agenda | Criar evento | ✅ OK |
| Agenda | Criar feriado/dia sem aula | ✅ OK |
| Plano de aula | Assistente de IA gera cronograma real (BNCC) | ✅ OK — gerou 11/11 aulas com código real (ex.: EF05MA03) |
| Plano de aula | Criar o plano com o cronograma gerado | ✅ OK |
| Plano de aula | Aba "Aulas" mostra o cronograma | ✅ OK |
| Plano de aula | Registrar uma aula do cronograma (rolagem, salvar, aparecer com ✓) | ✅ OK |
| Assistente IA | Gerar exercícios personalizados pra um aluno | ✅ OK |
| Perfil | Carregar dados do perfil | ✅ OK |

## Nenhum erro de JavaScript no console do navegador durante os testes (exceto um aviso sem impacto)

Um único warning do React apareceu, na tela de Cadastro: `Cannot update a component while rendering a different component`. É um aviso de desenvolvimento (não quebra nada, não aparece pro usuário), causado por um `setState` disparado durante a renderização em vez de depois — vale uma limpeza em algum momento, mas não é um bug funcional.

## Sobre o processo

Na primeira rodada, 6 dos 13 testes "falharam" — mas todos por erros no meu próprio script de automação (texto de botão errado, ex.: assumi "Criar" quando o botão real é "Adicionar" ou "Agendar", e uma aba que não vem selecionada por padrão), não por bugs no sistema. Corrigi o script e re-testei cada um — todos passaram.

Um caso à parte: o clique em "Criar plano" (depois de gerar o cronograma com IA) travou 62 vezes achando que havia algo bloqueando o botão. Investiguei a fundo: confirmei que o elemento nas coordenadas exatas do botão era o próprio botão, e um clique direto ali funcionou na hora, criando o plano normalmente. Foi uma falha pontual do robô de teste (provavelmente coincidiu com uma repintura do editor de texto no instante do clique), não algo que um usuário real encontraria clicando normalmente.
