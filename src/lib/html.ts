import DOMPurify from 'dompurify'

// Só o que a barra de ferramentas do EditorRico gera: parágrafo,
// subtítulos, negrito, itálico e listas. O Quill marca o tipo da lista em
// data-list e o recuo em class="ql-indent-N". Tem que bater com a lista
// do backend (backend/src/lib/html.ts).
const TAGS_PERMITIDAS = ['p', 'br', 'h2', 'h3', 'strong', 'em', 'ol', 'ul', 'li']
const ATRIBUTOS_PERMITIDOS = ['data-list', 'class']

// Limpa HTML vindo do banco antes de colocar no DOM. O backend já limpa ao
// salvar, mas registros antigos (de antes dessa limpeza) não passaram por ela.
export function limparHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: TAGS_PERMITIDAS,
    ALLOWED_ATTR: ATRIBUTOS_PERMITIDOS,
  })
}
