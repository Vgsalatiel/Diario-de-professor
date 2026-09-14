// Erro "esperado" (regra de negócio, validação, autorização) — o
// errorHandler sabe transformar isso numa resposta HTTP com o status certo.
// Qualquer outro erro (bug, falha de banco) vira 500 genérico.
export class AppError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'AppError'
  }

  static naoEncontrado(entidade: string): AppError {
    return new AppError(404, `${entidade} não encontrado(a).`)
  }

  static naoAutorizado(mensagem = 'Não autenticado.'): AppError {
    return new AppError(401, mensagem)
  }

  static proibido(mensagem = 'Você não tem acesso a esse recurso.'): AppError {
    return new AppError(403, mensagem)
  }

  static requisicaoInvalida(mensagem: string): AppError {
    return new AppError(400, mensagem)
  }

  static conflito(mensagem: string): AppError {
    return new AppError(409, mensagem)
  }
}
