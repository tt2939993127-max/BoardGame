import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateAdminTestLatencyDto {
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    enabled?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(5000)
    delayMs?: number;
}
