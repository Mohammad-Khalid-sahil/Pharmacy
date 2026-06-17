import { baseApi } from '../baseApi';
import { CreatePrescriptionPayload } from '../../../types/prescription.types';

const prescriptionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPrescriptions: builder.query({
      query: (params: { page?: number; limit?: number; search?: string; customer?: string }) => ({
        url: '/prescriptions',
        method: 'GET',
        params,
      }),
      providesTags: ['prescription'],
    }),
    getPrescription: builder.query({
      query: (id) => ({ url: `/prescriptions/${id}`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'prescription', id }],
    }),
    createPrescription: builder.mutation({
      query: (body: CreatePrescriptionPayload) => ({
        url: '/prescriptions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['prescription'],
    }),
    deletePrescription: builder.mutation({
      query: (id) => ({ url: `/prescriptions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['prescription'],
    }),
  }),
});

export const {
  useGetPrescriptionsQuery,
  useGetPrescriptionQuery,
  useCreatePrescriptionMutation,
  useDeletePrescriptionMutation,
} = prescriptionApi;
