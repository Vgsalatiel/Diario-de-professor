import { AppError } from './AppError'

// No Express 5, req.params[chave] é tipado como string | string[] (por
// causa de padrões de rota mais flexíveis) — na prática, os parâmetros
// que usamos (ids simples) são sempre uma string só. Isso garante isso
// em tempo de execução também, não só convence o TypeScript.
export function paramId(valor: string | string[] | undefined): string {
  if (typeof valor !== 'string' || !valor) {
    throw AppError.requisicaoInvalida('Parâmetro de rota inválido.')
  }
  return valor
}
