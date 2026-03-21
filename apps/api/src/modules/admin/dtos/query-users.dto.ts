import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dtos/pagination.dto';
import { USER_ROLES, type UserRole } from '../../auth/schemas/user-role';

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
    @IsEnum(USER_ROLES)
    role?: UserRole;
}
