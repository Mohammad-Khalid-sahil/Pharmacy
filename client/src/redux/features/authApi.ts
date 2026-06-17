import { baseApi } from "./baseApi";
import { TUser, loginUser } from "../services/authSlice";
import { getPersistedProfileUser, savePersistedProfileUser } from "../../utils/profileStorage";

type ApiResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string;
  data: T;
};

type LoginPayload = {
  email: string;
  password: string;
};

const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<{ token: string; user: TUser }>, LoginPayload>({
      queryFn: async (payload, api) => {
        if (!window.auth?.login) {
          return {
            error: {
              status: 500,
              data: {
                statusCode: 500,
                success: false,
                message: 'Static login is not available.',
                data: null,
              },
            },
          };
        }

        const staticResult = await window.auth.login(payload);
        const result: ApiResponse<{ token: string; user: TUser }> = {
          statusCode: staticResult.success ? 200 : 401,
          success: staticResult.success,
          message: staticResult.message,
          data: staticResult.success
            ? { token: staticResult.token as string, user: staticResult.user as TUser }
            : null as any,
        };

        if (!result.success) {
          return { error: { status: result.statusCode, data: result } };
        }

        api.dispatch(loginUser(result.data as any));
        return { data: result };
      },
      invalidatesTags: ['product', 'sale', 'user']
    }),

    // Public registration disabled in single-admin mode

    getSelfProfile: builder.query<ApiResponse<TUser>, void>({
      queryFn: async () => ({
        data: {
          statusCode: 200,
          success: true,
          message: 'Success',
          data: getPersistedProfileUser(),
        },
      }),
      providesTags: ['user']
    }),

    changePassword: builder.mutation<ApiResponse<TUser>, Record<string, unknown>>({
      queryFn: async () => ({
        error: {
          status: 400,
          data: {
            statusCode: 400,
            success: false,
            message: 'Password changes are disabled in static admin mode.',
            data: null,
          },
        },
      }),
      invalidatesTags: ['user']
    }),

    updateProfile: builder.mutation<ApiResponse<TUser>, Partial<TUser>>({
      queryFn: async (payload, api) => {
        const user = savePersistedProfileUser(payload);
        api.dispatch(loginUser({ token: 'local-admin-session-token', user }));

        return { data: { statusCode: 200, success: true, message: 'Updated successfully', data: user } };
      },
      invalidatesTags: ['user']
    }),

  })
})

export const {
  useLoginMutation,
  useGetSelfProfileQuery,
  useChangePasswordMutation,
  useUpdateProfileMutation
} = authApi
