import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'gestao-notas:'

export function lerStorage<T>(chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(PREFIX + chave)
    if (bruto == null) return padrao
    return JSON.parse(bruto) as T
  } catch {
    return padrao
  }
}

export function gravarStorage<T>(chave: string, valor: T): void {
  try {
    localStorage.setItem(PREFIX + chave, JSON.stringify(valor))
  } catch {
    // armazenamento cheio ou indisponível — ignora silenciosamente
  }
}

// Estado que se mantém salvo no navegador entre sessões.
// Se a chave mudar (ex.: trocou de professor logado), relê o valor
// correspondente do armazenamento em vez de continuar com o antigo em memória.
export function usePersistedState<T>(
  chave: string,
  padrao: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [chaveAtual, setChaveAtual] = useState(chave)
  const [valor, setValor] = useState<T>(() => lerStorage(chave, padrao))

  if (chave !== chaveAtual) {
    setChaveAtual(chave)
    setValor(lerStorage(chave, padrao))
  }

  useEffect(() => {
    gravarStorage(chave, valor)
  }, [chave, valor])

  return [valor, setValor]
}

// Gera identificadores curtos e únicos o suficiente para uso local
export function useIdGenerator() {
  return useCallback(() => {
    return (
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    )
  }, [])
}

export function novoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
