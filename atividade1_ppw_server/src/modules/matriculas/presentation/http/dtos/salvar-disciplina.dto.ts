import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SalvarDisciplinaDto {
  @IsString()
  @IsNotEmpty({ message: 'codigo é obrigatório' })
  @MaxLength(20)
  codigo: string;

  @IsString()
  @IsNotEmpty({ message: 'nome é obrigatório' })
  @MaxLength(120)
  nome: string;

  @IsInt({ message: 'vagasTotais deve ser um número inteiro' })
  @Min(1, { message: 'vagasTotais deve ser no mínimo 1' })
  vagasTotais: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preRequisitos?: string[];
}
