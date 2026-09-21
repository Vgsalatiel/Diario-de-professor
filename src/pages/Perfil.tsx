import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { CampoTags } from '../components/CampoTags'
import { lerImagemComprimida } from '../lib/imagem'
import { normalizarNome, validarNome } from '../lib/validarNome'

export function Perfil() {
  const { professora, atualizarPerfil } = useAuth()
  const { turmas, alunos } = useData()
  const [form, setForm] = useState({
    nome: professora.nome,
    email: professora.email,
    fotoUrl: professora.fotoUrl ?? '',
  })
  const [materias, setMaterias] = useState<string[]>(professora.materias)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof typeof form>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setSalvo(false)
  }

  function setMateriasEMarcarSujo(valores: string[]) {
    setMaterias(valores)
    setSalvo(false)
  }

  function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    lerImagemComprimida(file).then((dataUrl) => set('fotoUrl', dataUrl))
  }

  async function salvar() {
    const erroNome = validarNome(form.nome)
    if (erroNome) {
      setErro(erroNome)
      setSalvo(false)
      return
    }
    setErro('')
    setSalvando(true)
    const r = await atualizarPerfil({ ...form, nome: normalizarNome(form.nome), materias })
    setSalvando(false)
    if (r.ok) {
      setSalvo(true)
    } else {
      setErro(r.erro ?? 'Não foi possível salvar as alterações.')
    }
  }

  const iniciais = form.nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <div className="stack-lg">
      <header className="pagina-head">
        <div>
          <h1>Perfil</h1>
          <p className="pagina-sub">Seus dados e informações das turmas.</p>
        </div>
      </header>

      <div className="grid-perfil">
        <section className="painel perfil-cartao">
          <div className="avatar avatar-lg">
            {form.fotoUrl ? (
              <img src={form.fotoUrl} alt="Foto da professora" />
            ) : (
              <span>{iniciais || '·'}</span>
            )}
          </div>
          <h2>{form.nome || 'Sem nome'}</h2>
          <p className="perfil-materia">{materias.join(', ')}</p>
          <button
            className="btn btn-fantasma"
            onClick={() => fileRef.current?.click()}
          >
            Trocar foto
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onFoto}
          />

          <div className="perfil-stats">
            <div>
              <strong>{turmas.length}</strong>
              <span>turmas</span>
            </div>
            <div>
              <strong>{alunos.length}</strong>
              <span>alunos</span>
            </div>
          </div>
        </section>

        <section className="painel">
          <div className="painel-head">
            <h2>Dados pessoais</h2>
          </div>
          <div className="form-grid">
            <label className="campo">
              <span>Nome</span>
              <input value={form.nome} onChange={(e) => set('nome', e.target.value)} />
            </label>
            <label className="campo">
              <span>Matéria(s)</span>
              <CampoTags valores={materias} onChange={setMateriasEMarcarSujo} />
            </label>
            <label className="campo campo-largo">
              <span>E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </label>
          </div>

          {erro && <div className="alerta-erro">{erro}</div>}

          <div className="acoes-fim">
            {salvo && <span className="feedback-ok">Alterações salvas.</span>}
            <button className="btn btn-primario" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>

          <hr className="divisor" />

          <h3 className="titulo-secao">Minhas turmas</h3>
          {turmas.length === 0 ? (
            <p className="texto-suave">Nenhuma turma cadastrada ainda.</p>
          ) : (
            <ul className="lista-chips">
              {turmas.map((t) => (
                <li key={t.id} className="chip" style={{ borderColor: t.cor }}>
                  <span className="ponto" style={{ background: t.cor }} />
                  {t.nome}
                  <span className="chip-meta">
                    {alunos.filter((a) => a.turmaId === t.id).length} alunos
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
