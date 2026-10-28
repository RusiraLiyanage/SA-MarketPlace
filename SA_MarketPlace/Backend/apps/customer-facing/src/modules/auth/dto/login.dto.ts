import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

// Documents the login body in Swagger; LocalStrategy reads the fields itself.
export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @IsNotEmpty()
  password!: string
}
