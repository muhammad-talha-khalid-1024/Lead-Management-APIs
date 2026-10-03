import { Response, NextFunction } from "express";

import { AuthenticatedRequest } from "./auth.middleware";

export function authorizeRoles(...allowedRoles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthenticated user."
      });
    }

    if (!allowedRoles.includes(req.user.roleSlug)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource"
      });
    }

    next();
  };
}