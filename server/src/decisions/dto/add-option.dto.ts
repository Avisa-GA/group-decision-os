import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  title!: string;

  /** Free-form details per PRD: image, price, notes, etc. */
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
