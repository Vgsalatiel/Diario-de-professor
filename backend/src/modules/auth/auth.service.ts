import { randomBytes, createHash } from 'node:crypto'
import type { Professor } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { hashSenha, compararSenha } from '../../lib/hash'
import { gerarToken } from '../../lib/jwt'
import { enviarEmailRedefinicaoSenha } from '../../lib/email'
import { AppError } from '../../utils/AppError'
import type {
  AtualizarPerfilDto,
  CadastroDto,
  EsqueciSenhaDto,
  LoginDto,
  RedefinirSenhaDto,
} from './auth.dto'

const VALIDADE_RESET_MS = 60 * 60 * 1000 // 1 hora

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

  const baseUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173').split(',')[0].trim()
  const link = `${baseUrl}/redefinir-senha?token=${token}`
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

export async function buscarPerfil(professorId: string) {
  const professor = await prisma.professor.findUnique({ where: { id: professorId } })
  if (!professor) throw AppError.naoEncontrado('Professor')
  return semSenha(professor)
}

export async function atualizarPerfil(professorId: string, dados: AtualizarPerfilDto) {
  if (dados.email) {
    const emEmUso = await prisma.professor.findUnique({ where: { email: dados.email } })
    if (emEmUso && emEmUso.id !== professorId) {
      throw AppError.conflito('Já existe um professor com esse e-mail.')
    }
  }

  const senha = dados.senha ? await hashSenha(dados.senha) : undefined
  const professor = await prisma.professor.update({
    where: { id: professorId },
    data: { ...dados, senha },
  })
  return semSenha(professor)
}
