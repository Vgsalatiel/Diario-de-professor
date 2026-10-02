import sanitizeHtml from 'sanitize-html'

// Só o que a barra de ferramentas do EditorRico gera: parágrafo,
// subtítulos, negrito, itálico e listas. O Quill marca o tipo da lista em
// data-list e o recuo em class="ql-indent-N". Tem que bater com a lista
// do frontend (src/lib/html.ts).
//
// Versão fixada em 2.17.5 porque a 2.18 exige Node 22. Os alertas do
// npm audit para a 2.17.x só valem com textarea ou SVG animado
// liberados, o que esta lista não faz.
const OPCOES: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'h2', 'h3', 'strong', 'em', 'ol', 'ul', 'li'],
  allowedAttributes: { li: ['data-list', 'class'], p: ['class'] },
  allowedClasses: { li: ['ql-indent-*'], p: ['ql-indent-*'] },
}

// Limpa o HTML do editor rico antes de salvar, pra que um <img onerror>
// ou <script> gravado por um usuário não rode na tela de outro.
export function limparHtml(html: string): string {
  return sanitizeHtml(html, OPCOES)
}

// Escapa texto puro (ex.: saída da IA) antes de montar HTML com ele.
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
