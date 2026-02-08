import { IsISO8601, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dtos/pagination.dto';

export class QueryMatchesDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    gameName?: string;

    @IsOptional()
    @IsISO8601()
    startDate?: string;

    @IsOptional()
    @IsISO8601()
    endDate?: string;

    @IsOptional()
    @IsString()
    search?: string;
}
