import { Response } from "express";

import prisma from "../../config/database";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import { checkPassword } from "../../utils/password";
import { generateToken } from "../../utils/jwt";
import { authValidation } from "../../validations/auth.validation";

export async function login(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const validation = authValidation.safeParse(req.body);

    if (!validation.success) {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: {
        email
      },
      include: {
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The user credentials are invalid."
      });
    }

    const passwordMatches = await checkPassword(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "The user credentials are invalid."
      });
    }

    const token = generateToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      roleSlug: user.role.slug
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",

      data: {
        token,

        user: {
          id: user.id,
          name: user.name,
          email: user.email,

          role: {
            id: user.role.id,
            name: user.role.name,
            slug: user.role.slug
          },

          created_at: user.createdAt,
          updated_at: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to login"
    });
  }
}

export async function resolver(
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

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id
      },
      include: {
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No user found."
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        id: user.id,
        name: user.name,
        email: user.email,

        role: {
          id: user.role.id,
          name: user.role.name,
          slug: user.role.slug
        },

        created_at: user.createdAt,
        updated_at: user.updatedAt
      }
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong."
    });
  }
}