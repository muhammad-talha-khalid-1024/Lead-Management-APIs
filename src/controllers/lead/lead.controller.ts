import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { assignLeadValidation, createLeadValidation, qualifyLeadValidation, notQualifiedLeadValidation, convertLeadValidation, dropLeadValidation, getLeadsValidation } from "../../validations/lead.validation";
import { LeadStatus, NotQualifiedReason, Prisma } from "@prisma/client";
import { createLead, qualifyLead, markLeadNotQualified, updateLeadStatus, assignLeadToAgent, getLeadById, getLeads, convertLead, dropLead, findDuplicateLeads, approveLeadOutcome } from "../../services/lead.service";
import prisma from "../../config/database";

function getLeadId(
  req: AuthenticatedRequest
): number | null {
  const id = Number(req.params.id);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

export async function index(
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

    const validation = getLeadsValidation.safeParse(req.query);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten()
      });
    }

    const result = await getLeads(
      {
        userId: req.user.id,
        roleSlug: req.user.roleSlug
      },
      {
        page: validation.data.page,
        limit: validation.data.limit,
        status: validation.data.status as LeadStatus | undefined
      }
    );

    return res.status(200).json({
      success: true,
      data: result.leads,
      pagination: result.pagination
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED_ROLE") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access leads."
      });
    }


    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error
    });
  }
}

export async function store(
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

    const validation = createLeadValidation.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const data = validation.data;

    if (
      data.budgetFrom !== null &&
      data.budgetFrom !== undefined &&
      data.budgetTo !== null &&
      data.budgetTo !== undefined &&
      data.budgetFrom > data.budgetTo
    ) {
      return res.status(422).json({
        success: false,
        message: "budgetFrom cannot be greater than budgetTo"
      });
    }

    const {
      forceCreate,
      movingDate,
      ...leadData
    } = req.body;

    const duplicates = await findDuplicateLeads(leadData,req.user.id);

    if (duplicates.length > 0 && !forceCreate) {
      return res.status(409).json({
        success: false,
        warning: "POSSIBLE_DUPLICATE",
        existingLeadIds: duplicates.map(
          lead => lead.id
        )
      });
    }

    const result = await prisma.lead.create({
      data: {
        ...leadData,
        createdById: req.user.id,
        movingDate: movingDate
          ? new Date(movingDate)
          : null
      }
    });

    return res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: result
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error
    });
  }
}

export async function show(
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

    const leadId = Number(req.params.id);

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead."
      });
    }

    const lead = await getLeadById(
      leadId,
      {
        userId: req.user.id,
        roleSlug: req.user.roleSlug
      }
    );

    return res.status(200).json({
      success: true,
      data: lead
    });
  } catch (error: any) {
    if (error.message === "LEAD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "No lead found."
      });
    }

    if (error.message === "UNAUTHORIZED_ROLE") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access leads."
      });
    }


    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error
    });
  }
}

export async function qualify(
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

    const leadId = getLeadId(req);

    if (!leadId) {
      return res.status(422).json({
        success: false,
        message: "Invalid lead."
      });
    }

    const validation = qualifyLeadValidation.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten()
      });
    }

    const lead = await getLeadById(
      leadId,
      {
        userId: req.user.id,
        roleSlug: req.user.roleSlug
      }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "No lead found."
      });
    }

    if (
      (req.user.roleSlug === "lead-generation" || req.user.roleSlug === "lead-generation-supervisor") &&
      lead.createdById !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to qualify this lead."
      });
    }

    const updatedLead = await qualifyLead(leadId,req.user.id,validation.data);

    return res.status(200).json({
      success: true,
      message: "Lead qualified successfully",
      data: updatedLead
    });
  } catch (error) {

    if (error instanceof Error) {
      if (error.message === "LEAD_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Lead not found"
        });
      }

      if (error.message === "INVALID_LEAD_STATUS") {
        return res.status(400).json({
          success: false,
          message: "Lead cannot be qualified in its current status."
        });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error
    });
  }
}

export async function notQualified(
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

    const leadId = getLeadId(req);

    if (!leadId) {
      return res.status(422).json({
        success: false,
        message: "Invalid lead."
      });
    }

    const validation = notQualifiedLeadValidation.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten()
      });
    }

    const lead = await getLeadById(
      leadId,
      {
        userId: req.user.id,
        roleSlug: req.user.roleSlug
      }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "No lead found."
      });
    }

    if (lead.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to mark this lead as not qualified."
      });
    }

    const updatedLead =
      await markLeadNotQualified(
        leadId,
        req.user.id,
        {
          reason:
            validation.data
              .reason as NotQualifiedReason,

          comment:
            validation.data.comment
        }
      );

    return res.status(200).json({
      success: true,
      message: "Lead marked as not qualified successfully.",
      data: updatedLead
    });
  } catch (error) {

    if (error instanceof Error && error.message === "LEAD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "No lead found."
      });
    }

    if (error instanceof Error && error.message === "Invalid Status") {
      return res.status(422).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error
    });
  }
}

export async function updateStatus(
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

    const leadId = getLeadId(req);

    if (!leadId) {
      return res.status(422).json({
        success: false,
        message: "Invalid lead."
      });
    }

    const newStatus = req.body.status as LeadStatus;

    if (!Object.values(LeadStatus).includes(newStatus)) {
      return res.status(422).json({
        success: false,
        message: "Invalid lead status"
      });
    }

    if (newStatus === LeadStatus.AGENT_ASSIGNED) {
      return res.status(403).json({
        success: false,
        message: "Use the lead assignment endpoint to assign an agent."
      });
    }

    const lead = await getLeadById(
      leadId,
      {
        userId: req.user.id,
        roleSlug: req.user.roleSlug
      }
    );
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "No lead found."
      });
    }

    if (req.user.roleSlug === "agent" && lead.assignedAgentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this lead."
      });
    }

    const updatedLead = await updateLeadStatus(leadId,newStatus,req.user.id);

    return res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
      data: updatedLead
    });
  } catch (error) {

    if (
      error instanceof Error &&
      error.message === "LEAD_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "No lead found."
      });
    }

    if (error instanceof Error && error.message === "Invalid Status") {
      return res.status(422).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error
    });
  }
}

export async function assignAgent(
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

    const leadId = getLeadId(req);

    if (!leadId) {
      return res.status(422).json({
        success: false,
        message: "Invalid lead."
      });
    }

    const validation = assignLeadValidation.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten()
      });
    }

    const updatedLead = await assignLeadToAgent(leadId,req.user.id,validation.data.agentId);

    return res.status(200).json({
      success: true,
      message: "Lead assigned to agent successfully.",
      data: updatedLead
    });
  } catch (error) {

    if (
      error instanceof Error &&
      error.message === "LEAD_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "No lead found."
      });
    }

    if (error instanceof Error && error.message === "Invalid Status") {
      return res.status(422).json({
        success: false,
        message: error.message
      });
    }

    if (
      error instanceof Error &&
      error.message === "AGENT_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "No agent found."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error
    });
  }
}

export async function convert(
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

    const leadId = Number(req.params.id);

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(422).json({
        success: false,
        message: "Invalid lead ID"
      });
    }

    const validation = convertLeadValidation.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten()
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

    if (req.user.roleSlug !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Only an agent can convert a lead."
      });
    }

    if (lead.assignedAgentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the agent assigned to this lead can convert it."
      });
    }

    const updatedLead = await convertLead(leadId,req.user.id,validation.data);

    return res.status(200).json({
      success: true,
      message: "Lead converted successfully.",
      data: updatedLead
    });
  } catch (error) {

    if (error instanceof Error && error.message === "LEAD_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        message: "No lead found."
      });
    }

    if (error instanceof Error && error.message === "NOT_ASSIGNED_AGENT"
    ) {
      return res.status(403).json({
        success: false,
        message: "Only the agent can convert a lead."
      });
    }

    if (error instanceof Error && error.message === "INVALID_OUTCOME_STATUS") {
      return res.status(422).json({
        success: false,
        message: "Only the agent can convert a lead."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error
    });
  }
}

export async function drop(
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

    const leadId = Number(req.params.id);

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(422).json({
        success: false,
        message: "Invalid lead ID"
      });
    }

    const validation = dropLeadValidation.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten()
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

    if (req.user.roleSlug !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Only an agent can drop a lead."
      });
    }

    if (lead.assignedAgentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the agent can drop a lead."
      });
    }

    const updatedLead = await dropLead(leadId,req.user.id,validation.data);

    return res.status(200).json({
      success: true,
      message: "Lead dropped successfully.",
      data: updatedLead
    });
  } catch (error) {

    if (error instanceof Error && error.message === "LEAD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "No lead found."
      });
    }

    if (error instanceof Error && error.message === "NOT_ASSIGNED_AGENT") {
      return res.status(403).json({
        success: false,
        message: "Only the agent can drop a lead"
      });
    }

    if (error instanceof Error && error.message === "INVALID_OUTCOME_STATUS") {
      return res.status(422).json({
        success: false,
        message: "Only the agent can drop a lead"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error
    });
  }
}

export async function approve(
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

    const leadId = Number(req.params.id);

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return res.status(422).json({
        success: false,
        message: "Invalid lead ID"
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

    if (req.user.roleSlug !== "lead-generation-supervisor") {
      return res.status(403).json({
        success: false,
        message: "Only an lead generation supervisor can close a lead."
      });
    }

    if (lead.assignedAgentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only an lead generation supervisor can close a lead."
      });
    }

    const updatedLead = await approveLeadOutcome(leadId,req.user.id);

    return res.status(200).json({
      success: true,
      message: "Lead closed successfully.",
      data: updatedLead
    });
  } catch (error) {

    if (error instanceof Error && error.message === "LEAD_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "No lead found."
      });
    }

    if (error instanceof Error && error.message === "INVALID_APPROVAL_STATUS") {
      return res.status(403).json({
        success: false,
        message: "Only the lead generation supervisor can close a lead."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
      error: error
    });
  }
}