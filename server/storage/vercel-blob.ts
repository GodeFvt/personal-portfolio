import { HttpStatus } from "../utils/http-status";
import { del, get, head, put } from "@vercel/blob";
import { Readable } from "node:stream";
import type { MediaStorage } from "./types";

function options(token?: string) {
  return token ? { token } : {};
}

export function createVercelBlobStorage(token?: string): MediaStorage {
  return {
    async upload(storageKey, body, contentType) {
      await put(storageKey, body, {
        access: "private",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: false,
        ...options(token),
      });
    },
    async stat(storageKey) {
      try {
        const result = await head(storageKey, options(token));
        return { size: result.size, contentType: result.contentType };
      } catch {
        return null;
      }
    },
    async read(storageKey) {
      const result = await get(storageKey, { access: "private", useCache: false, ...options(token) });
      if (!result || result.statusCode !== HttpStatus.OK) return null;
      return { stream: Readable.fromWeb(result.stream as never), size: result.blob.size };
    },
    async readBuffer(storageKey, maximumSize) {
      const result = await get(storageKey, { access: "private", useCache: false, ...options(token) });
      if (!result || result.statusCode !== HttpStatus.OK || result.blob.size > maximumSize) return null;
      const chunks: Buffer[] = [];
      let total = 0;
      for await (const chunk of Readable.fromWeb(result.stream as never)) {
        const buffer = Buffer.from(chunk);
        total += buffer.length;
        if (total > maximumSize) return null;
        chunks.push(buffer);
      }
      return Buffer.concat(chunks);
    },
    async delete(storageKey) {
      await del(storageKey, options(token));
    },
  };
}

