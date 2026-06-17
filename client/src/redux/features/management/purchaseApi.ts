import { baseApi } from "../baseApi";

const purchaseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllPurchases: builder.query({
      query: (query) => ({
        url: '/purchases',
        method: 'GET',
        params: query
      }),
      providesTags: ['purchases']
    }),

    createPurchase: builder.mutation({
      query: (payload) => ({
        url: '/purchases',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['purchases', 'product', 'sellerLedger', 'cashbox']
    }),

    deletePurchase: builder.mutation({
      query: (id) => ({
        url: '/purchases/' + id,
        method: 'DELETE',
      }),
      invalidatesTags: ['purchases', 'product', 'sellerLedger', 'cashbox']
    }),
    updatePurchase: builder.mutation({
      query: ({ id, payload }) => ({
        url: '/purchases/' + id,
        method: 'PATCH',
        body: payload
      }),
      invalidatesTags: ['purchases', 'product', 'sellerLedger', 'cashbox']
    }),
  })
})

export const { useGetAllPurchasesQuery, useCreatePurchaseMutation, useDeletePurchaseMutation, useUpdatePurchaseMutation } = purchaseApi
