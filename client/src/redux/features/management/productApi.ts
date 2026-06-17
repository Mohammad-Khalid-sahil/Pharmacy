import { baseApi } from "../baseApi";

const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllProducts: builder.query({
      query: (query) => ({
        url: '/products',
        method: 'GET',
        params: query
      }),
      providesTags: ['product']
    }),
    countProducts: builder.query({
      query: (query) => ({
        url: '/products/total',
        method: 'GET',
        params: query
      }),
      providesTags: ['product']
    }),
    getLowStockAlerts: builder.query({
      query: () => ({ url: '/products/alerts/low-stock', method: 'GET' }),
      providesTags: ['product'],
      keepUnusedDataFor: 0,
    }),
    getExpiringAlerts: builder.query({
      query: (days = 30) => ({ url: '/products/alerts/expiring', method: 'GET', params: { days } }),
      providesTags: ['product'],
      keepUnusedDataFor: 0,
    }),
    getSingleProduct: builder.query({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'GET'
      }),
      providesTags: ['product']
    }),
    createNewProduct: builder.mutation({
      query: (payload) => ({
        url: '/products',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['product', 'purchases', 'sellerLedger', 'cashbox']
    }),
    addStock: builder.mutation({
      query: ({ id, payload }) => ({
        url: `/products/${id}/add`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['product', 'purchases', 'sellerLedger', 'cashbox']
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['product', 'sale', 'purchases', 'sellerLedger', 'cashbox']
    }),
    updateProduct: builder.mutation({
      query: ({ id, payload }) => ({
        url: `/products/${id}`,
        method: 'PATCH',
        body: payload
      }),
      invalidatesTags: ['product', 'sale', 'purchases', 'sellerLedger', 'cashbox']
    }),
    bulkDelete: builder.mutation({
      query: (payload) => ({
        url: '/products/bulk-delete',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['product']
    }),
  })
})

export const {
  useGetAllProductsQuery,
  useCountProductsQuery,
  useCreateNewProductMutation,
  useAddStockMutation,
  useDeleteProductMutation,
  useGetSingleProductQuery,
  useUpdateProductMutation,
  useBulkDeleteMutation,
  useGetLowStockAlertsQuery,
  useGetExpiringAlertsQuery } = productApi
