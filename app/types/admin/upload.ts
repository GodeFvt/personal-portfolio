export interface UploadReservation {
  data: {
    id: string;
    provider: "local" | "vercel-blob" | "cloudflare-r2" | "minio";
    storageKey: string;
    uploadToken: string;
    uploadUrl?: string;
    handleUploadUrl?: string;
    directUpload?: boolean;
  };
}

export type MediaUploadProvider = "vercel-blob" | "cloudflare-r2" | "minio";

export interface MediaUploadProviderOption {
  key: MediaUploadProvider;
  label: string;
  enabled: boolean;
}
