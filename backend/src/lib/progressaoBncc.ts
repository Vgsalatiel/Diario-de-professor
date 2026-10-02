import type { EtapaBncc } from '@prisma/client'

// Etapa/ano BNCC da turma no ano letivo seguinte (usado ao promover):
// Fundamental 1º–8º avança um ano, 9º vira 1º do Médio, Médio 1º–2º
// avança e 3º fica sem ano (não há seguinte). Sem etapa/ano, não inventa.
export function proximaEtapaBncc(
  etapa: EtapaBncc | null,
  ano: number | null,
): { etapaBncc: EtapaBncc | null; anoSerieBncc: number | null } {
  if (!etapa || ano == null) return { etapaBncc: etapa, anoSerieBncc: null }
  if (etapa === 'fundamental') {
    return ano >= 9 ? { etapaBncc: 'medio', anoSerieBncc: 1 } : { etapaBncc: 'fundamental', anoSerieBncc: ano + 1 }
  }
  return ano >= 3 ? { etapaBncc: 'medio', anoSerieBncc: null } : { etapaBncc: 'medio', anoSerieBncc: ano + 1 }
}
