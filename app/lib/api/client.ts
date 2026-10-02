import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosRequestConfig,
} from "axios";

export type ApiRequestOptions = Omit<
  AxiosRequestConfig,
  "url" | "baseURL" | "adapter"
>;
export type ApiMutationOptions<T> = Omit<
  ApiRequestOptions,
  "data" | "method"
> & { data: T };

export function createApiClient(
  adapter?: AxiosAdapter,
  getCsrfToken?: () => string | undefined,
) {
  const transport = axios.create({ adapter, withCredentials: true });

  async function raw<T>(url: string, options: ApiRequestOptions = {}) {
    // This client carries session credentials and is only for our own API.
    const path = new URL(url, "http://portfolio.local");
    if (
      !url.startsWith("/api/") ||
      path.origin !== "http://portfolio.local" ||
      !path.pathname.startsWith("/api/")
    ) {
      throw new Error("API requests must use a local /api/ path.");
    }
    const headers = AxiosHeaders.from(
      options.headers as AxiosHeaders | undefined,
    );
    const csrfToken = getCsrfToken?.();
    if (
      csrfToken &&
      !["get", "head", "options"].includes(
        (options.method ?? "get").toLowerCase(),
      )
    ) {
      headers.set("x-csrf-token", csrfToken);
    }
    try {
      return await transport.request<T>({ ...options, headers, url });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ApiError(
          error.message,
          error.response?.status,
          error.response?.data,
          error,
        );
      }
      throw error;
    }
  }

  async function request<T>(
    url: string,
    options?: ApiRequestOptions,
  ): Promise<T> {
    return (await raw<T>(url, options)).data;
  }

  return { request, raw };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly data?: unknown,
    public override readonly cause?: AxiosError,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiMessage(
  error: unknown,
  fallback = "The request could not be completed.",
) {
  const data =
    error instanceof ApiError
      ? error.data
      : axios.isAxiosError(error)
        ? error.response?.data
        : undefined;
  const message = (data as { error?: { message?: unknown } } | undefined)?.error
    ?.message;
  return typeof message === "string"
    ? message
    : error instanceof ApiError
      ? fallback
      : error instanceof Error
        ? error.message
        : fallback;
}
