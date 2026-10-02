// Converte o HTML do editor rico em texto puro, mantendo uma quebra de
// linha no fim de cada parágrafo, título ou item de lista. Usa DOMParser
// porque o documento que ele cria é inerte: nada ali carrega imagem nem
// roda script. Com innerHTML num <div>, mesmo solto, um
// <img src=x onerror=...> salvo no banco executaria na tela de quem abre.
export function htmlParaTexto(html: string): string {
  if (!html) return ''
  const comQuebras = html.replace(/<br\s*\/?>|<\/(p|li|h[1-6])>/gi, (m) => `${m}\n`)
  const doc = new DOMParser().parseFromString(comQuebras, 'text/html')
  return (doc.body.textContent ?? '').replace(/\n{2,}/g, '\n').trim()
}

// Extrai um resumo em texto puro de um HTML (ex.: conteúdo do editor
// rico), pra mostrar como prévia em listas/cartões.
export function resumoTexto(html: string, maxChars = 90): string {
  const texto = htmlParaTexto(html).replace(/\s+/g, ' ').trim()
  if (texto.length <= maxChars) return texto
  return `${texto.slice(0, maxChars).trimEnd()}…`
}
