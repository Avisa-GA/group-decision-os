import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDecisionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
