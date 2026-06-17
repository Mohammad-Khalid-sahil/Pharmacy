import { DEFAULT_LOCAL_USER, TUser } from '../redux/services/authSlice';

const PROFILE_STORAGE_KEY = 'pharmacy.profile.user';
const SESSION_USER_KEY = 'user';
const PROFILE_USER_ID = 'local-admin-user';

const safeParseUser = (value: string | null): Partial<TUser> | null => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export const readStoredProfile = (): Partial<TUser> | null => {
  if (typeof window === 'undefined') return null;
  return safeParseUser(window.localStorage.getItem(PROFILE_STORAGE_KEY));
};

export const getPersistedProfileUser = (): TUser => {
  const sessionUser = typeof window === 'undefined'
    ? null
    : safeParseUser(window.localStorage.getItem(SESSION_USER_KEY));
  const storedProfile = readStoredProfile();

  return {
    ...DEFAULT_LOCAL_USER,
    ...sessionUser,
    ...storedProfile,
    _id: PROFILE_USER_ID,
    email: DEFAULT_LOCAL_USER.email,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  } as TUser;
};

export const savePersistedProfileUser = (profile: Partial<TUser>): TUser => {
  const user = {
    ...getPersistedProfileUser(),
    ...profile,
    _id: PROFILE_USER_ID,
    email: DEFAULT_LOCAL_USER.email,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
  } as TUser;

  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(user));
  window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));

  return user;
};
