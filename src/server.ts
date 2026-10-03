import app from "./app";

import { env } from "./config/env";

import prisma from "./config/database";

async function startServer() {
  try {
    await prisma.$connect();

    console.log("PostgreSQL database connected successfully.");

    app.listen(
      env.port,
      () => {
        console.log(
          `Server running on http://localhost:${env.port}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    await prisma.$disconnect();

    process.exit(1);
  }
}

startServer();

process.on(
  "SIGINT",
  async () => {
    await prisma.$disconnect();

    process.exit(0);
  }
);

process.on(
  "SIGTERM",
  async () => {
    await prisma.$disconnect();

    process.exit(0);
  }
);