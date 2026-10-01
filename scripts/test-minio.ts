import { createS3Storage } from "../server/storage/s3";

const storage = createS3Storage({
  endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9000",
  publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT,
  region: "us-east-1",
  bucket: process.env.MINIO_BUCKET ?? "portfolio-media",
  accessKeyId: process.env.MINIO_ACCESS_KEY ?? "portfolio-local",
  secretAccessKey: process.env.MINIO_SECRET_KEY ?? "portfolio-local-secret",
  forcePathStyle: true,
  autoCreateBucket: true,
});

const key = `integration/${crypto.randomUUID()}.txt`;
const body = Buffer.from("minio-ok");

try {
  const uploadUrl = await storage.createUploadUrl?.(key, "text/plain", 60);
  if (!uploadUrl) throw new Error("MinIO did not create a presigned upload URL.");
  const response = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": "text/plain" }, body });
  if (!response.ok) throw new Error(`MinIO presigned upload failed with ${response.status}.`);
  const info = await storage.stat(key);
  const read = await storage.readBuffer(key, 100);
  if (info?.size !== body.length || read?.toString() !== body.toString()) {
    throw new Error("MinIO upload/read round trip did not preserve the object.");
  }
  await storage.delete(key);
  if (await storage.stat(key)) throw new Error("MinIO delete did not remove the object.");
  console.log("MinIO upload/read/delete round trip passed.");
} finally {
  await storage.delete(key).catch(() => undefined);
}
