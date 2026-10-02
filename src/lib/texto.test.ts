// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { htmlParaTexto, resumoTexto } from './texto'
import { limparHtml } from './html'

describe('htmlParaTexto / resumoTexto', () => {
  it('mantém uma quebra por parágrafo e decodifica entidades', () => {
    expect(htmlParaTexto('<p>Linha 1</p><p>a &amp; b</p>')).toBe('Linha 1\na & b')
  })

  it('não junta parágrafos no resumo e corta no limite', () => {
    expect(resumoTexto('<p>a</p><p>b</p>')).toBe('a b')
    expect(resumoTexto('<p>abcdefghij</p>', 5)).toBe('abcde…')
  })
})

describe('limparHtml', () => {
  it('mantém a formatação do editor e remove o perigoso', () => {
    const sujo = '<h2>T</h2><p onclick="x()">oi<img src=x onerror=alert(1)><script>1</script></p><ol><li data-list="bullet">i</li></ol>'
    expect(limparHtml(sujo)).toBe('<h2>T</h2><p>oi</p><ol><li data-list="bullet">i</li></ol>')
  })
})
