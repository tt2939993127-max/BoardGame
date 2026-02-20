import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
    @IsString()
    @IsNotEmpty()
    toUserId!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200) // 与 src/shared/chat.ts 的 MAX_CHAT_LENGTH 保持一致
    content!: string;

    @IsOptional()
    @IsEnum(['text', 'invite'])
    type?: 'text' | 'invite';
}
