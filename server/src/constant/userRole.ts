export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  USER: 'USER'
} as const;

export const UserStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  BLOCK: 'BLOCK'
} as const;

export type TUserRole = 'SUPER_ADMIN' | 'USER';
export type TUserStatus = 'PENDING' | 'ACTIVE' | 'BLOCK';
