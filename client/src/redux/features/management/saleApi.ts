import { baseApi } from "../baseApi";

const saleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllSale: builder.query({
      query: (query) => ({
        url: '/sales',
        method: 'GET',
        params: query
      }),
      providesTags: ['sale']
    }),
    getSingleSale: builder.query({
      query: (id) => ({
        url: `/sales/${id}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'sale', id }],
    }),
    createSale: builder.mutation({
      query: (payload) => ({
        url: '/sales',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['sale', 'product', 'customerLedger', 'customerDebtorAccount', 'cashbox']
    }),
    createBulkSale: builder.mutation({
      query: (payload) => ({
        url: '/sales/bulk',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['sale', 'product', 'customerLedger', 'customerDebtorAccount', 'cashbox']
    }),
    getSalesByTransaction: builder.query({
      query: (transactionId) => ({
        url: `/sales/transaction/${transactionId}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, transactionId) => [{ type: 'sale', id: transactionId }],
    }),
    deleteSale: builder.mutation({
      query: (id) => ({
        url: `/sales/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['sale', 'saleReturn', 'product', 'customerLedger', 'cashbox']
    }),
    updateSale: builder.mutation({
      query: ({ id, payload }) => ({
        url: `/sales/${id}`,
        method: 'PATCH',
        body: payload
      }),
      invalidatesTags: ['sale', 'product', 'customerLedger', 'cashbox']
    }),
    yearlySale: builder.query({
      query: () => ({
        url: `/sales/years`,
        method: 'GET'
      }),
      providesTags: ['sale']
    }),
    monthlySale: builder.query({
      query: () => ({
        url: `/sales/months`,
        method: 'GET'
      }),
      providesTags: ['sale']
    }),
    weeklySale: builder.query({
      query: () => ({
        url: `/sales/weeks`,
        method: 'GET'
      }),
      providesTags: ['sale']
    }),
    dailySale: builder.query({
      query: () => ({
        url: `/sales/days`,
        method: 'GET'
      }),
      providesTags: ['sale']
    }),
  })
})

export const {
  useGetAllSaleQuery,
  useGetSingleSaleQuery,
  useCreateSaleMutation,
  useCreateBulkSaleMutation,
  useGetSalesByTransactionQuery,
  useDeleteSaleMutation,
  useUpdateSaleMutation,
  useYearlySaleQuery,
  useMonthlySaleQuery,
  useWeeklySaleQuery,
  useDailySaleQuery } = saleApi
