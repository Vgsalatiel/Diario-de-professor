import { Suspense } from 'react'
import { lazyNomeado } from '../lib/lazy'

// O Quill é pesado e só Presença e Plano de aula usam o editor — fica num
// pedaço à parte, baixado quando uma dessas telas mostra o editor.
const EditorRicoReal = lazyNomeado(() => import('./EditorRico'), 'EditorRico')

interface EditorRicoProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export function EditorRico(props: EditorRicoProps) {
  return (
    <Suspense fallback={<div className="editor-rico editor-carregando">Carregando editor…</div>}>
      <EditorRicoReal {...props} />
    </Suspense>
  )
}
