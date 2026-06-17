import { baseApi } from '../baseApi';

const saleReturnApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSaleReturns: builder.query({
      query: (params: { sale?: string; page?: number; limit?: number }) => ({
        url: '/sale-returns',
        method: 'GET',
        params,
      }),
      providesTags: (_result, _error, arg) =>
        arg.sale ? [{ type: 'saleReturn', id: arg.sale }] : ['saleReturn'],
    }),
    getSaleReturn: builder.query({
      query: (id) => ({ url: `/sale-returns/${id}`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'saleReturn', id }],
    }),
    createSaleReturn: builder.mutation({
      query: (body) => ({ url: '/sale-returns', method: 'POST', body }),
      invalidatesTags: (_result, _error, arg) => [
        'saleReturn',
        { type: 'saleReturn', id: arg.sale },
        'sale',
        'product',
        'customer',
        'customerLedger',
        'cashbox',
      ],
    }),
    deleteSaleReturn: builder.mutation({
      query: (id) => ({ url: `/sale-returns/${id}`, method: 'DELETE' }),
      invalidatesTags: ['saleReturn', 'sale', 'product'],
    }),
  }),
});

export const {
  useGetSaleReturnsQuery,
  useGetSaleReturnQuery,
  useCreateSaleReturnMutation,
  useDeleteSaleReturnMutation,
} = saleReturnApi;
