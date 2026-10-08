import { useEffect, useRef } from 'react'

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

// Comportamento de janela (Modal/Drawer) pra quem usa teclado ou leitor de
// tela: ao abrir, o foco entra na janela (o leitor anuncia o título); Tab fica
// circulando dentro dela; Esc fecha; ao fechar, o foco volta pro botão que abriu.
// Foca a janela, não o primeiro campo, pra não abrir o teclado do celular sozinho.
export function useDialogo<T extends HTMLElement>(aberto: boolean, onFechar: () => void) {
  const ref = useRef<T>(null)
  const onFecharRef = useRef(onFechar)
  onFecharRef.current = onFechar

  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    const caixa = ref.current
    caixa?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onFecharRef.current()
        return
      }
      if (e.key !== 'Tab' || !caixa) return
      const itens = Array.from(caixa.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (el) => el.offsetParent !== null,
      )
      if (itens.length === 0) {
        e.preventDefault()
        return
      }
      const ini = itens[0]
      const fim = itens[itens.length - 1]
      const atual = document.activeElement
      if (e.shiftKey && (atual === ini || !caixa.contains(atual))) {
        e.preventDefault()
        fim.focus()
      } else if (!e.shiftKey && (atual === fim || !caixa.contains(atual))) {
        e.preventDefault()
        ini.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (anterior && document.contains(anterior)) anterior.focus()
    }
  }, [aberto])

  return ref
}
