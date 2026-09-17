import { prisma } from '../../lib/prisma'
import { enviarAvisoDiario, type ItemAvisoDiario } from '../../lib/email'
import { hojeNoBrasil } from '../../utils/serializers'

const ROTULO_TIPO: Record<string, string> = {
  prova: 'Prova',
  trabalho: 'Trabalho',
  reuniao: 'Reunião',
  outro: 'Outro',
}

// Roda uma vez por dia (chamado pelo cron do GitHub Actions) — manda um
// e-mail por professor com os compromissos de hoje (prova, trabalho,
// reunião, outro), pulando os já marcados como concluídos e quem não
// tem nada marcado pra hoje.
export async function enviarAvisosDoDia() {
  const hoje = hojeNoBrasil()

  const eventos = await prisma.evento.findMany({
    where: { data: new Date(`${hoje}T00:00:00.000Z`), concluido: false },
    include: { professor: true, turma: true },
    orderBy: [{ hora: 'asc' }],
  })

  const porProfessor = new Map<string, { email: string; itens: ItemAvisoDiario[] }>()
  for (const evento of eventos) {
    const grupo = porProfessor.get(evento.professorId) ?? {
      email: evento.professor.email,
      itens: [],
    }
    grupo.itens.push({
      titulo: evento.titulo,
      tipoRotulo: ROTULO_TIPO[evento.tipo] ?? evento.tipo,
      hora: evento.hora,
      turmaNome: evento.turma?.nome ?? null,
    })
    porProfessor.set(evento.professorId, grupo)
  }

  for (const { email, itens } of porProfessor.values()) {
    await enviarAvisoDiario(email, itens)
  }

  return { data: hoje, professoresAvisados: porProfessor.size, totalEventos: eventos.length }
}
