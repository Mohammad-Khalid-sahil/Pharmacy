import { baseApi } from '../baseApi';

const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query({
      query: (params) => ({ url: '/customers', method: 'GET', params }),
      providesTags: ['customer'],
    }),
    getCustomer: builder.query({
      query: (id) => ({ url: `/customers/${id}`, method: 'GET' }),
      providesTags: ['customer'],
    }),
    getCustomerBalance: builder.query({
      query: (id) => ({ url: `/customers/${id}/balance`, method: 'GET' }),
      providesTags: ['customer', 'customerLedger'],
    }),
    getCustomerDebtorAccounts: builder.query({
      query: (params) => ({ url: '/customer-debtor-accounts', method: 'GET', params }),
      providesTags: ['customerDebtorAccount'],
    }),
    getCustomerDebtorSummary: builder.query({
      query: (params) => ({ url: '/customer-debtor-accounts/summary', method: 'GET', params }),
      providesTags: ['customerDebtorAccount'],
    }),
    getCustomerDebtorAccount: builder.query({
      query: (id) => ({ url: `/customer-debtor-accounts/${id}`, method: 'GET' }),
      providesTags: ['customerDebtorAccount'],
    }),
    addCustomerDebt: builder.mutation({
      query: (body) => ({ url: '/customer-debtor-accounts/debt', method: 'POST', body }),
      invalidatesTags: ['customerDebtorAccount', 'customerLedger', 'cashbox'],
    }),
    recordCustomerDebtorPayment: builder.mutation({
      query: (body) => ({ url: '/customer-debtor-accounts/payment', method: 'POST', body }),
      invalidatesTags: ['customerDebtorAccount', 'customerLedger', 'customerPayment', 'cashbox'],
    }),
    settleCustomerDebtorAccount: builder.mutation({
      query: (id) => ({ url: `/customer-debtor-accounts/${id}/settle`, method: 'POST' }),
      invalidatesTags: ['customerDebtorAccount', 'customerLedger'],
    }),
    createCustomer: builder.mutation({
      query: (body) => ({ url: '/customers', method: 'POST', body }),
      invalidatesTags: ['customer'],
    }),
    updateCustomer: builder.mutation({
      query: ({ id, payload }) => ({ url: `/customers/${id}`, method: 'PATCH', body: payload }),
      invalidatesTags: ['customer'],
    }),
    deleteCustomer: builder.mutation({
      query: (id) => ({ url: `/customers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['customer'],
    }),
    createCustomerPayment: builder.mutation({
      query: (body) => ({ url: '/customer-payments', method: 'POST', body }),
      invalidatesTags: ['customer', 'customerPayment', 'customerLedger', 'customerDebtorAccount', 'cashbox', 'sale'],
    }),
    getCustomerPayments: builder.query({
      query: (params) => ({ url: '/customer-payments', method: 'GET', params }),
      providesTags: ['customerPayment'],
    }),
    getCustomerLedgers: builder.query({
      query: (params) => ({ url: '/customer-ledgers', method: 'GET', params }),
      providesTags: ['customerLedger'],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerQuery,
  useGetCustomerBalanceQuery,
  useGetCustomerDebtorAccountsQuery,
  useGetCustomerDebtorSummaryQuery,
  useGetCustomerDebtorAccountQuery,
  useAddCustomerDebtMutation,
  useRecordCustomerDebtorPaymentMutation,
  useSettleCustomerDebtorAccountMutation,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useCreateCustomerPaymentMutation,
  useGetCustomerPaymentsQuery,
  useGetCustomerLedgersQuery,
} = customerApi;
