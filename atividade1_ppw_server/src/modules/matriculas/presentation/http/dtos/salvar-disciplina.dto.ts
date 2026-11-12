import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class HorarioDto {
  @IsInt()
  @Min(1)
  @Max(7)
  dia: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'inicio deve estar no formato HH:MM' })
  inicio: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'fim deve estar no formato HH:MM' })
  fim: string;
}

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioDto)
  horarios?: HorarioDto[];
}
