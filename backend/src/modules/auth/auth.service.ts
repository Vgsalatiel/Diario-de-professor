import { randomBytes, createHash } from 'node:crypto'
import type { Professor } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { hashSenha, compararSenha } from '../../lib/hash'
import { gerarToken } from '../../lib/jwt'
import { enviarEmailRedefinicaoSenha, enviarEmailVerificacao } from '../../lib/email'
import { AppError } from '../../utils/AppError'
import type {
  AtualizarPerfilDto,
  CadastroDto,
  EsqueciSenhaDto,
  LoginDto,
  RedefinirSenhaDto,
  VerificarEmailDto,
} from './auth.dto'

const VALIDADE_RESET_MS = 60 * 60 * 1000 // 1 hora
const VALIDADE_VERIFICACAO_MS = 24 * 60 * 60 * 1000 // 24 horas

function baseUrlFrontend(): string {
  return (process.env.FRONTEND_URL ?? 'http://localhost:5173').split(',')[0].trim()
}

async function dispararVerificacao(professorId: string, email: string) {
  const token = randomBytes(32).toString('hex')
  await prisma.professor.update({
    where: { id: professorId },
    data: {
      verificacaoTokenHash: hashToken(token),
      verificacaoExpiraEm: new Date(Date.now() + VALIDADE_VERIFICACAO_MS),
    },
  })
  const link = `${baseUrlFrontend()}/verificar-email?token=${token}`
  await enviarEmailVerificacao(email, link)
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Nunca devolver o hash da senha pro frontend.
function semSenha(professor: Professor) {
  const { senha: _senha, ...resto } = professor
  return resto
}

export async function cadastrar(dados: CadastroDto) {
  const existente = await prisma.professor.findUnique({ where: { email: dados.email } })
  if (existente) throw AppError.conflito('Já existe um professor com esse e-mail.')

  const senhaHash = await hashSenha(dados.senha)
  const professor = await prisma.professor.create({
    data: {
      nome: dados.nome,
      email: dados.email,
      senha: senhaHash,
      materia: dados.materia,
      fotoUrl: dados.fotoUrl,
    },
  })

  // Não trava o cadastro se o envio falhar — o professor pode pedir reenvio depois.
  await dispararVerificacao(professor.id, professor.email).catch(() => {})

  return { token: gerarToken({ professorId: professor.id }), professor: semSenha(professor) }
}

export async function login(dados: LoginDto) {
  const professor = await prisma.professor.findUnique({ where: { email: dados.email } })
  const senhaOk = professor ? await compararSenha(dados.senha, professor.senha) : false

  if (!professor || !senhaOk) {
    throw AppError.naoAutorizado('E-mail ou senha incorretos.')
  }

  return { token: gerarToken({ professorId: professor.id }), professor: semSenha(professor) }
}

export async function esqueciSenha(dados: EsqueciSenhaDto) {
  const professor = await prisma.professor.findUnique({ where: { email: dados.email } })

  // Sempre responde "sucesso" mesmo se o e-mail não existir — senão dá
  // pra descobrir quais e-mails estão cadastrados só tentando aqui.
  if (!professor) return

  const token = randomBytes(32).toString('hex')
  await prisma.professor.update({
    where: { id: professor.id },
    data: {
      resetSenhaTokenHash: hashToken(token),
      resetSenhaExpiraEm: new Date(Date.now() + VALIDADE_RESET_MS),
    },
  })

  const link = `${baseUrlFrontend()}/redefinir-senha?token=${token}`
  await enviarEmailRedefinicaoSenha(professor.email, link)
}

export async function redefinirSenha(dados: RedefinirSenhaDto) {
  const tokenHash = hashToken(dados.token)
  const professor = await prisma.professor.findFirst({ where: { resetSenhaTokenHash: tokenHash } })

  if (!professor || !professor.resetSenhaExpiraEm || professor.resetSenhaExpiraEm < new Date()) {
    throw AppError.requisicaoInvalida('Link inválido ou expirado. Peça uma nova redefinição.')
  }

  const senhaHash = await hashSenha(dados.novaSenha)
  await prisma.professor.update({
    where: { id: professor.id },
    data: { senha: senhaHash, resetSenhaTokenHash: null, resetSenhaExpiraEm: null },
  })
}

export async function verificarEmail(dados: VerificarEmailDto) {
  const tokenHash = hashToken(dados.token)
  const professor = await prisma.professor.findFirst({ where: { verificacaoTokenHash: tokenHash } })

  if (!professor || !professor.verificacaoExpiraEm || professor.verificacaoExpiraEm < new Date()) {
    throw AppError.requisicaoInvalida('Link inválido ou expirado. Peça um novo e-mail de confirmação.')
  }

  await prisma.professor.update({
    where: { id: professor.id },
    data: { emailVerificado: true, verificacaoTokenHash: null, verificacaoExpiraEm: null },
  })
}

export async function reenviarVerificacao(professorId: string) {
  const professor = await prisma.professor.findUnique({ where: { id: professorId } })
  if (!professor) throw AppError.naoEncontrado('Professor')
  if (professor.emailVerificado) return // nada a fazer, já confirmado

  await dispararVerificacao(professor.id, professor.email)
}

export async function buscarPerfil(professorId: string) {
  const professor = await prisma.professor.findUnique({ where: { id: professorId } })
  if (!professor) throw AppError.naoEncontrado('Professor')
  return semSenha(professor)
}

export async function atualizarPerfil(professorId: string, dados: AtualizarPerfilDto) {
  const atual = await prisma.professor.findUnique({ where: { id: professorId } })
  if (!atual) throw AppError.naoEncontrado('Professor')

  if (dados.email) {
    const emEmUso = await prisma.professor.findUnique({ where: { email: dados.email } })
    if (emEmUso && emEmUso.id !== professorId) {
      throw AppError.conflito('Já existe um professor com esse e-mail.')
    }
  }

  // Trocou de e-mail? Precisa confirmar de novo — senão o novo endereço
  // fica marcado como "verificado" sem nunca ter provado que é dele.
  const trocouEmail = dados.email != null && dados.email !== atual.email

  const senha = dados.senha ? await hashSenha(dados.senha) : undefined
  const professor = await prisma.professor.update({
    where: { id: professorId },
    data: { ...dados, senha, emailVerificado: trocouEmail ? false : undefined },
  })

  if (trocouEmail) await dispararVerificacao(professor.id, professor.email).catch(() => {})

  return semSenha(professor)
}
