import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password"

const prisma = new PrismaClient();

async function main() {

  const leadGenerationRole = await prisma.role.upsert({
    where: {
      slug: "lead-generation"
    },
    update: {
      name: "Lead Generation"
    },
    create: {
      name: "Lead Generation",
      slug: "lead-generation"
    }
  });

  const leadGenerationSupervisorRole = await prisma.role.upsert({
    where: {
      slug: "lead-generation-supervisor"
    },
    update: {
      name: "Lead Generation Supervisor"
    },
    create: {
      name: "Lead Generation Supervisor",
      slug: "lead-generation-supervisor"
    }
  });

  const agentRole = await prisma.role.upsert({
    where: {
      slug: "agent"
    },
    update: {
      name: "Agent"
    },
    create: {
      name: "Agent",
      slug: "agent"
    }
  });

  const agentSupervisorRole = await prisma.role.upsert({
    where: {
      slug: "agent-supervisor"
    },
    update: {
      name: "Agent Supervisor"
    },
    create: {
      name: "Agent Supervisor",
      slug: "agent-supervisor"
    }
  });

  console.log("Roles created successfully.");

  const password = await hashPassword("Password@123");

  await prisma.user.upsert({
    where: {
      email: "lead@example.com"
    },
    update: {
      roleId: leadGenerationRole.id
    },
    create: {
      name: "Lead Generation User",
      email: "lead@example.com",
      password,
      roleId: leadGenerationRole.id
    }
  });

  await prisma.user.upsert({
    where: {
      email: "lead.supervisor@example.com"
    },
    update: {
      roleId: leadGenerationSupervisorRole.id
    },
    create: {
      name: "Lead Generation Supervisor",
      email: "lead.supervisor@example.com",
      password,
      roleId: leadGenerationSupervisorRole.id
    }
  });

  await prisma.user.upsert({
    where: {
      email: "agent@example.com"
    },
    update: {
      roleId: agentRole.id
    },
    create: {
      name: "Agent User",
      email: "agent@example.com",
      password,
      roleId: agentRole.id
    }
  });

  await prisma.user.upsert({
    where: {
      email: "agent.supervisor@example.com"
    },
    update: {
      roleId: agentSupervisorRole.id
    },
    create: {
      name: "Agent Supervisor",
      email: "agent.supervisor@example.com",
      password,
      roleId: agentSupervisorRole.id
    }
  });

  console.log("Users created successfully.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });