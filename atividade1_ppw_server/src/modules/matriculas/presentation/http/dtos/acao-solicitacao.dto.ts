import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Corpo das ações (aprovar, rejeitar, cancelar…). A justificativa é exigida pela guarda quando necessário. */
export class AcaoSolicitacaoDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  justificativa?: string;
}
