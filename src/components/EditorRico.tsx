import { useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

interface EditorRicoProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

// Editor de texto rico (tipo Word) — usado no "Conteúdo previsto" do
// Plano de Aula, pra dar pro professor criar listas, subtítulos e
// formatação básica em vez de só texto corrido.
export function EditorRico({ value, onChange, placeholder }: EditorRicoProps) {
  // O Quill não cria a barra de ferramentas DENTRO do elemento que
  // recebe — ele insere como IRMÃ dele, no elemento pai (é assim que a
  // lib funciona). Por isso usamos um wrapper que só nós controlamos: um
  // alvo novo é criado a cada montagem, e ao desmontar limpamos o
  // wrapper inteiro — senão a barra de ferramentas antiga fica órfã no
  // DOM (fora do container que a gente limpava antes) e vai empilhando
  // uma em cima da outra a cada vez que o editor remonta.
  const wrapperRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const alvo = document.createElement('div')
    wrapper.appendChild(alvo)

    const quill = new Quill(alvo, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['clean'],
        ],
      },
    })
    quillRef.current = quill
    if (value) quill.root.innerHTML = value

    quill.on('text-change', () => {
      const html = quill.getText().trim() === '' ? '' : quill.root.innerHTML
      onChangeRef.current(html)
    })

    return () => {
      quillRef.current = null
      wrapper.innerHTML = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sincroniza quando o valor muda por fora (ex.: trocar de plano
  // selecionado), sem mexer se a mudança veio do próprio editor.
  useEffect(() => {
    const quill = quillRef.current
    if (!quill) return
    if (quill.root.innerHTML === value || (value === '' && quill.getText().trim() === '')) return
    quill.root.innerHTML = value
  }, [value])

  return <div ref={wrapperRef} className="editor-rico" />
}
