import { baseApi } from '../baseApi';
import { EmployeePayload } from '../../../types/employee.types';

const employeeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEmployees: builder.query({
      query: (params: { page?: number; limit?: number; search?: string }) => ({
        url: '/employees',
        method: 'GET',
        params,
      }),
      providesTags: ['employee'],
    }),
    getEmployee: builder.query({
      query: (id) => ({ url: `/employees/${id}`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'employee', id }],
    }),
    createEmployee: builder.mutation({
      query: (body: EmployeePayload) => ({ url: '/employees', method: 'POST', body }),
      invalidatesTags: ['employee'],
    }),
    updateEmployee: builder.mutation({
      query: ({ id, payload }: { id: string; payload: Partial<EmployeePayload> }) => ({
        url: `/employees/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: ['employee'],
    }),
    deleteEmployee: builder.mutation({
      query: (id) => ({ url: `/employees/${id}`, method: 'DELETE' }),
      invalidatesTags: ['employee'],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = employeeApi;
