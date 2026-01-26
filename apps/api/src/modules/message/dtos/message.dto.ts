import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
    @IsString()
    @IsNotEmpty()
    toUserId!: string;

    @IsString()
    @IsNotEmpty()
    content!: string;

    @IsOptional()
    @IsEnum(['text', 'invite'])
    type?: 'text' | 'invite';
}
