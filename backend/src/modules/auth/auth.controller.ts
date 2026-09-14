import type { Request, Response } from 'express'
import * as authService from './auth.service'
import { atualizarPerfilDto, cadastroDto, loginDto } from './auth.dto'

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

export async function perfil(req: Request, res: Response) {
  const professor = await authService.buscarPerfil(req.professorId)
  res.json(professor)
}

export async function atualizarPerfil(req: Request, res: Response) {
  const dados = atualizarPerfilDto.parse(req.body)
  const professor = await authService.atualizarPerfil(req.professorId, dados)
  res.json(professor)
}
