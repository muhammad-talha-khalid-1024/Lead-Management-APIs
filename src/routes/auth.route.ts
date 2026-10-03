import { Router } from "express";
import { login, resolver } from "../controllers/auth/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post(
  "/login",
  login
);

router.get(
  "/resolver",
  authenticate,
  resolver
);

export default router;