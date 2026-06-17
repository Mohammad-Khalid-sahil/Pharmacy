import { baseApi } from '../baseApi';
import { CreateSalaryPaymentPayload } from '../../../types/salaryPayment.types';

const salaryPaymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSalaryPayments: builder.query({
      query: (params: { page?: number; limit?: number; employee?: string }) => ({
        url: '/salary-payments',
        method: 'GET',
        params,
      }),
      providesTags: ['salary'],
    }),
    createSalaryPayment: builder.mutation({
      query: (body: CreateSalaryPaymentPayload) => ({
        url: '/salary-payments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['salary', 'cashbox', 'employee'],
    }),
  }),
});

export const { useGetSalaryPaymentsQuery, useCreateSalaryPaymentMutation } = salaryPaymentApi;
