import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';

export type TUser = {
  [key: string]: string | number | undefined
  _id: string
  email: string
  password?: string
  name?: string
  avatar?: string
  position?: string
  address?: string
  phone?: string
  city?: string
  role?: 'SUPER_ADMIN'
  status?: string
  exp: number
  iat: number
}

interface InitialState {
  user: null | TUser
  token: null | string
}

export const DEFAULT_LOCAL_USER: TUser = {
  _id: 'local-default-user',
  email: 'admin@pharmacy.local',
  password: 'Admin12345',
  name: 'Pharmacy Admin',
  role: 'SUPER_ADMIN',
  status: 'ACTIVE',
  iat: 0,
  exp: 4102444800,
};

export const DEFAULT_LOCAL_TOKEN = 'local-admin-session-token';

const initialState: InitialState = {
  user: null,
  token: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginUser: (state, action: PayloadAction<{ token: string, user: TUser }>) => {
      state.user = action.payload.user
      state.token = action.payload.token
    },
    ensureDefaultAuth: (state) => {
      if (state.token && state.user) return
    },
    logoutUser: (state) => {
      state.user = null
      state.token = null
    },
  }
});

export const { ensureDefaultAuth, loginUser, logoutUser } = authSlice.actions

export default authSlice.reducer;

export const getCurrentUser = (state: RootState) => state.auth.user
export const getCurrentToken = (state: RootState) => state.auth.token
