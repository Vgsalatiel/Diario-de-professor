import type { Professor } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { hashSenha, compararSenha } from '../../lib/hash'
import { gerarToken } from '../../lib/jwt'
import { AppError } from '../../utils/AppError'
import type { AtualizarPerfilDto, CadastroDto, LoginDto } from './auth.dto'

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
