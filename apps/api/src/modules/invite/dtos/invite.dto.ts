import { IsNotEmpty, IsString } from 'class-validator';

export class SendInviteDto {
    @IsString()
    @IsNotEmpty()
    toUserId!: string;

    @IsString()
    @IsNotEmpty()
    matchId!: string;

    @IsString()
    @IsNotEmpty()
    gameName!: string;
}
