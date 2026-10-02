import { createMediaApi } from "~/lib/api/admin/media";
import type {
  MediaUploadProvider,
  MediaUploadProviderOption,
} from "~/types/admin/upload";
import { upload } from "@vercel/blob/client";
import axios from "axios";
import { apiMessage } from "~/lib/api/client";
import { mediaMimeTypeSchema } from "~~/shared/schemas/media";

export async function uploadAdminMedia(
  file: File,
  alt: string,
  csrfToken: string,
  provider?: MediaUploadProvider,
) {
  const api = createMediaApi(useNuxtApp().$api);
  const id = crypto.randomUUID();
  const reservation = await api.reserveUpload({
    headers: { "x-csrf-token": csrfToken },
    data: {
      id,
      originalName: file.name,
      mimeType: mediaMimeTypeSchema.parse(file.type),
      size: file.size,
      alt,
      provider,
    },
  });
  const details = reservation.data;
  if (details.provider !== "vercel-blob") {
    // Signed storage URLs use a separate Axios request without session/CSRF defaults.
    try {
      await axios.request({
        url: details.uploadUrl!,
        method: details.directUpload ? "PUT" : "POST",
        withCredentials: false,
        headers: {
          "content-type": file.type,
          ...(!details.directUpload
            ? {
                "x-csrf-token": csrfToken,
                "x-media-upload-token": details.uploadToken,
              }
            : {}),
        },
        data: file,
      });
    } catch (error) {
      throw new Error(
        apiMessage(
          error,
          "The file could not be uploaded to the selected storage provider.",
        ),
      );
    }
  } else {
    await upload(details.storageKey, file, {
      access: "private",
      handleUploadUrl: details.handleUploadUrl!,
      clientPayload: JSON.stringify({
        id: details.id,
        uploadToken: details.uploadToken,
      }),
      headers: { "x-csrf-token": csrfToken },
    });
  }
  return await api.completeUpload({
    headers: { "x-csrf-token": csrfToken },
    data: { id: details.id, uploadToken: details.uploadToken },
  });
}

export type {
  MediaUploadProvider,
  MediaUploadProviderOption,
} from "~/types/admin/upload";
