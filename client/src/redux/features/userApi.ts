import { baseApi } from './baseApi';

const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => ({ url: '/users', method: 'GET' }),
      providesTags: ['user']
    }),
    createUser: builder.mutation({
      query: (payload) => ({ url: '/users', method: 'POST', body: payload }),
      invalidatesTags: ['user']
    })
  })
});

export const { useGetUsersQuery, useCreateUserMutation } = userApi;
