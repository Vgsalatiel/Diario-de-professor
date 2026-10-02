// Toda entidade "de baixo" (aluno, avaliação, evento, data de aula...)
// pertence a uma turma, e cada turma é de um único professor (ligado a ela
// por TurmaProfessor). Essas funções garantem que o professor
// logado só acessa o que é dele — devolvem a linha encontrada, ou lançam
// 404 (propositalmente não é 403: não revelamos se o registro existe e é
// de outro professor).
import { prisma } from '../lib/prisma'
import { AppError } from './AppError'

// Turma/aluno excluídos (soft delete) contam como "não encontrados" pra
// qualquer operação — igual seriam se tivessem sido apagados de verdade.
export async function turmaAtribuidaAoProfessor(turmaId: string, professorId: string) {
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    include: { professores: { where: { professorId } } },
  })
  if (!turma || turma.professores.length === 0 || turma.excluidoEm) {
    throw AppError.naoEncontrado('Turma')
  }
  return turma
}

export async function alunoDoProfessor(alunoId: string, professorId: string) {
  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    include: { turma: { include: { professores: { where: { professorId } } } } },
  })
  if (
    !aluno ||
    aluno.turma.professores.length === 0 ||
    aluno.excluidoEm ||
    aluno.turma.excluidoEm
  ) {
    throw AppError.naoEncontrado('Aluno')
  }
  return aluno
}

// Filtro de listagem equivalente: turma não excluída em que o professor
// continua atribuído.
export function turmaDoProfessor(professorId: string) {
  return { excluidoEm: null, professores: { some: { professorId } } }
}

// Turma ainda ativa e com esse professor atribuído. Usado pelos registros
// que guardam o próprio professorId (avaliação, data de aula, plano...):
// ter criado o registro não basta, quem não está mais ligado à turma
// perde o acesso a ela (os dados ficam e voltam se ele for ligado de novo).
function incluirAtribuicao(professorId: string) {
  return { turma: { include: { professores: { where: { professorId } } } } }
}

function turmaAtiva(turma: { excluidoEm: Date | null; professores: unknown[] }) {
  return !turma.excluidoEm && turma.professores.length > 0
}

export async function avaliacaoDoProfessor(avaliacaoId: string, professorId: string) {
  const avaliacao = await prisma.avaliacao.findUnique({
    where: { id: avaliacaoId },
    include: incluirAtribuicao(professorId),
  })
  if (
    !avaliacao ||
    avaliacao.professorId !== professorId ||
    !turmaAtiva(avaliacao.turma)
  ) {
    throw AppError.naoEncontrado('Avaliação')
  }
  return avaliacao
}

export async function dataAulaDoProfessor(dataAulaId: string, professorId: string) {
  const dataAula = await prisma.dataAula.findUnique({
    where: { id: dataAulaId },
    include: incluirAtribuicao(professorId),
  })
  if (
    !dataAula ||
    dataAula.professorId !== professorId ||
    !turmaAtiva(dataAula.turma)
  ) {
    throw AppError.naoEncontrado('Data de aula')
  }
  return dataAula
}

export async function registroAulaDoProfessor(registroId: string, professorId: string) {
  const registro = await prisma.registroAula.findUnique({
    where: { id: registroId },
    include: incluirAtribuicao(professorId),
  })
  if (
    !registro ||
    registro.professorId !== professorId ||
    !turmaAtiva(registro.turma)
  ) {
    throw AppError.naoEncontrado('Registro de aula')
  }
  return registro
}

// Evento pessoal (sem turma) só exige ser do professor; evento de turma
// exige também que ele continue atribuído a ela.
export async function eventoDoProfessor(eventoId: string, professorId: string) {
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    include: incluirAtribuicao(professorId),
  })
  if (!evento || evento.professorId !== professorId || (evento.turma && !turmaAtiva(evento.turma))) {
    throw AppError.naoEncontrado('Evento')
  }
  return evento
}

export async function planoDoProfessor(planoId: string, professorId: string) {
  const plano = await prisma.planoDeAula.findUnique({
    where: { id: planoId },
    include: incluirAtribuicao(professorId),
  })
  if (!plano || plano.professorId !== professorId || !turmaAtiva(plano.turma)) {
    throw AppError.naoEncontrado('Plano de aula')
  }
  return plano
}

export async function configDoProfessor(configId: string, professorId: string) {
  const config = await prisma.configCalculo.findUnique({
    where: { id: configId },
    include: incluirAtribuicao(professorId),
  })
  if (!config || config.professorId !== professorId || !turmaAtiva(config.turma)) {
    throw AppError.naoEncontrado('Configuração de cálculo')
  }
  return config
}
