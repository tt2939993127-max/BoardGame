import { IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
    @IsEnum(['user', 'admin'])
    role!: 'user' | 'admin';
}
