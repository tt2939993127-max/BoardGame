import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dtos/pagination.dto';

const parseBoolean = (value: unknown): boolean | undefined => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
};

export class QueryUsersDto extends PaginationQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Transform(({ value }: { value: unknown }) => parseBoolean(value))
    @IsBoolean()
    banned?: boolean;

    @IsOptional()
    @IsEnum(['user', 'admin'])
    role?: 'user' | 'admin';
}
