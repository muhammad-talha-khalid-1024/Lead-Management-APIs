import { Response } from "express";
import prisma from "../../config/database";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";

export async function timeline(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthenticated user."
      });
    }

    const leadId = Number(
      req.params.id
    );

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(422).json({
        success: false,
        message: "Invalid lead."
      });
    }

    const lead = await prisma.lead.findUnique({
        where: {
          id: leadId
        }
      });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "No lead found."
      });
    }

    if (req.user.roleSlug === "agent" && lead.assignedAgentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this lead."
      });
    }

    if (
      (
        req.user.roleSlug === "lead-generation" ||
        req.user.roleSlug === "lead-generation-supervisor"
      ) &&
      lead.createdById !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this lead."
      });
    }

    const timeline = await prisma.leadTimeline.findMany({
        where: {
          leadId
        },

        orderBy: {
          createdAt: "asc"
        },

        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

    return res.status(200).json({
      success: true,
      data: timeline
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error
    });
  }
}