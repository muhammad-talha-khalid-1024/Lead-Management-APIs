import { LeadStatus, NotQualifiedReason, Prisma } from "@prisma/client";
import prisma from "../config/database";

const allowedTransitions: Record<LeadStatus, LeadStatus[]> = {
  NEW: [
    LeadStatus.LEAD_GENERATION_FOLLOW_UP
  ],

  LEAD_GENERATION_FOLLOW_UP: [
    LeadStatus.QUALIFIED
  ],

  QUALIFIED: [
    LeadStatus.PENDING_AGENT_ASSIGNMENT
  ],

  PENDING_AGENT_ASSIGNMENT: [
    LeadStatus.AGENT_ASSIGNED
  ],

  AGENT_ASSIGNED: [
    LeadStatus.CONVERTED_PENDING_APPROVAL,
    LeadStatus.DROPPED_PENDING_APPROVAL
  ],

  CONVERTED_PENDING_APPROVAL: [
    LeadStatus.CLOSED
  ],

  DROPPED_PENDING_APPROVAL: [
    LeadStatus.CLOSED
  ],

  CLOSED: []
};

interface LeadAccess {
  userId: number;
  roleSlug: string;
}

function buildLeadWhere(
  access: LeadAccess,
  additionalWhere?: Prisma.LeadWhereInput
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {
    ...additionalWhere
  };

  switch (access.roleSlug) {
    case "lead-generation":
    case "lead-generation-supervisor":
      where.createdById = access.userId;
      break;

    case "agent":
      where.assignedAgentId = access.userId;
      break;

    case "agent-supervisor":
      // Agent supervisor can retrieve all leads.
      break;

    default:
      throw new Error("UNAUTHORIZED_ROLE");
  }

  return where;
}

export function isValidTransition(
  currentStatus: LeadStatus,
  newStatus: LeadStatus
): boolean {
  return allowedTransitions[currentStatus].includes(
    newStatus
  );
}

export async function findDuplicateLeads(
  data: Prisma.LeadCreateInput,
  userId: number
) {
  const duplicateConditions: Prisma.LeadWhereInput[] = [];

  if (data.phone) {
    duplicateConditions.push({
      phone: data.phone
    });
  }

  if (data.email) {
    duplicateConditions.push({
      email: data.email
    });
  }

  if (data.whatsappNumber) {
    duplicateConditions.push({
      whatsappNumber: data.whatsappNumber
    });
  }

  if (duplicateConditions.length === 0) {
    return [];
  }

  const existingLeads = await prisma.lead.findMany({
    where: {
      createdById: userId,
      OR: duplicateConditions
    },
    select: {
      id: true,
      phone: true,
      email: true,
      whatsappNumber: true
    },
    orderBy: {
      id: "asc"
    }
  });

  return existingLeads;
}

export async function createLead(
  data: Prisma.LeadCreateInput,
  userId: number,
  forceCreate = false
) {
  if (!forceCreate) {
    const existingLeads = await findDuplicateLeads(
      data,
      userId
    );

    if (existingLeads.length > 0) {
      return {
        duplicate: true,
        existingLeadIds: existingLeads.map(
          lead => lead.id
        )
      };
    }
  }

  const lead = await prisma.$transaction(async (transaction) => {
    const newLead = await transaction.lead.create({
      data: {
        ...data,
        createdBy: {
          connect: {
            id: userId
          }
        }
      }
    });

    await transaction.leadTimeline.create({
      data: {
        leadId: newLead.id,
        performedById: userId,
        type: "LEAD_CREATED",
        metadata: {
          source: newLead.source,
          priority: newLead.priority
        }
      }
    });
    
    await transaction.leadTimeline.create({
      data: {
        leadId: lead.id,
        performedById: userId,
        type: "QUALIFICATION_STARTED",
        metadata: {
          status: lead.status
        }
      }
    });

    return newLead;
  });

  return {
    duplicate: false,
    lead
  };
}

export async function qualifyLead(
  leadId: number,
  userId: number,
  data: {
    qualificationComment: string;
    interestedLocation: string;
    budgetFrom?: number | null;
    budgetTo?: number | null;
  }
) {
  return prisma.$transaction(async (transaction) => {
    const lead = await transaction.lead.findUnique({
      where: {
        id: leadId
      }
    });

    if (!lead) {
      throw new Error("LEAD_NOT_FOUND");
    }

    if (
      lead.status !==
      LeadStatus.LEAD_GENERATION_FOLLOW_UP
    ) {
      throw new Error("INVALID_LEAD_STATUS");
    }

    await transaction.leadTimeline.create({
      data: {
        leadId: lead.id,
        performedById: userId,
        type: "QUALIFICATION_STARTED",
        metadata: {
          status: lead.status
        }
      }
    });

    const qualifiedLead = await transaction.lead.update({
      where: {
        id: lead.id
      },
      data: {
        status: LeadStatus.QUALIFIED,
        qualificationComment: data.qualificationComment,
        interestedLocation: data.interestedLocation,
        budgetFrom: data.budgetFrom ?? null,
        budgetTo: data.budgetTo ?? null
      }
    });

    await transaction.leadTimeline.create({
      data: {
        leadId: lead.id,
        performedById: userId,
        type: "LEAD_QUALIFIED",
        metadata: {
          previousStatus:
            LeadStatus.LEAD_GENERATION_FOLLOW_UP,

          newStatus:
            LeadStatus.QUALIFIED
        }
      }
    });

    const finalLead = await transaction.lead.update({
      where: {
        id: lead.id
      },
      data: {
        status:
          LeadStatus.PENDING_AGENT_ASSIGNMENT
      }
    });

    return finalLead;
  });
}

export async function markLeadNotQualified(
  leadId: number,
  userId: number,
  data: {
    reason: NotQualifiedReason;
    comment?: string | null;
  }
) {
  return prisma.$transaction(async (transaction) => {
    const lead = await transaction.lead.findUnique({
      where: {
        id: leadId
      }
    });

    if (!lead) {
      throw new Error("LEAD_NOT_FOUND");
    }

    if (lead.status !== LeadStatus.LEAD_GENERATION_FOLLOW_UP) {
      throw new Error("Invalid status.");
    }

    const notQualifiedLead =  await transaction.lead.update({
      where: {
        id: leadId
      },

      data: {
        notQualifiedReason: data.reason,
        notQualifiedComment: data.comment ?? null
      }
    });

    await transaction.leadTimeline.create({
      data: {
        leadId,
        performedById: userId,
        type: "LEAD_NOT_QUALIFIED",
        metadata: {
          reason: data.reason,
          comment: data.comment ?? null
        }
      }
    });

    return notQualifiedLead;
  });
}

export async function updateLeadStatus(
  leadId: number,
  newStatus: LeadStatus,
  userId: number
) {
  return prisma.$transaction(async (transaction) => {
    const lead = await transaction.lead.findUnique({
      where: {
        id: leadId
      }
    });

    if (!lead) {
      throw new Error("LEAD_NOT_FOUND");
    }

    const allowed = allowedTransitions[lead.status];

    if (!allowed.includes(newStatus)) {
      throw new Error("Invalid status");
    }

    const updatedLead = await transaction.lead.update({
      where: {
        id: leadId
      },

      data: {
        status: newStatus
      }
    });

    return updatedLead;
  });
}

export async function assignLeadToAgent(
  leadId: number,
  supervisorId: number,
  agentId: number,
) {
  return prisma.$transaction(async (transaction) => {
    const lead = await transaction.lead.findUnique({
      where: {
        id: leadId
      }
    });

    if (!lead) {
      throw new Error("LEAD_NOT_FOUND");
    }

    if (lead.status !== LeadStatus.PENDING_AGENT_ASSIGNMENT) {
      throw new Error("Invalid status.");
    }

    const agent = await transaction.user.findUnique({
      where: {
        id: agentId
      },

      include: {
        role: true
      }
    });

    if (!agent || (!!agent && agent.role.slug !== "agent")) {
      throw new Error("AGENT_NOT_FOUND");
    }

    const updatedLead = await transaction.lead.update({
      where: {
        id: leadId
      },

      data: {
        assignedAgentId: agentId,
        status: LeadStatus.AGENT_ASSIGNED
      },

      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await transaction.leadTimeline.create({
      data: {
        leadId,
        performedById: supervisorId,
        type: "AGENT_ASSIGNED",
        metadata: {
          agentId
        }
      }
    });

    return updatedLead;
  });
}

export async function getLeads(
  access: LeadAccess,
  options: {
    page: number;
    limit: number;
    status?: LeadStatus;
  }
) {
  const { page, limit, status } = options;

  const skip = (page - 1) * limit;

  const where = buildLeadWhere(access, {
    ...(status ? { status } : {})
  });

  const [leads, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedAgent: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }),

    prisma.lead.count({
      where
    })
  ]);

  return {
    leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getLeadById(
  leadId: number,
  access: LeadAccess
) {
  const where = buildLeadWhere(access, {
    id: leadId
  });

  const lead = await prisma.lead.findFirst({
    where,
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      assignedAgent: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!lead) {
    throw new Error("LEAD_NOT_FOUND");
  }

  return lead;
}

export async function convertLead(
  leadId: number,
  agentId: number,
  data: {
    propertyId: number;
    unitId: number;
    comment?: string | null;
  }
) {
  return prisma.$transaction(async (transaction) => {
    const lead = await transaction.lead.findUnique({
      where: {
        id: leadId
      }
    });

    if (!lead) {
      throw new Error("LEAD_NOT_FOUND");
    }

    if (lead.assignedAgentId !== agentId) {
      throw new Error("NOT_ASSIGNED_AGENT");
    }

    if (lead.status !== LeadStatus.AGENT_ASSIGNED) {
      throw new Error("INVALID_OUTCOME_STATUS");
    }

    const updatedLead = await transaction.lead.update({
      where: {
        id: leadId
      },

      data: {
        status: LeadStatus.CONVERTED_PENDING_APPROVAL,
        propertyId: data.propertyId,
        unitId: data.unitId,
        convertedComment: data.comment ?? null
      }
    });

    await transaction.leadTimeline.create({
      data: {
        leadId,
        performedById: agentId,
        type: "LEAD_CONVERTED",
        metadata: {
          propertyId: data.propertyId,
          unitId: data.unitId,
          comment: data.comment ?? null
        }
      }
    });

    return updatedLead;
  });
}

export async function dropLead(
  leadId: number,
  agentId: number,
  data: {
    reason: string;
    comment?: string | null;
  }
) {
  return prisma.$transaction(async (transaction) => {
    const lead = await transaction.lead.findUnique({
      where: {
        id: leadId
      }
    });

    if (!lead) {
      throw new Error("LEAD_NOT_FOUND");
    }

    if (lead.assignedAgentId !== agentId) {
      throw new Error("NOT_ASSIGNED_AGENT");
    }

    if (lead.status !== LeadStatus.AGENT_ASSIGNED) {
      throw new Error("INVALID_OUTCOME_STATUS");
    }

    const updatedLead = await transaction.lead.update({
      where: {
        id: leadId
      },

      data: {
        status: LeadStatus.DROPPED_PENDING_APPROVAL,
        droppedReason: data.reason,
        droppedComment: data.comment ?? null
      }
    });

    await transaction.leadTimeline.create({
      data: {
        leadId,
        performedById: agentId,
        type: "LEAD_DROPPED",
        metadata: {
          reason: data.reason,
          comment: data.comment ?? null
        }
      }
    });

    return updatedLead;
  });
}

export async function approveLeadOutcome(
  leadId: number,
  supervisorId: number
) {
  return prisma.$transaction(async (transaction) => {
    const lead = await transaction.lead.findUnique({
      where: {
        id: leadId
      }
    });

    if (!lead) {
      throw new Error("LEAD_NOT_FOUND");
    }

    const validStatuses: LeadStatus[] = [
      LeadStatus.CONVERTED_PENDING_APPROVAL,
      LeadStatus.DROPPED_PENDING_APPROVAL
    ];

    if (!validStatuses.includes(lead.status)) {
      throw new Error("INVALID_APPROVAL_STATUS");
    }

    const updatedLead =
      await transaction.lead.update({
        where: {
          id: leadId
        },

        data: {
          status: LeadStatus.CLOSED
        }
      });

    await transaction.leadTimeline.create({
      data: {
        leadId,
        performedById: supervisorId,
        type: "OUTCOME_APPROVED",
        metadata: {
          previousStatus: lead.status,
          newStatus: LeadStatus.CLOSED
        }
      }
    });

    await transaction.leadTimeline.create({
      data: {
        leadId,
        performedById: supervisorId,
        type: "LEAD_CLOSED",
        metadata: {
          previousStatus: lead.status,
          closedStatus: LeadStatus.CLOSED
        }
      }
    });

    return updatedLead;
  });
}