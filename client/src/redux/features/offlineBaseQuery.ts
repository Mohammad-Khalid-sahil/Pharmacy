import { BaseQueryFn, FetchArgs } from '@reduxjs/toolkit/query';

type QueryArgs = FetchArgs | string;
type LocalDbResponse = {
  statusCode: number;
  success: boolean;
  message?: string;
  data: unknown;
  meta?: Record<string, unknown>;
};

declare global {
  interface Window {
    pharmacyDb?: {
      request: (args: QueryArgs) => Promise<LocalDbResponse>;
    };
    pharmacyZoom?: {
      get: () => Promise<number>;
      set: (factor: number) => Promise<number>;
    };
    pharmacyReport?: {
      savePdf: (fileName: string) => Promise<{ canceled?: boolean; filePath?: string }>;
    };
    auth?: {
      login: (body: { email: string; password: string }) => Promise<{
        success: boolean;
        message?: string;
        token?: string;
        user?: Record<string, unknown>;
      }>;
    };
  }
}

export const offlineBaseQuery: BaseQueryFn<QueryArgs, unknown, { status: number; data: unknown }> = async (args) => {
  if (!window.pharmacyDb?.request) {
    return {
      error: {
        status: 500,
        data: {
          statusCode: 500,
          success: false,
          message: 'Embedded pharmacy database is not available. Open the app through Electron.',
          data: null,
        },
      },
    };
  }

  const language = localStorage.getItem('language');
  const resolvedLanguage = language === 'en' || language === 'ps' || language === 'fa' ? language : 'fa';
  const requestArgs = typeof args === 'string'
    ? { url: args, method: 'GET', params: { language: resolvedLanguage } }
    : {
        ...args,
        params: { ...(args.params || {}), language: resolvedLanguage },
        body: args.body && typeof args.body === 'object'
          ? { ...args.body, language: resolvedLanguage }
          : args.body,
      };

  const result = await window.pharmacyDb.request(requestArgs);

  if (!result.success) {
    return { error: { status: result.statusCode, data: result } };
  }

  return { data: result };
};
