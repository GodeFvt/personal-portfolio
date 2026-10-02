import type {
  MediaUploadPayload,
  MediaCompletePayload,
  MediaUpdatePayload,
} from "~~/shared/types/admin-api";
import type {
  ApiClient,
  ApiRequestOptions,
  ApiMutationOptions,
} from "../client";
import type { UploadReservation } from "~/types/admin/upload";

export function createMediaApi(client: ApiClient) {
  return {
    pathMedia: "/api/admin/media",
    pathProviders: "/api/admin/media/providers",
    createSignedLink: (
      id: string,
      options: ApiMutationOptions<{ lifetimeSeconds: number }>,
    ) =>
      client.request<{ data: { url: string; expiresAt: string } }>(
        `/api/admin/media/${id}/signed-link`,
        { ...options, method: "POST" },
      ),
    update: (id: string, options: ApiMutationOptions<MediaUpdatePayload>) =>
      client.request<unknown>(`/api/admin/media/${id}`, {
        ...options,
        method: "PATCH",
      }),
    remove: (id: string, options: ApiRequestOptions = {}) =>
      client.request<unknown>(`/api/admin/media/${id}`, {
        ...options,
        method: "DELETE",
      }),
    cleanup: (options: ApiRequestOptions = {}) =>
      client.request<{ data: { scanned: number; deleted: number } }>(
        "/api/admin/media/cleanup",
        { ...options, method: "POST" },
      ),
    pickerPath: (kind: "image" | "pdf") =>
      `/api/admin/media?status=READY&kind=${kind}`,
    reserveUpload: (options: ApiMutationOptions<MediaUploadPayload>) =>
      client.request<UploadReservation>("/api/admin/media/upload", {
        ...options,
        method: "POST",
      }),
    completeUpload: (options: ApiMutationOptions<MediaCompletePayload>) =>
      client.request<{ data: Record<string, unknown> }>(
        "/api/admin/media/complete",
        { ...options, method: "POST" },
      ),
  };
}
