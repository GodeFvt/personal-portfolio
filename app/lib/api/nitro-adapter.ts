import axios, { AxiosError, AxiosHeaders, type AxiosAdapter } from "axios";

/** Bridge Axios to Nitro's request-scoped in-process fetch during SSR. */
export function createNitroAdapter(
  eventFetch: (url: string, init?: RequestInit) => Promise<Response>,
): AxiosAdapter {
  return async (config) => {
    const result = await eventFetch(axios.getUri(config), {
      method: config.method?.toUpperCase(),
      headers: config.headers.toJSON() as Record<string, string>,
      body: config.data,
      signal: config.signal as AbortSignal | undefined,
    });
    const response = {
      data: await result.text(),
      status: result.status,
      statusText: result.statusText,
      headers: new AxiosHeaders(Object.fromEntries(result.headers.entries())),
      config,
    };
    if (config.validateStatus && !config.validateStatus(response.status)) {
      throw new AxiosError(
        `Request failed with status code ${response.status}`,
        response.status >= 500 ? "ERR_BAD_RESPONSE" : "ERR_BAD_REQUEST",
        config,
        undefined,
        response,
      );
    }
    return response;
  };
}
