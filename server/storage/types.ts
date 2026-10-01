import type { Readable } from "node:stream";

export interface StoredMediaObject {
  size: number;
  contentType?: string;
}

export interface MediaStorage {
  createUploadUrl?(storageKey: string, contentType: string, expiresInSeconds: number): Promise<string>;
  upload(storageKey: string, body: Buffer, contentType: string): Promise<void>;
  stat(storageKey: string): Promise<StoredMediaObject | null>;
  read(storageKey: string): Promise<{ stream: Readable | ReadableStream<Uint8Array>; size: number } | null>;
  readBuffer(storageKey: string, maximumSize: number): Promise<Buffer | null>;
  delete(storageKey: string): Promise<void>;
}

