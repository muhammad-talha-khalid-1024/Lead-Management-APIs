import { Router } from "express";

import { index, store, show, qualify, notQualified, updateStatus, assignAgent, convert, drop } from "../controllers/lead/lead.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorizeRoles } from "../middleware/role.middleware";
import { timeline } from "../controllers/lead/lead.timeline.controller";
import { validate } from "../middleware/validation.middleware";
import { qualifyLeadValidation } from "../validations/lead.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizeRoles(
    "lead-generation",
    "lead-generation-supervisor"
  ),
  store
);

router.get(
  "/",
  authenticate,
  index
);

router.post(
  "/:id/qualify",
  authenticate,
  authorizeRoles(
    "lead-generation",
    "lead-generation-supervisor"
  ),
  validate(qualifyLeadValidation),
  qualify
);

router.post(
  "/:id/not-qualified",
  authenticate,
  authorizeRoles(
    "lead-generation",
    "lead-generation-supervisor"
  ),
  notQualified
);

router.post(
  "/:id/assign",
  authenticate,
  authorizeRoles(
    "agent-supervisor"
  ),
  assignAgent
);

router.post(
  "/:id/convert",
  authenticate,
  authorizeRoles("agent"),
  convert
);

router.post(
  "/:id/drop",
  authenticate,
  authorizeRoles("agent"),
  drop
);

router.get(
  "/:id/timeline",
  authenticate,
  authorizeRoles(
    "lead-generation",
    "lead-generation-supervisor",
    "agent",
    "agent-supervisor"
  ),
  timeline
);

router.get(
  "/:id",
  authenticate,
  show
);

router.patch(
  "/:id/status",
  authenticate,
  updateStatus
);

export default router;