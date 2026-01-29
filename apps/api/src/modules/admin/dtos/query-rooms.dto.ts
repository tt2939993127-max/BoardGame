import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dtos/pagination.dto';

export class QueryRoomsDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    gameName?: string;
}
