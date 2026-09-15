// Extrai um resumo em texto puro de um HTML (ex.: conteúdo do editor
// rico), pra mostrar como prévia em listas/cartões.
export function resumoTexto(html: string, maxChars = 90): string {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  const texto = (div.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (texto.length <= maxChars) return texto
  return `${texto.slice(0, maxChars).trimEnd()}…`
}
