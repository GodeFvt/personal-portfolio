import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { MediaStorage } from "./types";

export function resolveLocalStoragePath(baseDirectory: string, storageKey: string) {
  const base = resolve(baseDirectory);
  const target = resolve(base, storageKey);
  const fromBase = relative(base, target);
  if (!fromBase || fromBase.startsWith("..") || isAbsolute(fromBase)) {
    throw new Error("Invalid media storage key.");
  }
  return target;
}

export function createLocalStorage(baseDirectory: string): MediaStorage {
  return {
    async upload(storageKey, body) {
      const target = resolveLocalStoragePath(baseDirectory, storageKey);
      const temporary = `${target}.${crypto.randomUUID()}.upload`;
      await mkdir(dirname(target), { recursive: true });
      try {
        await writeFile(temporary, body, { flag: "wx" });
        await rename(temporary, target);
      } catch (error) {
        await unlink(temporary).catch(() => undefined);
        throw error;
      }
    },
    async stat(storageKey) {
      try {
        const result = await stat(resolveLocalStoragePath(baseDirectory, storageKey));
        return result.isFile() ? { size: result.size } : null;
      } catch {
        return null;
      }
    },
    async read(storageKey) {
      const target = resolveLocalStoragePath(baseDirectory, storageKey);
      try {
        const result = await stat(target);
        if (!result.isFile()) return null;
        return { stream: createReadStream(target), size: result.size };
      } catch {
        return null;
      }
    },
    async readBuffer(storageKey, maximumSize) {
      const target = resolveLocalStoragePath(baseDirectory, storageKey);
      try {
        const result = await stat(target);
        if (!result.isFile() || result.size > maximumSize) return null;
        return await readFile(target);
      } catch {
        return null;
      }
    },
    async delete(storageKey) {
      await unlink(resolveLocalStoragePath(baseDirectory, storageKey)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    },
  };
}

