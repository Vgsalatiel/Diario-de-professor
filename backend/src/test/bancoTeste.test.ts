import { describe, expect, it } from 'vitest'
import { exigirBancoDeTeste } from './bancoTeste'

describe('exigirBancoDeTeste', () => {
  it('aceita banco local com "teste" no nome', () => {
    expect(() => exigirBancoDeTeste('postgresql://vinicius@localhost/diario_teste?host=/var/run/postgresql')).not.toThrow()
    expect(() => exigirBancoDeTeste('postgresql://u@localhost:54329/diario_teste?host=/tmp/pgt')).not.toThrow()
  })

  it('recusa banco remoto (ex.: Supabase) mesmo com "teste" no nome', () => {
    expect(() => exigirBancoDeTeste('postgresql://u:s@aws-0-sa-east-1.pooler.supabase.com:6543/postgres')).toThrow()
    expect(() => exigirBancoDeTeste('postgresql://u:s@db.exemplo.com:5432/diario_teste')).toThrow()
  })

  it('recusa banco local que não é de teste', () => {
    expect(() => exigirBancoDeTeste('postgresql://u@localhost/postgres')).toThrow()
  })
})
