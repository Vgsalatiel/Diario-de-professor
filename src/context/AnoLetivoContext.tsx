import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const CHAVE = 'diario:anoLetivo'

function anoAtualDoCalendario(): string {
  return String(new Date().getFullYear())
}

interface AnoLetivoContextValue {
  anoAtivo: string
  anoAtual: string
  // Anos anteriores ao atual ficam em modo só-leitura — evita editar
  // sem querer dados de um ano letivo que já encerrou.
  somenteLeitura: boolean
  definirAnoAtivo: (ano: string) => void
}

const AnoLetivoContext = createContext<AnoLetivoContextValue | null>(null)

export function AnoLetivoProvider({ children }: { children: ReactNode }) {
  const anoAtual = anoAtualDoCalendario()
  const [anoAtivo, setAnoAtivo] = useState<string>(() => {
    try {
      return localStorage.getItem(CHAVE) || anoAtual
    } catch {
      return anoAtual
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, anoAtivo)
    } catch {
      // armazenamento indisponível — só não persiste entre sessões
    }
  }, [anoAtivo])

  const value: AnoLetivoContextValue = {
    anoAtivo,
    anoAtual,
    somenteLeitura: anoAtivo !== anoAtual,
    definirAnoAtivo: setAnoAtivo,
  }

  return <AnoLetivoContext.Provider value={value}>{children}</AnoLetivoContext.Provider>
}

export function useAnoLetivo(): AnoLetivoContextValue {
  const ctx = useContext(AnoLetivoContext)
  if (!ctx) throw new Error('useAnoLetivo deve ser usado dentro de <AnoLetivoProvider>')
  return ctx
}
