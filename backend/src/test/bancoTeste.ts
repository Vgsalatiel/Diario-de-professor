// Trava contra rodar os testes de integração no banco errado: eles
// apagam todas as tabelas entre um teste e outro.
export function exigirBancoDeTeste(url: string | undefined): void {
  if (!url) throw new Error('DATABASE_URL não definida para os testes de integração.')
  let alvo: URL
  try {
    alvo = new URL(url)
  } catch {
    throw new Error('DATABASE_URL dos testes não é uma URL válida.')
  }
  const host = alvo.searchParams.get('host') ?? alvo.hostname
  const local = ['localhost', '127.0.0.1', '::1', ''].includes(alvo.hostname) || host.startsWith('/')
  const nome = alvo.pathname.replace(/^\//, '')
  if (!local || !nome.includes('teste')) {
    throw new Error(
      `Recusado: os testes de integração só rodam num banco local com "teste" no nome (veio ${alvo.hostname}/${nome}).`,
    )
  }
}
