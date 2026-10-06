import type { Evento } from '@prisma/client'
import type { MensagemPush } from '../../lib/push'
import { prisma } from '../../lib/prisma'
import { amanhaNoBrasil, hojeNoBrasil, paraDataISO } from '../../utils/serializers'
import { avisarProfessor } from '../notificacoes/notificacoes.service'

const ROTULO_TIPO: Record<string, string> = {
  prova: 'Prova',
  trabalho: 'Trabalho',
  reuniao: 'Reunião',
  outro: 'Compromisso',
}

type Quando = { data: string; hora: string | null }
type EventoAviso = Quando & { id: string; titulo: string; tipo: string; concluido: boolean }

function descreverDia(data: string, hoje: string, amanha: string): string {
  if (data === hoje) return 'hoje'
  if (data === amanha) return 'amanhã'
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

function descreverQuando(q: Quando, hoje: string, amanha: string): string {
  const dia = descreverDia(q.data, hoje, amanha)
  return q.hora ? `${dia} às ${q.hora}` : dia
}

// O resumo das 7h só "vê" a agenda daquela hora — isso cobre o que muda
// depois: compromisso novo ou remarcado (data/hora) que cai hoje ou amanhã,
// ou que saiu de hoje/amanhã pra outro dia. Editar título, conteúdo, ata
// etc. não avisa, pra não virar barulho. `antes` null = evento recém-criado.
export function montarAvisoMudanca(
  antes: Quando | null,
  depois: EventoAviso,
  turmaNome: string | null,
  hoje: string,
  amanha: string,
): MensagemPush | null {
  if (depois.concluido) return null
  const proximo = (data: string) => data === hoje || data === amanha
  const rotulo = `${ROTULO_TIPO[depois.tipo] ?? 'Compromisso'} — ${depois.titulo}`
  const turma = turmaNome ? ` · ${turmaNome}` : ''
  const base = { url: '/agenda', tag: `evento-${depois.id}` }

  if (!antes) {
    if (!proximo(depois.data)) return null
    return {
      ...base,
      titulo: `Novo compromisso ${descreverDia(depois.data, hoje, amanha)}: ${rotulo}`,
      corpo: `${descreverQuando(depois, hoje, amanha)}${turma}`,
    }
  }

  const mudou = antes.data !== depois.data || antes.hora !== depois.hora
  if (!mudou || (!proximo(antes.data) && !proximo(depois.data))) return null
  return {
    ...base,
    titulo: `Remarcado: ${rotulo}`,
    corpo: `Agora: ${descreverQuando(depois, hoje, amanha)}${turma} (antes: ${descreverQuando(antes, hoje, amanha)})`,
  }
}

function quandoDe(evento: Evento): Quando {
  return { data: paraDataISO(evento.data)!, hora: evento.hora }
}

// Chamado depois de salvar, sem travar a resposta da API — se o push
// falhar, o evento já está salvo e só o aviso se perde (fica no log).
export function avisarMudancaEvento(antes: Evento | null, depois: Evento) {
  void (async () => {
    const hoje = hojeNoBrasil()
    const amanha = amanhaNoBrasil()
    const evento = { ...quandoDe(depois), id: depois.id, titulo: depois.titulo, tipo: depois.tipo, concluido: depois.concluido }
    const quandoAntes = antes && quandoDe(antes)

    // Só busca o nome da turma quando vai mesmo avisar
    if (!montarAvisoMudanca(quandoAntes, evento, null, hoje, amanha)) return
    const turma = depois.turmaId
      ? await prisma.turma.findUnique({ where: { id: depois.turmaId }, select: { nome: true } })
      : null
    const mensagem = montarAvisoMudanca(quandoAntes, evento, turma?.nome ?? null, hoje, amanha)!
    await avisarProfessor(depois.professorId, mensagem)
  })().catch((erro) => console.error('[push] Falha ao avisar mudança de evento:', erro))
}
