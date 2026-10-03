import { z } from "zod";

export const createLeadValidation = z.object({
  name: z
    .string()
    .min(1, "The name field is required.")
    .max(255),

  phone: z
    .string()
    .min(1, "The phone field is required.")
    .max(50),

  whatsappNumber: z
    .string()
    .min(1, "The whatsapp number field is required.")
    .max(50),

  email: z
    .string()
    .min(1, "The email field is required.")
    .email("The email field is invalid."),

  source: z.enum([
    "WEBSITE",
    "FACEBOOK",
    "INSTAGRAM",
    "WHATSAPP",
    "GOOGLE_CAMPAIGN",
    "PROPERTY_PORTAL",
    "PHONE_CALL",
    "MANUAL_ENTRY"
  ], "The source must be one from the following: WEBSITE, FACEBOOK, INSTAGRAM, WHATSAPP, GOOGLE_CAMPAIGN, PROPERTY_PORTAL, PHONE_CALL, MANUAL_ENTRY"),

  campaign: z
    .string()
    .min(1, "The campaign field is required.")
    .max(255),

  interestedLocation: z
    .string()
    .min(1, "The interested location field is required.")
    .max(255),

  propertyType: z.enum([
    "APARTMENT",
    "VILLA",
    "TOWNHOUSE",
    "OFFICE",
    "COMMERCIAL",
    "LAND",
    "OTHER"
  ], "The property type must be one from the following: APARTMENT, VILLA, TOWNHOUSE, OFFICE, COMMERCIAL, LAND, OTHER"),

  bedrooms: z
    .number()
    .int()
    .min(1, "The bedrooms field is required.")
    .max(10),
    
  budgetFrom: z
    .number()
    .min(1, "The budget from field is required."),

  budgetTo: z
    .number()
    .min(1, "The budget to field is required."),

  movingDate: z
    .string()
    .min(1, "The moving date field is required.")
    .refine(
        (date) => {
        if (!date) return true;

        const movingDate = new Date(date);
        const today = new Date();

        today.setHours(0, 0, 0, 0);
        movingDate.setHours(0, 0, 0, 0);

        return movingDate >= today;
        },
        {
            message: "The moving date cannot be a previous date.",
        }
    ),

  priority: z
    .enum([
      "HOT",
      "WARM",
      "COLD"
    ], "The priority must be one from the following: HOT, WARM, COLD"),

  forceCreate: z.boolean().default(false)
});

export const qualifyLeadValidation = z.object({
    qualificationComment: z
      .string()
      .min(1, "The qualification comment is required.")
      .max(1000),

    interestedLocation: z
      .string()
      .min(1, "The interested location is required.")
      .max(255),

    budgetFrom: z
      .number()
      .min(0)
      .optional()
      .nullable(),

    budgetTo: z
      .number()
      .min(0)
      .optional()
      .nullable()
})
.refine(
  (data) =>
    data.budgetFrom === null ||
    data.budgetFrom === undefined ||
    data.budgetTo === null ||
    data.budgetTo === undefined ||
    data.budgetFrom <= data.budgetTo,
  {
    message: "budgetFrom cannot be greater than budgetTo",
    path: ["budgetTo"]
  }
);

export const notQualifiedLeadValidation = z.object({
  reason: z.enum([
    "BUDGET_NOT_SUITABLE",
    "PROPERTY_NOT_AVAILABLE",
    "NOT_INTERESTED",
    "DUPLICATE_LEAD",
    "INVALID_CONTACT",
    "FUTURE_REQUIREMENT",
    "UNABLE_TO_CONTACT",
    "OTHER"
  ]),

  comment: z
    .string()
    .max(1000)
    .optional()
    .nullable()
});

export const assignLeadValidation = z.object({
  agentId: z
    .number()
    .int()
    .positive()
});

export const getLeadsValidation = z.object({
  page: z.coerce.number().int().positive().default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20),

  status: z
    .enum([
      "NEW",
      "LEAD_GENERATION_FOLLOW_UP",
      "QUALIFIED",
      "PENDING_AGENT_ASSIGNMENT",
      "AGENT_ASSIGNED",
      "CONVERTED_PENDING_APPROVAL",
      "DROPPED_PENDING_APPROVAL",
      "CLOSED"
    ])
    .optional()
});

export const convertLeadValidation = z.object({
  propertyId: z
    .number()
    .int()
    .positive("The property id must be a positive integer."),

  unitId: z
    .number()
    .int()
    .positive("The unit id must be a positive integer."),

  comment: z
    .string()
    .max(1000)
    .optional()
    .nullable()
});

export const dropLeadValidation = z.object({
  reason: z
    .string()
    .min(1, "The drop reason is required.")
    .max(255),

  comment: z
    .string()
    .max(1000)
    .optional()
    .nullable()
});