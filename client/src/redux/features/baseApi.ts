import { BaseQueryFn, FetchArgs, createApi } from "@reduxjs/toolkit/query/react";
import { ensureDefaultAuth } from "../services/authSlice";
import { offlineBaseQuery } from "./offlineBaseQuery";

const customBaseQuery: BaseQueryFn<FetchArgs | string, unknown, unknown> = async (args, api, extraOptions): Promise<any> => {
  const result = await offlineBaseQuery(args, api, extraOptions)

  if (result?.error?.status === 401) {
    api.dispatch(ensureDefaultAuth())
  }

  return result
}


export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: customBaseQuery,
  tagTypes: [
    'product',
    'sale',
    'user',
    'seller',
    'purchases',
    'expenses',
    'customer',
    'customerDebtorAccount',
    'customerPayment',
    'customerLedger',
    'sellerPayment',
    'sellerLedger',
    'cashbox',
    'cashboxPersonAccount',
    'moneyTransfer',
    'saleReturn',
    'prescription',
    'employee',
    'salary',
    'activityLog',
    'backup',
    'alert',
  ],
  endpoints: () => ({})
})
