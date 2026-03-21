export const USER_ROLES = ['user', 'developer', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const BACKOFFICE_ROLES = ['developer', 'admin'] as const;
