import type { ReactNode } from 'react'
import { useDialogo } from '../lib/useDialogo'

interface ModalProps {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: ReactNode
  rodape?: ReactNode
}

export function Modal({ aberto, titulo, onFechar, children, rodape }: ModalProps) {
  const ref = useDialogo<HTMLDivElement>(aberto, onFechar)

  if (!aberto) return null

  return (
    <div className="modal-overlay" onMouseDown={onFechar}>
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2>{titulo}</h2>
          <button className="icon-btn" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {rodape && <footer className="modal-foot">{rodape}</footer>}
      </div>
    </div>
  )
}
