import { prisma } from '../../lib/prisma'
import { enviarAvisoDiario, type ItemAvisoDiario } from '../../lib/email'
import type { MensagemPush } from '../../lib/push'
import { hojeNoBrasil, paraDataISO } from '../../utils/serializers'
import { enviarParaInscricoes } from '../notificacoes/notificacoes.service'

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
      tag: 'aviso-diario',
    }
  }
  return {
    titulo: `Hoje você tem ${itens.length} compromissos`,
    corpo: itens.map(linha).join('\n'),
    url: '/agenda',
    tag: 'aviso-diario',
  }
}

// Evento que entra no aviso por causa do prazo de entrega (trabalho
// passado num dia, entregue em outro) aparece como "Prazo de entrega", sem
// hora — a hora salva é a do dia em que a atividade foi passada.
export function itemDoAviso(
  evento: { titulo: string; tipo: string; data: Date; hora: string | null },
  turmaNome: string | null,
  hoje: string,
): ItemAvisoDiario {
  const ehDoDia = paraDataISO(evento.data) === hoje
  return {
    titulo: evento.titulo,
    tipoRotulo: ehDoDia ? (ROTULO_TIPO[evento.tipo] ?? evento.tipo) : 'Prazo de entrega',
    hora: ehDoDia ? evento.hora : null,
    turmaNome,
  }
}

// Roda uma vez por dia (chamado pelo cron do GitHub Actions) — avisa cada
// professor dos compromissos de hoje (prova, trabalho, reunião, outro) e
// das entregas que vencem hoje, por e-mail e por notificação nos aparelhos
// onde ele ativou, pulando os já marcados como concluídos e quem não tem
// nada pra hoje.
export async function enviarAvisosDoDia() {
  const hoje = hojeNoBrasil()

  const eventos = await prisma.evento.findMany({
    where: {
      concluido: false,
      OR: [{ data: new Date(`${hoje}T00:00:00.000Z`) }, { prazo: new Date(`${hoje}T00:00:00.000Z`) }],
    },
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
    grupo.itens.push(itemDoAviso(evento, evento.turma?.nome ?? null, hoje))
    porProfessor.set(evento.professorId, grupo)
  }

  let notificacoesEnviadas = 0
  let expiradas = 0
  for (const { email, inscricoes, itens } of porProfessor.values()) {
    await enviarAvisoDiario(email, itens)

    const envio = await enviarParaInscricoes(inscricoes, montarMensagemAviso(itens))
    notificacoesEnviadas += envio.enviadas
    expiradas += envio.expiradas
  }

  return {
    data: hoje,
    professoresAvisados: porProfessor.size,
    totalEventos: eventos.length,
    notificacoesEnviadas,
    inscricoesExpiradasRemovidas: expiradas,
  }
}
