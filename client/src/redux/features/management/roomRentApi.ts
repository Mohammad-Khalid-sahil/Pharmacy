import { baseApi } from '../baseApi';
import { CreateRoomRentAccountPayload } from '../../../types/roomRent.types';

const roomRentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRoomRentAccounts: builder.query({
      query: (params: { page?: number; limit?: number; search?: string }) => ({
        url: '/room-rent-accounts',
        method: 'GET',
        params,
      }),
      providesTags: ['roomRent'],
    }),
    getRoomRentAccount: builder.query({
      query: (id: string) => ({ url: `/room-rent-accounts/${id}`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'roomRent', id }],
    }),
    createRoomRentAccount: builder.mutation({
      query: (body: CreateRoomRentAccountPayload) => ({
        url: '/room-rent-accounts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['roomRent', 'cashbox'],
    }),
    addRoomRentUnpaidMonth: builder.mutation({
      query: (body: { account: string; date?: string; period?: string; note?: string }) => ({
        url: '/room-rent-accounts/unpaid-month',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['roomRent'],
    }),
    addRoomRentPayment: builder.mutation({
      query: (body: { account: string; amount: number; date?: string; note?: string }) => ({
        url: '/room-rent-accounts/payment',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['roomRent', 'cashbox'],
    }),
  }),
});

export const {
  useGetRoomRentAccountsQuery,
  useGetRoomRentAccountQuery,
  useCreateRoomRentAccountMutation,
  useAddRoomRentUnpaidMonthMutation,
  useAddRoomRentPaymentMutation,
} = roomRentApi;
