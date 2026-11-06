import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SalvarAlunoDto {
  @IsString()
  @IsNotEmpty({ message: 'nome é obrigatório' })
  @MaxLength(120)
  nome: string;

  @IsString()
  @IsNotEmpty({ message: 'matricula é obrigatória' })
  @MaxLength(20)
  matricula: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disciplinasConcluidas?: string[];
}
