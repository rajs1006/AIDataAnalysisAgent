import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import { env } from "@/lib/config/env";
import type { RootState } from "../store/store";

const baseQuery = fetchBaseQuery({
  baseUrl: env.API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithRetry = retry(baseQuery, { maxRetries: 2 });

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRetry,
  tagTypes: ["User", "Connector", "Document", "Workspace", "Billing"],
  endpoints: () => ({}),
});
