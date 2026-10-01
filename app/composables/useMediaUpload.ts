import { upload } from "@vercel/blob/client";

interface UploadReservation {
  data: {
    id: string;
    provider: "local" | "vercel-blob";
    storageKey: string;
    uploadToken: string;
    uploadUrl?: string;
    handleUploadUrl?: string;
  };
}

export async function uploadAdminMedia(file: File, alt: string, csrfToken: string) {
  const id = crypto.randomUUID();
  const reservation = await $fetch<UploadReservation>("/api/admin/media/upload", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    body: { id, originalName: file.name, mimeType: file.type, size: file.size, alt },
  });
  const details = reservation.data;
  if (details.provider === "local") {
    const response = await fetch(details.uploadUrl!, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": file.type,
        "x-csrf-token": csrfToken,
        "x-media-upload-token": details.uploadToken,
      },
      body: file,
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error?.message ?? "The file could not be uploaded.");
    }
  } else {
    await upload(details.storageKey, file, {
      access: "private",
      handleUploadUrl: details.handleUploadUrl!,
      clientPayload: JSON.stringify({ id: details.id, uploadToken: details.uploadToken }),
      headers: { "x-csrf-token": csrfToken },
    });
  }
  return await $fetch<{ data: Record<string, unknown> }>("/api/admin/media/complete", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    body: { id: details.id, uploadToken: details.uploadToken },
  });
}

