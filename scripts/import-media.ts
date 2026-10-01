import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { put } from "@vercel/blob";
import {
  MediaProvider,
  MediaStatus,
  MediaVisibility,
  PrismaClient,
} from "../generated/prisma/client";
import { createLocalStorage } from "../server/storage/local";

const dryRun = process.argv.includes("--dry-run");
const apply = process.argv.includes("--apply");
if (dryRun === apply) throw new Error("Choose exactly one mode: --dry-run or --apply.");

const prefixArgument = process.argv.findIndex((argument) => argument === "--prefix");
const prefix = prefixArgument >= 0 ? process.argv[prefixArgument + 1] : "preview";
if (!prefix || !/^[a-z0-9][a-z0-9/_-]*$/i.test(prefix)) {
  throw new Error("--prefix must contain only letters, numbers, slash, underscore, or dash.");
}
const storageProvider = process.env.STORAGE_PROVIDER === "vercel-blob" ? "vercel-blob" : "local";

const root = resolve(import.meta.dirname, "..");
const candidates = [
  {
    source: "public/images/profile.jpg",
    kind: "portrait",
    expectedMime: "image/jpeg",
    maxBytes: 5 * 1024 * 1024,
    mediaId: "10000000-0000-4000-8000-000000000001",
  },
  {
    source: "public/resume/phuttinan-resume.pdf",
    kind: "resume",
    expectedMime: "application/pdf",
    maxBytes: 10 * 1024 * 1024,
    mediaId: "10000000-0000-4000-8000-000000000002",
  },
];

function signatureMatches(mime: string, bytes: Buffer) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

const report = [];
for (const candidate of candidates) {
  const absolutePath = resolve(root, candidate.source);
  const fileStat = await stat(absolutePath);
  const bytes = await readFile(absolutePath);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const validSignature = signatureMatches(candidate.expectedMime, bytes);
  const validSize = fileStat.size <= candidate.maxBytes;
  report.push({
    ...candidate,
    originalName: basename(absolutePath),
    bytes: fileStat.size,
    checksumSha256: checksum,
    validSignature,
    validSize,
    absolutePath,
    proposedStorageKey: `${prefix}/seed/${candidate.mediaId}/${basename(absolutePath)}`,
    proposedProvider: storageProvider,
    result: validSignature && validSize ? "ready-to-import" : "rejected",
  });
}

console.table(report.map(({ checksumSha256: _checksum, absolutePath: _path, ...item }) => item));
if (report.some((item) => item.result === "rejected")) process.exitCode = 1;

if (apply && !process.exitCode) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const connectionString =
    process.env.DIRECT_URL ?? process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL;
  if (storageProvider === "vercel-blob" && !token) throw new Error("BLOB_READ_WRITE_TOKEN is required for a Vercel Blob import.");
  if (!connectionString?.match(/^postgres(?:ql)?:\/\//)) {
    throw new Error("A direct PostgreSQL URL is required for media import.");
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const localStorage = createLocalStorage(process.env.LOCAL_STORAGE_DIR ?? ".data/media");
  try {
    for (const item of report) {
      const bytes = await readFile(item.absolutePath);
      const storageKey = storageProvider === "vercel-blob"
        ? (await put(item.proposedStorageKey, bytes, {
            access: "private",
            addRandomSuffix: false,
            allowOverwrite: true,
            contentType: item.expectedMime,
            token,
          })).pathname
        : item.proposedStorageKey;
      if (storageProvider === "local") {
        await localStorage.delete(storageKey);
        await localStorage.upload(storageKey, bytes, item.expectedMime);
      }

      await prisma.mediaAsset.upsert({
        where: { id: item.mediaId },
        update: {
          provider: storageProvider === "vercel-blob" ? MediaProvider.VERCEL_BLOB : MediaProvider.LOCAL,
          storageKey,
          originalName: item.originalName,
          mimeType: item.expectedMime,
          size: BigInt(item.bytes),
          alt: item.kind === "portrait" ? "Portrait of Phuttinan" : "Phuttinan resume",
          visibility: MediaVisibility.PUBLIC,
          status: MediaStatus.READY,
        },
        create: {
          id: item.mediaId,
          provider: storageProvider === "vercel-blob" ? MediaProvider.VERCEL_BLOB : MediaProvider.LOCAL,
          storageKey,
          originalName: item.originalName,
          mimeType: item.expectedMime,
          size: BigInt(item.bytes),
          alt: item.kind === "portrait" ? "Portrait of Phuttinan" : "Phuttinan resume",
          visibility: MediaVisibility.PUBLIC,
          status: MediaStatus.READY,
        },
      });
    }

    await prisma.profile.update({
      where: { id: "00000000-0000-4000-8000-000000000002" },
      data: {
        portraitMediaId: candidates[0].mediaId,
        resumeMediaId: candidates[1].mediaId,
      },
    });
    console.log(`Imported ${report.length} ${storageProvider} objects under ${prefix}/ and linked them to the profile.`);
  } finally {
    await prisma.$disconnect();
  }
}
