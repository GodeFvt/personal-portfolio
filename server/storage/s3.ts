import { HttpStatus } from "../utils/http-status";
import {
  DeleteObjectCommand,
  CreateBucketCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import type { MediaStorage } from "./types";

export interface S3StorageOptions {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  autoCreateBucket?: boolean;
  publicEndpoint?: string;
}

function nodeStream(body: unknown) {
  if (body instanceof Readable) return body;
  if (body instanceof ReadableStream) return Readable.fromWeb(body as never);
  throw new Error("The object store returned an unsupported response stream.");
}

export function createS3Storage(options: S3StorageOptions): MediaStorage {
  const client = new S3Client({
    endpoint: options.endpoint,
    region: options.region,
    forcePathStyle: options.forcePathStyle,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });
  const uploadClient = options.publicEndpoint
    ? new S3Client({
        endpoint: options.publicEndpoint,
        region: options.region,
        forcePathStyle: options.forcePathStyle,
        credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
      })
    : client;
  const object = (storageKey: string) => ({ Bucket: options.bucket, Key: storageKey });
  let bucketReady: Promise<void> | undefined;
  const ensureBucket = async () => {
    if (!options.autoCreateBucket) return;
    bucketReady ||= client.send(new CreateBucketCommand({ Bucket: options.bucket })).then(() => undefined).catch((error: { name?: string; $metadata?: { httpStatusCode?: number } }) => {
      if (error.name === "BucketAlreadyOwnedByYou" || error.name === "BucketAlreadyExists" || error.$metadata?.httpStatusCode === 409) return;
      bucketReady = undefined;
      throw error;
    });
    await bucketReady;
  };

  return {
    async createUploadUrl(storageKey, contentType, expiresInSeconds) {
      await ensureBucket();
      return getSignedUrl(uploadClient, new PutObjectCommand({ ...object(storageKey), ContentType: contentType }), { expiresIn: expiresInSeconds });
    },
    async upload(storageKey, body, contentType) {
      await ensureBucket();
      await client.send(new PutObjectCommand({ ...object(storageKey), Body: body, ContentType: contentType, ContentLength: body.length }));
    },
    async stat(storageKey) {
      await ensureBucket();
      try {
        const result = await client.send(new HeadObjectCommand(object(storageKey)));
        return typeof result.ContentLength === "number" ? { size: result.ContentLength, contentType: result.ContentType } : null;
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === HttpStatus.NOT_FOUND) return null;
        throw error;
      }
    },
    async read(storageKey) {
      await ensureBucket();
      try {
        const result = await client.send(new GetObjectCommand(object(storageKey)));
        if (!result.Body || typeof result.ContentLength !== "number") return null;
        return { stream: nodeStream(result.Body), size: result.ContentLength };
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === HttpStatus.NOT_FOUND) return null;
        throw error;
      }
    },
    async readBuffer(storageKey, maximumSize) {
      await ensureBucket();
      const result = await client.send(new GetObjectCommand(object(storageKey))).catch((error: { $metadata?: { httpStatusCode?: number } }) => {
        if (error.$metadata?.httpStatusCode === 404) return null;
        throw error;
      });
      if (!result?.Body || (typeof result.ContentLength === "number" && result.ContentLength > maximumSize)) return null;
      const stream = nodeStream(result.Body);
      const chunks: Buffer[] = [];
      let total = 0;
      for await (const chunk of stream) {
        const buffer = Buffer.from(chunk);
        total += buffer.length;
        if (total > maximumSize) {
          stream.destroy();
          return null;
        }
        chunks.push(buffer);
      }
      return Buffer.concat(chunks);
    },
    async delete(storageKey) {
      await ensureBucket();
      await client.send(new DeleteObjectCommand(object(storageKey)));
    },
  };
}
