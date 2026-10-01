import { z } from "zod";

export const allowedMediaMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const mediaMimeTypeSchema = z.enum(allowedMediaMimeTypes);

export function mediaSizeLimit(mimeType: string) {
  return mimeType === "application/pdf" ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
}

export const startMediaUploadSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string().trim().min(1).max(240),
  mimeType: mediaMimeTypeSchema,
  size: z.number().int().positive().max(10 * 1024 * 1024),
  alt: z.string().trim().min(1).max(300),
}).superRefine((value, context) => {
  if (value.size > mediaSizeLimit(value.mimeType)) {
    context.addIssue({ code: "custom", path: ["size"], message: "The selected file is too large." });
  }
});

export const completeMediaUploadSchema = z.object({
  id: z.string().uuid(),
  uploadToken: z.string().min(20),
});

export const updateMediaSchema = z.object({
  alt: z.string().trim().min(1).max(300),
  visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
  expectedVersion: z.number().int().positive(),
});
