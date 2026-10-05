import { lazy, type ComponentType } from 'react'

const CHAVE_RECARGA = 'diario:recarregou-por-chunk'

// Carrega um pedaço do app sob demanda. Depois de um deploy, quem estava com
// o app aberto pode pedir um pedaço que não existe mais (os nomes mudam a
// cada build) — nesse caso recarrega a página uma vez pra pegar a versão nova.
export function importarComRecarga<T>(carregar: () => Promise<T>): Promise<T> {
  return carregar()
    .then((modulo) => {
      try {
        sessionStorage.removeItem(CHAVE_RECARGA)
      } catch {
        // armazenamento indisponível
      }
      return modulo
    })
    .catch((erro) => {
      let jaRecarregou = true
      try {
        jaRecarregou = sessionStorage.getItem(CHAVE_RECARGA) === '1'
        if (!jaRecarregou) sessionStorage.setItem(CHAVE_RECARGA, '1')
      } catch {
        // sem armazenamento, não arrisca ficar recarregando em loop
      }
      if (!jaRecarregou) window.location.reload()
      throw erro
    })
}

// React.lazy pra componentes exportados com nome (export function Turmas).
export function lazyNomeado<M, K extends keyof M>(carregar: () => Promise<M>, nome: K) {
  return lazy(() =>
    importarComRecarga(carregar).then((m) => ({ default: m[nome] as unknown as ComponentType<any> })),
  )
}
