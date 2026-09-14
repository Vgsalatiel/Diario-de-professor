const TAMANHO_MINIMO = 3
const TAMANHO_MAXIMO = 150

// Letras (com acentos, de qualquer idioma), espaços, hífen e apóstrofo.
const CARACTERES_VALIDOS = /^[\p{L}\s'-]+$/u

// Remove espaços duplicados e das pontas — ex.: "  João  Pedro " -> "João Pedro"
export function normalizarNome(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ')
}

// Devolve a mensagem de erro, ou null se o nome for válido.
export function validarNome(nome: string): string | null {
  const limpo = normalizarNome(nome)

  if (!limpo) return 'Informe o nome.'
  if (limpo.length < TAMANHO_MINIMO) {
    return `O nome deve ter pelo menos ${TAMANHO_MINIMO} caracteres.`
  }
  if (limpo.length > TAMANHO_MAXIMO) {
    return `O nome deve ter no máximo ${TAMANHO_MAXIMO} caracteres.`
  }
  if (/\d/.test(limpo)) return 'O nome não pode conter números.'
  if (!CARACTERES_VALIDOS.test(limpo)) {
    return 'O nome contém caracteres inválidos.'
  }

  return null
}
