import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateNotificationDto {
    @IsString()
    title!: string;

    @IsString()
    content!: string;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @IsOptional()
    @IsBoolean()
    published?: boolean;
}

export class UpdateNotificationDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;

    @IsOptional()
    @IsBoolean()
    published?: boolean;
}
