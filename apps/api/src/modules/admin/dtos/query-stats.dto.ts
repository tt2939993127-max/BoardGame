import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export class QueryStatsDto {
    @IsOptional()
    @Type(() => Number)
    @IsIn([7, 30])
    days?: number;
}
