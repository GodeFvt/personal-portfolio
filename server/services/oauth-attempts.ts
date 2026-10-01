import { createError } from "h3";
import type { Prisma } from "../../generated/prisma/client";

export async function claimOAuthAttempt(
  transaction: Prisma.TransactionClient,
  stateHash: string,
  now = new Date(),
) {
  const attempt = await transaction.oAuthAttempt.findUnique({
    where: { stateHash },
    include: { provider: true },
  });
  if (!attempt || attempt.consumedAt || attempt.expiresAt.getTime() <= now.getTime()) {
    throw createError({ statusCode: 401, statusMessage: "OAuth attempt is invalid or expired." });
  }
  const consumed = await transaction.oAuthAttempt.updateMany({
    where: { id: attempt.id, consumedAt: null },
    data: { consumedAt: now },
  });
  if (consumed.count !== 1) {
    throw createError({ statusCode: 401, statusMessage: "OAuth attempt was already used." });
  }
  return attempt;
}
