import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../src/config/database";

export async function createRole(slug: string, name?: string) {
  return prisma.role.upsert({
    where: {
      slug
    },
    update: {},
    create: {
      slug,
      name: name || slug
    }
  });
}

export async function createUser(
  roleSlug: string,
  email: string,
  name = "Test User"
) {
  const role = await createRole(roleSlug);

  const password = await bcrypt.hash("Password@123", 12);

  return prisma.user.create({
    data: {
      name,
      email,
      password,
      roleId: role.id
    }
  });
}

export function generateTestToken(user: {
  id: number;
  email: string;
  roleId: number;
  roleSlug: string;
}) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleSlug: user.roleSlug
    },
    process.env.JWT_SECRET || "test-secret-key",
    {
      expiresIn: "1h"
    }
  );
}

export async function createLead(
  createdById: number,
  overrides: Record<string, any> = {}
) {
  return prisma.lead.create({
    data: {
      createdById,

      name: "Ahmed Ali",
      phone: `+974${Date.now()}`,
      email: `test-${Date.now()}@example.com`,

      source: "FACEBOOK",
      propertyType: "APARTMENT",

      interestedLocation: "West Bay",
      bedrooms: 2,

      budgetFrom: 6000,
      budgetTo: 8000,

      priority: "HOT",

      status: "LEAD_GENERATION_FOLLOW_UP",

      ...overrides
    }
  });
}

export async function cleanDatabase() {
  await prisma.leadTimeline.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
}