import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class IdentifyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
