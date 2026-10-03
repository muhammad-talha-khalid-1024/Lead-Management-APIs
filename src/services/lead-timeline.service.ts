import prisma from "../config/database";
import { LeadTimelineType, Prisma } from "@prisma/client";

export async function createLeadTimeline(
  leadId: number,
  performedById: number,
  type: LeadTimelineType,
  metadata?: Prisma.InputJsonValue
) {
  return prisma.leadTimeline.create({
    data: {
      leadId,
      performedById,
      type,
      metadata: metadata ?? undefined
    }
  });
}

export async function createLeadTimelineTransaction(
  transaction: Prisma.TransactionClient,
  leadId: number,
  performedById: number,
  type: LeadTimelineType,
  metadata?: Prisma.InputJsonValue
) {
  return transaction.leadTimeline.create({
    data: {
      leadId,
      performedById,
      type,
      metadata: metadata ?? undefined
    }
  });
}