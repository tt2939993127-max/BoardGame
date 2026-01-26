import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDto {
    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    password?: string;
}

export class LoginDto {
    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    password?: string;
}

export class SendEmailCodeDto {
    @IsOptional()
    @IsString()
    email?: string;
}

export class VerifyEmailDto {
    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    code?: string;
}

export class UpdateAvatarDto {
    @IsString()
    @IsNotEmpty()
    avatar!: string;
}
