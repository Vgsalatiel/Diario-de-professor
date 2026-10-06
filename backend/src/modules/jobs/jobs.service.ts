import { prisma } from '../../lib/prisma'
import { enviarAvisoDiario, type ItemAvisoDiario } from '../../lib/email'
import { enviarPush, type MensagemPush } from '../../lib/push'
import { hojeNoBrasil } from '../../utils/serializers'

const ROTULO_TIPO: Record<string, string> = {
  prova: 'Prova',
  trabalho: 'Trabalho',
  reuniao: 'Reunião',
  outro: 'Outro',
}

// Texto da notificação no celular — curto, porque o sistema corta o que
// passa de umas poucas linhas. Um compromisso só vai direto no título.
export function montarMensagemAviso(itens: ItemAvisoDiario[]): MensagemPush {
  const linha = (i: ItemAvisoDiario) =>
    [i.hora, i.titulo, i.turmaNome ? `(${i.turmaNome})` : null].filter(Boolean).join(' ')

  if (itens.length === 1) {
    const [item] = itens
    const detalhes = [item.hora ? `às ${item.hora}` : null, item.turmaNome].filter(Boolean).join(' · ')
    return {
      titulo: `Hoje: ${item.tipoRotulo} — ${item.titulo}`,
      corpo: detalhes || 'Confira na sua agenda.',
      url: '/agenda',
    }
  }
  return {
    titulo: `Hoje você tem ${itens.length} compromissos`,
    corpo: itens.map(linha).join('\n'),
    url: '/agenda',
  }
}

// Roda uma vez por dia (chamado pelo cron do GitHub Actions) — avisa cada
// professor dos compromissos de hoje (prova, trabalho, reunião, outro) por
// e-mail e por notificação nos aparelhos onde ele ativou, pulando os já
// marcados como concluídos e quem não tem nada marcado pra hoje.
export async function enviarAvisosDoDia() {
  const hoje = hojeNoBrasil()

  const eventos = await prisma.evento.findMany({
    where: { data: new Date(`${hoje}T00:00:00.000Z`), concluido: false },
    include: { professor: { include: { inscricoesPush: true } }, turma: true },
    orderBy: [{ hora: 'asc' }],
  })

  type Grupo = {
    email: string
    inscricoes: typeof eventos[number]['professor']['inscricoesPush']
    itens: ItemAvisoDiario[]
  }
  const porProfessor = new Map<string, Grupo>()
  for (const evento of eventos) {
    const grupo = porProfessor.get(evento.professorId) ?? {
      email: evento.professor.email,
      inscricoes: evento.professor.inscricoesPush,
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

  let notificacoesEnviadas = 0
  const expiradas: string[] = []
  for (const { email, inscricoes, itens } of porProfessor.values()) {
    await enviarAvisoDiario(email, itens)

    const mensagem = montarMensagemAviso(itens)
    for (const inscricao of inscricoes) {
      const resultado = await enviarPush(inscricao, mensagem)
      if (resultado === 'ok') notificacoesEnviadas++
      if (resultado === 'expirada') expiradas.push(inscricao.id)
    }
  }

  if (expiradas.length > 0) {
    await prisma.inscricaoPush.deleteMany({ where: { id: { in: expiradas } } })
  }

  return {
    data: hoje,
    professoresAvisados: porProfessor.size,
    totalEventos: eventos.length,
    notificacoesEnviadas,
    inscricoesExpiradasRemovidas: expiradas.length,
  }
}
