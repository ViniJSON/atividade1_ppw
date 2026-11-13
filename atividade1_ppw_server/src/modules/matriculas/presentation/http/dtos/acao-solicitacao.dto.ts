import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AcaoSolicitacaoDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  justificativa?: string;
}
