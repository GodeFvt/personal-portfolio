import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import {
  portfolioTabSnapshotSchema,
  type savePageContentSchema,
} from "../../shared/schemas/admin-content";
import type { z } from "zod";
import { ApiErrorCode } from "../../shared/schemas/api";
import { AppError } from "../utils/app-error";
import { HttpStatus } from "../utils/http-status";
import { useDatabase } from "../utils/db";

function conflict(message: string) {
  return new AppError({
    statusCode: HttpStatus.CONFLICT,
    code: ApiErrorCode.VERSION_CONFLICT,
    message,
  });
}

function transactionFailure(error: unknown): never {
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === "P2034"
  ) {
    throw conflict(
      "This page changed during the request. Reload and try again.",
    );
  }
  throw error;
}

export async function savePageContent(
  tabId: string,
  input: z.infer<typeof savePageContentSchema>,
  actorId: string,
  requestId?: string,
  db: PrismaClient = useDatabase(),
) {
  return db
    .$transaction(
      async (tx) => {
        const tab = await tx.portfolioTab.findUnique({
          where: { id: tabId },
          include: { blocks: { orderBy: { sortOrder: "asc" } } },
        });
        if (!tab)
          throw new AppError({
            statusCode: HttpStatus.NOT_FOUND,
            code: ApiErrorCode.NOT_FOUND,
            message: "Page not found.",
          });
        if (tab.version !== input.expectedVersion)
          throw conflict("This page changed. Reload before saving.");
        const version = tab.version + 1;
        const draft = await tx.contentRevision.findUnique({
          where: {
            entityType_entityId_version: {
              entityType: "PortfolioTab",
              entityId: tabId,
              version,
            },
          },
        });
        const base =
          draft && !draft.publishedAt
            ? portfolioTabSnapshotSchema.parse(draft.snapshot)
            : tab;
        const snapshot = portfolioTabSnapshotSchema.parse({
          ...base,
          template: input.template,
          blocks: input.blocks,
        });
        const revision = await tx.contentRevision.upsert({
          where: {
            entityType_entityId_version: {
              entityType: "PortfolioTab",
              entityId: tabId,
              version,
            },
          },
          create: {
            entityType: "PortfolioTab",
            entityId: tabId,
            version,
            snapshot: snapshot as Prisma.InputJsonValue,
            authorId: actorId,
          },
          update: {
            snapshot: snapshot as Prisma.InputJsonValue,
            authorId: actorId,
            publishedAt: null,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: "content.page.draft.saved",
            entityType: "PortfolioTab",
            entityId: tabId,
            metadata: { version, requestId },
          },
        });
        return revision;
      },
      { isolationLevel: "Serializable" },
    )
    .catch(transactionFailure);
}

export async function deletePortfolioTab(
  tabId: string,
  expectedVersion: number,
  actorId: string,
  requestId?: string,
  db: PrismaClient = useDatabase(),
) {
  return db
    .$transaction(
      async (tx) => {
        const tab = await tx.portfolioTab.findUnique({ where: { id: tabId } });
        if (!tab)
          throw new AppError({
            statusCode: HttpStatus.NOT_FOUND,
            code: ApiErrorCode.NOT_FOUND,
            message: "Tab not found.",
          });
        if (tab.version !== expectedVersion)
          throw conflict("This tab changed. Reload before deleting.");
        const defaultSettings = await tx.siteSettings.count({
          where: { defaultTabId: tabId },
        });
        if (defaultSettings)
          throw conflict(
            "Choose another default tab in Content → Settings before deleting this tab.",
          );
        await tx.contentRevision.deleteMany({
          where: { entityType: "PortfolioTab", entityId: tabId },
        });
        await tx.portfolioTab.delete({ where: { id: tabId } });
        await tx.auditLog.create({
          data: {
            actorId,
            action: "navigation.tab.deleted",
            entityType: "PortfolioTab",
            entityId: tabId,
            metadata: { slug: tab.slug, label: tab.label, requestId },
          },
        });
        return { deleted: true };
      },
      { isolationLevel: "Serializable" },
    )
    .catch(transactionFailure);
}
