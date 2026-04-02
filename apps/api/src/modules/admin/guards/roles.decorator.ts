import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../auth/schemas/user-role';

export type Role = UserRole;

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
