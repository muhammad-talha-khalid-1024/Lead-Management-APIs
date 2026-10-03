import prisma from "../src/config/database";

beforeEach(async () => {
  await prisma.leadTimeline.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});