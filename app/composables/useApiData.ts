import type { ApiRequestOptions } from "~/lib/api/client";

interface ApiDataOptions {
  key?: string;
  lazy?: boolean;
  query?: Record<string, unknown>;
}

/** Nuxt owns SSR payload hydration and loading state; Axios owns API requests. */
export function useApiData<T>(
  url: MaybeRefOrGetter<string>,
  options: ApiDataOptions = {},
) {
  const { $api } = useNuxtApp();
  const key =
    options.key ?? `api:${toValue(url)}:${JSON.stringify(options.query ?? {})}`;
  return useAsyncData<T>(
    key,
    (_app, { signal }) =>
      $api.request<T>(toValue(url), {
        params: options.query,
        signal,
      } satisfies ApiRequestOptions),
    { lazy: options.lazy ?? false },
  );
}
