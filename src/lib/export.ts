import * as XLSX from 'xlsx'
import type {
  Aluno,
  Avaliacao,
  ConfigCalculo,
  DataAula,
  MapaDeFrequencia,
  MapaDeNotas,
  Turma,
} from '../types'
import { calcularMedia, chaveNota, formatarNota, situacao } from './media'
import { calcularFrequencia, chavePresenca } from './frequencia'
import { formatarData } from './eventos'

interface DadosTurma {
  turma: Turma
  alunos: Aluno[]
  avaliacoes: Avaliacao[]
  notas: MapaDeNotas
  config: ConfigCalculo
}

interface DadosFrequencia {
  turma: Turma
  alunos: Aluno[]
  datasAula: DataAula[]
  frequencia: MapaDeFrequencia
}

// Monta uma matriz (linhas x colunas) com cabeçalho, alunos e média
function montarMatriz({ turma, alunos, avaliacoes, notas, config }: DadosTurma) {
  const cabecalho = [
    'Aluno',
    ...avaliacoes.map((a) => a.nome),
    'Média',
    'Situação',
  ]

  const linhas = alunos.map((aluno) => {
    const media = calcularMedia(aluno.id, avaliacoes, notas, config.modelo)
    const sit = situacao(media, config.mediaAprovacao)
    return [
      aluno.nome,
      ...avaliacoes.map((a) => {
        const v = notas[chaveNota(aluno.id, a.id)]
        return typeof v === 'number' ? v : ''
      }),
      media ?? '',
      sit === 'aprovado' ? 'Aprovado' : sit === 'recuperacao' ? 'Recuperação' : '—',
    ]
  })

  return { cabecalho, linhas, titulo: turma.nome }
}

export function exportarExcel(dados: DadosTurma): void {
  const { cabecalho, linhas } = montarMatriz(dados)
  const aoa = [cabecalho, ...linhas]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // largura de colunas
  ws['!cols'] = cabecalho.map((c, i) => ({
    wch: i === 0 ? 26 : Math.max(c.length + 2, 10),
  }))

  const wb = XLSX.utils.book_new()
  const nomeAba = dados.turma.nome.slice(0, 28) || 'Turma'
  XLSX.utils.book_append_sheet(wb, ws, nomeAba)
  XLSX.writeFile(wb, `notas-${normalizar(dados.turma.nome)}.xlsx`)
}

function montarHTML(dados: DadosTurma): { html: string; titulo: string } {
  const { cabecalho, linhas, titulo } = montarMatriz(dados)

  const ths = cabecalho.map((c) => `<th>${escapar(c)}</th>`).join('')
  const trs = linhas
    .map((linha) => {
      const tds = linha
        .map((cel, i) => {
          const valor =
            i < cabecalho.length - 1 && typeof cel === 'number'
              ? formatarNota(cel)
              : String(cel ?? '')
          return `<td>${escapar(valor)}</td>`
        })
        .join('')
      return `<tr>${tds}</tr>`
    })
    .join('\n')

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Notas — ${escapar(titulo)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2433; margin: 32px; }
  h1 { font-size: 20px; }
  .meta { color: #6b7280; margin-bottom: 20px; font-size: 14px; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { border: 1px solid #d7dbe6; padding: 8px 12px; text-align: left; }
  th { background: #eef1f9; }
  tr:nth-child(even) td { background: #f8f9fc; }
  @media print {
    body { margin: 0; }
  }
</style>
</head>
<body>
  <h1>Notas — ${escapar(titulo)}</h1>
  <p class="meta">${dados.turma.serie} · Ano letivo ${dados.turma.anoLetivo} · Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  <table>
    <thead><tr>${ths}</tr></thead>
    <tbody>
${trs}
    </tbody>
  </table>
</body>
</html>`

  return { html, titulo }
}

export function exportarHTML(dados: DadosTurma): void {
  const { html, titulo } = montarHTML(dados)
  baixarArquivo(html, `notas-${normalizar(titulo)}.html`, 'text/html')
}

// Abre um HTML numa nova aba e aciona a impressão do navegador, onde o
// usuário escolhe "Salvar como PDF" — sem depender de biblioteca externa.
export function imprimirHTML(html: string): void {
  const janela = window.open('', '_blank')
  if (!janela) return

  janela.document.open()
  janela.document.write(html)
  janela.document.close()

  janela.onload = () => {
    janela.focus()
    janela.print()
  }
}

export function exportarPDF(dados: DadosTurma): void {
  const { html } = montarHTML(dados)
  imprimirHTML(html)
}

// Monta uma matriz (linhas x colunas) com cabeçalho, alunos e % de presença
function montarMatrizFrequencia({ turma, alunos, datasAula, frequencia }: DadosFrequencia) {
  const cabecalho = ['Aluno', ...datasAula.map((d) => formatarData(d.data)), 'Presença']

  const linhas = alunos.map((aluno) => {
    const resumo = calcularFrequencia(aluno.id, datasAula, frequencia)
    return [
      aluno.nome,
      ...datasAula.map((d) => {
        const v = frequencia[chavePresenca(aluno.id, d.id)]
        return v === true ? 'P' : v === false ? 'F' : ''
      }),
      resumo.percentual == null ? '' : `${resumo.percentual}%`,
    ]
  })

  return { cabecalho, linhas, titulo: turma.nome }
}

export function exportarFrequenciaExcel(dados: DadosFrequencia): void {
  const { cabecalho, linhas } = montarMatrizFrequencia(dados)
  const aoa = [cabecalho, ...linhas]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  ws['!cols'] = cabecalho.map((c, i) => ({
    wch: i === 0 ? 26 : Math.max(c.length + 2, 8),
  }))

  const wb = XLSX.utils.book_new()
  const nomeAba = dados.turma.nome.slice(0, 28) || 'Turma'
  XLSX.utils.book_append_sheet(wb, ws, nomeAba)
  XLSX.writeFile(wb, `frequencia-${normalizar(dados.turma.nome)}.xlsx`)
}

function montarHTMLFrequencia(dados: DadosFrequencia): string {
  const { cabecalho, linhas, titulo } = montarMatrizFrequencia(dados)

  const ths = cabecalho.map((c) => `<th>${escapar(c)}</th>`).join('')
  const trs = linhas
    .map((linha) => {
      const tds = linha.map((cel) => `<td>${escapar(String(cel))}</td>`).join('')
      return `<tr>${tds}</tr>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Frequência — ${escapar(titulo)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2433; margin: 32px; }
  h1 { font-size: 20px; }
  .meta { color: #6b7280; margin-bottom: 20px; font-size: 14px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { border: 1px solid #d7dbe6; padding: 6px 10px; text-align: center; }
  th:first-child, td:first-child { text-align: left; }
  th { background: #eef1f9; }
  tr:nth-child(even) td { background: #f8f9fc; }
  @media print {
    body { margin: 0; }
  }
</style>
</head>
<body>
  <h1>Frequência — ${escapar(titulo)}</h1>
  <p class="meta">${dados.turma.serie} · Ano letivo ${dados.turma.anoLetivo} · Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  <table>
    <thead><tr>${ths}</tr></thead>
    <tbody>
${trs}
    </tbody>
  </table>
</body>
</html>`
}

export function exportarFrequenciaPDF(dados: DadosFrequencia): void {
  imprimirHTML(montarHTMLFrequencia(dados))
}

function baixarArquivo(conteudo: string, nome: string, tipo: string) {
  const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '')
}

export function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
