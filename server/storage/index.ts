import { MediaProvider } from "~~/generated/prisma/client";
import { getServerEnv } from "../utils/env";
import { createLocalStorage } from "./local";
import type { MediaStorage } from "./types";
import { createVercelBlobStorage } from "./vercel-blob";

export function configuredMediaProvider() {
  return getServerEnv().STORAGE_PROVIDER === "vercel-blob"
    ? MediaProvider.VERCEL_BLOB
    : MediaProvider.LOCAL;
}

export function mediaStorage(provider: MediaProvider): MediaStorage {
  const env = getServerEnv();
  return provider === MediaProvider.VERCEL_BLOB
    ? createVercelBlobStorage(env.BLOB_READ_WRITE_TOKEN)
    : createLocalStorage(env.LOCAL_STORAGE_DIR);
}

