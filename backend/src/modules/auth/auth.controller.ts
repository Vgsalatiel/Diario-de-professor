import type { Request, Response } from 'express'
import * as authService from './auth.service'
import {
  atualizarPerfilDto,
  cadastroDto,
  esqueciSenhaDto,
  loginDto,
  redefinirSenhaDto,
  verificarEmailDto,
} from './auth.dto'

export async function registrar(req: Request, res: Response) {
  const dados = cadastroDto.parse(req.body)
  const resultado = await authService.cadastrar(dados)
  res.status(201).json(resultado)
}

export async function entrar(req: Request, res: Response) {
  const dados = loginDto.parse(req.body)
  const resultado = await authService.login(dados)
  res.json(resultado)
}

export async function esqueciSenha(req: Request, res: Response) {
  const dados = esqueciSenhaDto.parse(req.body)
  await authService.esqueciSenha(dados)
  res.json({ ok: true })
}

export async function redefinirSenha(req: Request, res: Response) {
  const dados = redefinirSenhaDto.parse(req.body)
  await authService.redefinirSenha(dados)
  res.json({ ok: true })
}

export async function verificarEmail(req: Request, res: Response) {
  const dados = verificarEmailDto.parse(req.body)
  await authService.verificarEmail(dados)
  res.json({ ok: true })
}

export async function reenviarVerificacao(req: Request, res: Response) {
  await authService.reenviarVerificacao(req.professorId)
  res.json({ ok: true })
}

export async function perfil(req: Request, res: Response) {
  const professor = await authService.buscarPerfil(req.professorId)
  res.json(professor)
}

export async function atualizarPerfil(req: Request, res: Response) {
  const dados = atualizarPerfilDto.parse(req.body)
  const professor = await authService.atualizarPerfil(req.professorId, dados)
  res.json(professor)
}
