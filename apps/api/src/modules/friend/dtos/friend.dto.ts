import { IsOptional, IsString } from 'class-validator';

export class FriendRequestDto {
    @IsOptional()
    @IsString()
    userId?: string;
}
