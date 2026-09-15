import { useEffect, type ReactNode } from 'react'

interface DrawerProps {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: ReactNode
  rodape?: ReactNode
}

// Painel lateral que desliza da direita — ocupa a tela toda em altura,
// mas para antes do menu lateral (não cobre a navegação).
export function Drawer({ aberto, titulo, onFechar, children, rodape }: DrawerProps) {
  useEffect(() => {
    if (!aberto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div className="drawer-overlay" onMouseDown={onFechar}>
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="drawer-head">
          <h2>{titulo}</h2>
          <button className="icon-btn" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {rodape && <footer className="drawer-foot">{rodape}</footer>}
      </div>
    </div>
  )
}
