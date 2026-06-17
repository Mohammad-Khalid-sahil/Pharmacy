import { baseApi } from '../baseApi';

const cashboxApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCashboxSummary: builder.query({
      query: () => ({ url: '/cashbox-transactions/summary', method: 'GET' }),
      providesTags: ['cashbox'],
    }),
    getCashboxTransactions: builder.query({
      query: (params) => ({ url: '/cashbox-transactions', method: 'GET', params }),
      providesTags: ['cashbox'],
    }),
    getCashboxPersonAccounts: builder.query({
      query: (params) => ({ url: '/cashbox-person-accounts', method: 'GET', params }),
      providesTags: ['cashboxPersonAccount'],
    }),
    getCashboxPersonAccount: builder.query({
      query: (id) => ({ url: `/cashbox-person-accounts/${id}`, method: 'GET' }),
      providesTags: ['cashboxPersonAccount'],
    }),
    createPersonAccountTransaction: builder.mutation({
      query: (body) => ({ url: '/cashbox-person-accounts/transaction', method: 'POST', body }),
      invalidatesTags: ['cashboxPersonAccount', 'cashbox'],
    }),
    updateCashboxPersonAccount: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/cashbox-person-accounts/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['cashboxPersonAccount', 'cashbox'],
    }),
    deleteCashboxPersonAccount: builder.mutation({
      query: (id) => ({ url: `/cashbox-person-accounts/${id}`, method: 'DELETE' }),
      invalidatesTags: ['cashboxPersonAccount', 'cashbox'],
    }),
    createCashboxTransaction: builder.mutation({
      query: (body) => ({ url: '/cashbox-transactions', method: 'POST', body }),
      invalidatesTags: ['cashbox', 'cashboxPersonAccount'],
    }),
    updateCashboxTransaction: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/cashbox-transactions/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['cashbox'],
    }),
    deleteCashboxTransaction: builder.mutation({
      query: (id) => ({ url: `/cashbox-transactions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['cashbox'],
    }),
    createMoneyTransfer: builder.mutation({
      query: (body) => ({ url: '/money-transfers', method: 'POST', body }),
      invalidatesTags: ['cashbox', 'moneyTransfer'],
    }),
    getMoneyTransfers: builder.query({
      query: (params) => ({ url: '/money-transfers', method: 'GET', params }),
      providesTags: ['moneyTransfer'],
    }),
    createSellerPayment: builder.mutation({
      query: (body) => ({ url: '/seller-payments', method: 'POST', body }),
      invalidatesTags: ['seller', 'sellerPayment', 'sellerLedger', 'cashbox', 'purchases'],
    }),
    getSellerLedgers: builder.query({
      query: (params) => ({ url: '/seller-ledgers', method: 'GET', params }),
      providesTags: ['sellerLedger'],
    }),
    getSellerBalance: builder.query({
      query: (sellerId) => ({ url: `/seller-ledgers/balance/${sellerId}`, method: 'GET' }),
      providesTags: ['sellerLedger'],
    }),
  }),
});

export const {
  useGetCashboxSummaryQuery,
  useGetCashboxTransactionsQuery,
  useGetCashboxPersonAccountsQuery,
  useGetCashboxPersonAccountQuery,
  useCreatePersonAccountTransactionMutation,
  useUpdateCashboxPersonAccountMutation,
  useDeleteCashboxPersonAccountMutation,
  useCreateCashboxTransactionMutation,
  useUpdateCashboxTransactionMutation,
  useDeleteCashboxTransactionMutation,
  useCreateMoneyTransferMutation,
  useGetMoneyTransfersQuery,
  useCreateSellerPaymentMutation,
  useGetSellerLedgersQuery,
  useGetSellerBalanceQuery,
} = cashboxApi;
