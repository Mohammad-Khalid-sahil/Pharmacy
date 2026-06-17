import { baseApi } from "../baseApi";

export const alertApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAlerts: builder.query({
      query: () => ({
        url: '/alerts',
        method: 'GET',
        params: { limit: 1000 },
      }),
      providesTags: ['alert'],
      keepUnusedDataFor: 0,
    }),
    bulkDeleteAlerts: builder.mutation({
      query: (payload) => ({
        url: '/alerts/bulk-delete',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['alert', 'product'],
    }),
  })
})

export const {
  useGetAlertsQuery,
  useBulkDeleteAlertsMutation,
} = alertApi
