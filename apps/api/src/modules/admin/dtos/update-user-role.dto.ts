import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { USER_ROLES, type UserRole } from '../../auth/schemas/user-role';

export class UpdateUserRoleDto {
    @IsEnum(USER_ROLES)
    role!: UserRole;

    @IsOptional()
    @Transform(({ value }: { value: unknown }) => {
        if (value === undefined || value === null) return undefined;
        if (!Array.isArray(value)) return [];
        const normalized = value
            .map((item) => typeof item === 'string' ? item.trim().toLowerCase() : '')
            .filter(Boolean);
        return Array.from(new Set(normalized));
    })
    @Type(() => String)
    @IsArray()
    @IsString({ each: true })
    developerGameIds?: string[];
}
