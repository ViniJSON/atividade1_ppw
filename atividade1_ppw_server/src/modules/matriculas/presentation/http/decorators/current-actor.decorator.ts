import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { PapelUsuario } from '../../../domain/enums/solicitacao.enums';
import { Actor } from '../../../domain/workflow/types';

const PAPEIS_HTTP = [PapelUsuario.ALUNO, PapelUsuario.COORDENADOR, PapelUsuario.SECRETARIA] as string[];

export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const id = req.header('x-actor-id')?.trim();
  const papel = req.header('x-actor-role')?.trim().toUpperCase();
  if (!id || !papel || !PAPEIS_HTTP.includes(papel)) {
    throw new UnauthorizedException(
      'Informe os cabeçalhos X-Actor-Id e X-Actor-Role (ALUNO, COORDENADOR ou SECRETARIA)',
    );
  }
  return { id, papel: papel as PapelUsuario };
});
