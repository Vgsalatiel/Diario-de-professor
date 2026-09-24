// Pill de frequência (%) reutilizada em várias telas — verde a partir de
// 75%, vermelho abaixo disso, mesmo corte usado em todo o app.
export function pillFrequencia(percentual: number | null) {
  if (percentual == null) return <span className="pill pill-sem-nota">—</span>
  return (
    <span className={`pill ${percentual >= 75 ? 'pill-aprovado' : 'pill-recuperacao'}`}>{percentual}%</span>
  )
}
