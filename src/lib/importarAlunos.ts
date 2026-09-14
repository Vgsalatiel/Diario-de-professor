import * as XLSX from 'xlsx'
import type { SituacaoMatricula } from '../types'

export interface AlunoImportado {
  nome: string
  email?: string
  telefonePais?: string
  matricula?: string
  dataNascimento?: string
  situacao?: SituacaoMatricula
}

type CampoColuna = keyof Omit<AlunoImportado, 'nome'> | 'nome'

// Cada palavra é procurada como um pedaço do texto do cabeçalho — assim
// "Nome do Aluno", "Nº de Matrícula" ou "Data de Nascimento do Aluno"
// também são reconhecidos, não só o nome exato da coluna.
const COLUNAS: { campo: CampoColuna; palavras: string[] }[] = [
  { campo: 'nome', palavras: ['nome', 'estudante', 'name'] },
  { campo: 'matricula', palavras: ['matricula', 'registro academico'] },
  { campo: 'dataNascimento', palavras: ['nascimento', 'data nasc', 'dt nasc'] },
  { campo: 'situacao', palavras: ['situacao', 'status'] },
  { campo: 'email', palavras: ['email', 'e-mail', 'mail'] },
  {
    campo: 'telefonePais',
    palavras: ['telefone', 'celular', 'contato', 'fone', 'whatsapp'],
  },
]

function celulaTexto(linha: unknown[] | undefined, indice: number | undefined): string {
  if (indice == null || !linha) return ''
  return String(linha[indice] ?? '').trim()
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

function detectarColunas(cabecalho: unknown[]): Partial<Record<CampoColuna, number>> | null {
  const mapa: Partial<Record<CampoColuna, number>> = {}

  cabecalho.forEach((celula, indice) => {
    const valor = normalizar(String(celula ?? ''))
    if (!valor) return

    // Entre todas as palavras-chave que aparecem dentro do cabeçalho,
    // fica com a mais longa (mais específica) — evita, por exemplo, que
    // "Situação da Matrícula" seja lido como coluna de matrícula.
    let melhorCampo: CampoColuna | null = null
    let melhorTamanho = 0
    for (const coluna of COLUNAS) {
      for (const palavra of coluna.palavras) {
        const p = normalizar(palavra)
        if (p.length > melhorTamanho && valor.includes(p)) {
          melhorCampo = coluna.campo
          melhorTamanho = p.length
        }
      }
    }
    if (melhorCampo && mapa[melhorCampo] === undefined) {
      mapa[melhorCampo] = indice
    }
  })

  // só considera "tem cabeçalho" se pelo menos a coluna de nome foi reconhecida
  return mapa.nome !== undefined ? mapa : null
}

// Converte o valor da célula de nascimento (Date do Excel, ou texto
// "DD/MM/AAAA"/"AAAA-MM-DD") para ISO "AAAA-MM-DD". Vazio se não entender.
function paraDataISO(linha: unknown[] | undefined, indice: number | undefined): string {
  if (indice == null || !linha) return ''
  const bruto = linha[indice]

  if (bruto instanceof Date) {
    const ano = bruto.getFullYear()
    const mes = String(bruto.getMonth() + 1).padStart(2, '0')
    const dia = String(bruto.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  const texto = String(bruto ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto

  const porBarra = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (porBarra) {
    const [, dia, mes, ano] = porBarra
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  return ''
}

const SITUACOES_INATIVO = ['inativo', 'inativa', 'trancado', 'trancada', 'desistente']
const SITUACOES_TRANSFERIDO = ['transferido', 'transferida']

function paraSituacao(linha: unknown[] | undefined, indice: number | undefined): SituacaoMatricula | undefined {
  const texto = normalizar(celulaTexto(linha, indice))
  if (!texto) return undefined
  if (SITUACOES_INATIVO.includes(texto)) return 'inativo'
  if (SITUACOES_TRANSFERIDO.includes(texto)) return 'transferido'
  return 'ativo'
}

// Lê a planilha (primeira aba) e devolve os alunos encontrados.
// Se a primeira linha tiver um cabeçalho reconhecível (Nome, Matrícula,
// Data de nascimento, Situação, E-mail, Telefone), usa as colunas certas;
// caso contrário, assume que a única coluna preenchida é o nome.
export async function lerAlunosDaPlanilha(file: File): Promise<AlunoImportado[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const primeiraAba = workbook.SheetNames[0]
  if (!primeiraAba) return []

  const planilha = workbook.Sheets[primeiraAba]
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(planilha, { header: 1 })
  if (linhas.length === 0) return []

  const mapaColunas = detectarColunas(linhas[0] ?? [])
  const linhasDeDados = mapaColunas ? linhas.slice(1) : linhas
  const idxNome = mapaColunas?.nome ?? 0

  const vistos = new Set<string>()
  const alunos: AlunoImportado[] = []

  for (const linha of linhasDeDados) {
    const nome = celulaTexto(linha, idxNome)
    if (!nome || vistos.has(nome)) continue
    vistos.add(nome)

    const aluno: AlunoImportado = { nome }
    if (mapaColunas) {
      const email = celulaTexto(linha, mapaColunas.email)
      const telefonePais = celulaTexto(linha, mapaColunas.telefonePais)
      const matricula = celulaTexto(linha, mapaColunas.matricula)
      const dataNascimento = paraDataISO(linha, mapaColunas.dataNascimento)
      const situacao = paraSituacao(linha, mapaColunas.situacao)
      if (email) aluno.email = email
      if (telefonePais) aluno.telefonePais = telefonePais
      if (matricula) aluno.matricula = matricula
      if (dataNascimento) aluno.dataNascimento = dataNascimento
      if (situacao) aluno.situacao = situacao
    }
    alunos.push(aluno)
  }

  return alunos
}
