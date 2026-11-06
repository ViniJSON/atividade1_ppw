import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TipoSolicitacao } from '../../../domain/enums/solicitacao.enums';

export class SalvarSolicitacaoDto {
  @IsString()
  @IsNotEmpty()
  alunoId: string;

  @IsString()
  @IsNotEmpty()
  disciplinaId: string;

  @IsEnum(TipoSolicitacao, {
    message: 'tipo deve ser MATRICULA ou TRANCAMENTO',
  })
  tipo: TipoSolicitacao;
}
