import { baseApi } from '../baseApi';

const expenseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllExpenses: builder.query({
      query: (query) => ({ url: '/expenses', method: 'GET', params: query }),
      providesTags: ['expenses' as any]
    }),
    getExpenseSummary: builder.query({
      query: (params) => ({ url: '/expenses/summary', method: 'GET', params }),
      providesTags: ['expenses' as any],
    }),
    createExpense: builder.mutation({
      query: (payload) => ({ url: '/expenses', method: 'POST', body: payload }),
      invalidatesTags: ['expenses' as any, 'cashbox' as any]
    }),
    updateExpense: builder.mutation({
      query: ({ id, payload }) => ({ url: `/expenses/${id}`, method: 'PATCH', body: payload }),
      invalidatesTags: ['expenses' as any, 'cashbox' as any]
    }),
    deleteExpense: builder.mutation({
      query: (id) => ({ url: `/expenses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['expenses' as any, 'cashbox' as any]
    })
  })
});

export const { useGetAllExpensesQuery, useGetExpenseSummaryQuery, useCreateExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation } = expenseApi;
