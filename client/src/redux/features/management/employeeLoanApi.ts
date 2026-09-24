import { baseApi } from '../baseApi';
import { CreateEmployeeLoanPayload } from '../../../types/employeeLoan.types';

const employeeLoanApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployeeLoans: builder.query({
      query: (params: { page?: number; limit?: number; employee?: string }) => ({
        url: '/employee-loans',
        method: 'GET',
        params,
      }),
      providesTags: ['employeeLoan'],
    }),
    createEmployeeLoan: builder.mutation({
      query: (body: CreateEmployeeLoanPayload) => ({
        url: '/employee-loans',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['employeeLoan', 'employee'],
    }),
  }),
});

export const { useGetEmployeeLoansQuery, useCreateEmployeeLoanMutation } = employeeLoanApi;
