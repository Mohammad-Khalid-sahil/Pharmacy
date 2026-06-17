import { baseApi } from '../baseApi';

const backupApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBackups: builder.query({
      query: () => ({ url: '/backups', method: 'GET' }),
      providesTags: ['backup'],
    }),
    createBackup: builder.mutation<{ message?: string; statusCode?: number }, void>({
      query: () => ({ url: '/backups', method: 'POST' }),
      invalidatesTags: ['backup'],
    }),
    downloadBackup: builder.mutation<{ blob: Blob; fileName?: string }, string>({
      queryFn: async (id) => {
        if (!window.pharmacyDb?.request) {
          return { error: { status: 500, data: { message: 'Embedded pharmacy database is not available.' } } };
        }

        const result = await window.pharmacyDb.request({ url: `/backups/${id}/download`, method: 'GET' });

        if (!result.success) {
          return { error: { status: result.statusCode, data: result } };
        }

        const data = result.data as { payload?: string; fileName?: string };
        return {
          data: {
            blob: new Blob([data.payload || '{}'], { type: 'application/json;charset=utf-8' }),
            fileName: data.fileName,
          },
        };
      },
    }),
    deleteBackup: builder.mutation({
      query: (id) => ({ url: `/backups/${id}`, method: 'DELETE' }),
      invalidatesTags: ['backup'],
    }),
    restoreBackup: builder.mutation({
      query: (id) => ({ url: `/backups/${id}/restore`, method: 'POST' }),
      invalidatesTags: [
        'backup',
        'product',
        'sale',
        'purchases',
        'expenses',
        'cashbox',
        'moneyTransfer',
        'employee',
        'salary',
        'seller',
        'customer',
      ],
    }),
  }),
});

export const {
  useGetBackupsQuery,
  useCreateBackupMutation,
  useDownloadBackupMutation,
  useDeleteBackupMutation,
  useRestoreBackupMutation,
} = backupApi;
