import { IsOptional, IsString } from 'class-validator';

export class RoomFilterDto {
    @IsOptional()
    @IsString()
    gameName?: string;

    @IsOptional()
    @IsString()
    search?: string;
}
