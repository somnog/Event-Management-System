import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  /**
   * The user's plaintext password. The service hashes it before storing.
   * Required unless the deprecated `passwordHash` alias was supplied.
   */
  @ValidateIf((dto: RegisterDto) => dto.passwordHash === undefined)
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  /**
   * @deprecated Misnomer - this never held a hash, only the plaintext
   * password. Use `password`. Kept so existing callers keep working.
   */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  passwordHash?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  affiliation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}
