import { useState, type KeyboardEvent } from 'react'

interface CampoTagsProps {
  valores: string[]
  onChange: (valores: string[]) => void
  placeholder?: string
}

// Campo de "tags": digita um valor, aperta Enter/vírgula (ou sai do campo)
// pra transformar em etiqueta — usado pra matéria(s) do professor, já que
// tem professor que dá aula de mais de uma.
export function CampoTags({ valores, onChange, placeholder }: CampoTagsProps) {
  const [rascunho, setRascunho] = useState('')

  function adicionar() {
    const texto = rascunho.trim()
    setRascunho('')
    if (!texto) return
    if (valores.some((v) => v.toLowerCase() === texto.toLowerCase())) return
    onChange([...valores, texto])
  }

  function remover(valor: string) {
    onChange(valores.filter((v) => v !== valor))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      adicionar()
    } else if (e.key === 'Backspace' && rascunho === '' && valores.length > 0) {
      remover(valores[valores.length - 1])
    }
  }

  return (
    <div className="campo-tags">
      {valores.map((v) => (
        <span key={v} className="tag-item">
          {v}
          <button type="button" onClick={() => remover(v)} aria-label={`Remover ${v}`}>
            ✕
          </button>
        </span>
      ))}
      <input
        className="campo-tags-input"
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={adicionar}
        placeholder={valores.length === 0 ? placeholder : ''}
      />
    </div>
  )
}
