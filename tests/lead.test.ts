import request from "supertest";

import app from "../src/app";
import prisma from "../src/config/database";

import {
  createUser,
  createLead,
  generateTestToken
} from "./helpers";

describe("Lead Management Business Rules", () => {
  describe("Lead Qualification", () => {
    it("should successfully qualify a lead", async () => {
      const leadUser = await createUser(
        "lead-generation",
        "lead1@test.com",
        "Lead User"
      );

      const token = generateTestToken({
        id: leadUser.id,
        email: leadUser.email,
        roleId: leadUser.roleId,
        roleSlug: "lead-generation"
      });

      const lead = await createLead(leadUser.id, {
        status: "LEAD_GENERATION_FOLLOW_UP"
      });

      const response = await request(app)
        .post(`/api/leads/${lead.id}/qualify`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          qualificationComment:
            "Customer requires a 2-bedroom apartment in West Bay",
          interestedLocation: "West Bay",
          budgetFrom: 6000,
          budgetTo: 8000
        });

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);

      const updatedLead = await prisma.lead.findUnique({
        where: {
          id: lead.id
        }
      });

      expect(updatedLead?.status).toBe(
        "PENDING_AGENT_ASSIGNMENT"
      );

      expect(updatedLead?.qualificationComment).toBe(
        "Customer requires a 2-bedroom apartment in West Bay"
      );
    });
  });

  describe("Agent Assignment", () => {
    it("should assign an agent successfully", async () => {
      const leadSupervisor = await createUser(
        "agent-supervisor",
        "agent-supervisor@test.com",
        "Agent Supervisor"
      );

      const agent = await createUser(
        "agent",
        "agent@test.com",
        "Agent"
      );

      const token = generateTestToken({
        id: leadSupervisor.id,
        email: leadSupervisor.email,
        roleId: leadSupervisor.roleId,
        roleSlug: "agent-supervisor"
      });

      const leadCreator = await createUser(
        "lead-generation",
        "creator@test.com"
      );

      const lead = await createLead(leadCreator.id, {
        status: "PENDING_AGENT_ASSIGNMENT"
      });

      const response = await request(app)
        .post(`/api/leads/${lead.id}/assign`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          agentId: agent.id
        });

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);

      const updatedLead = await prisma.lead.findUnique({
        where: {
          id: lead.id
        }
      });

      expect(updatedLead?.assignedAgentId).toBe(agent.id);

      expect(updatedLead?.status).toBe(
        "AGENT_ASSIGNED"
      );
    });
  });

  describe("Invalid Workflow Transition", () => {
    it("should reject qualification when lead is not in LEAD_GENERATION_FOLLOW_UP", async () => {
      const leadUser = await createUser(
        "lead-generation",
        "invalid-transition@test.com"
      );

      const token = generateTestToken({
        id: leadUser.id,
        email: leadUser.email,
        roleId: leadUser.roleId,
        roleSlug: "lead-generation"
      });

      const lead = await createLead(leadUser.id, {
        status: "NEW"
      });

      const response = await request(app)
        .post(`/api/leads/${lead.id}/qualify`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          qualificationComment: "Customer is interested",
          interestedLocation: "West Bay",
          budgetFrom: 5000,
          budgetTo: 7000
        });

      expect(response.status).toBe(400);

      const unchangedLead = await prisma.lead.findUnique({
        where: {
          id: lead.id
        }
      });

      expect(unchangedLead?.status).toBe("NEW");
    });
  });

  describe("Agent Lead Access", () => {
    it("should prevent an agent from accessing another agent's lead", async () => {
      const agent1 = await createUser(
        "agent",
        "agent1@test.com",
        "Agent One"
      );

      const agent2 = await createUser(
        "agent",
        "agent2@test.com",
        "Agent Two"
      );

      const token = generateTestToken({
        id: agent1.id,
        email: agent1.email,
        roleId: agent1.roleId,
        roleSlug: "agent"
      });

      const leadCreator = await createUser(
        "lead-generation",
        "leadcreator@test.com"
      );

      const lead = await createLead(leadCreator.id, {
        status: "AGENT_ASSIGNED",
        assignedAgentId: agent2.id
      });

      const response = await request(app)
        .get(`/api/leads/${lead.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("Duplicate Lead Detection", () => {
    it("should detect an existing lead with the same phone", async () => {
      const leadUser = await createUser(
        "lead-generation",
        "duplicate@test.com"
      );

      const existingLead = await createLead(leadUser.id, {
        phone: "+97455555555"
      });

      const token = generateTestToken({
        id: leadUser.id,
        email: leadUser.email,
        roleId: leadUser.roleId,
        roleSlug: "lead-generation"
      });

        const response = await request(app)
        .post("/api/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({
            name: "Another Ahmed",
            phone: "+97455555555",
            email: "another@example.com",
            source: "FACEBOOK",
            campaign: "West Bay Apartments",
            interestedLocation: "West Bay",
            propertyType: "APARTMENT",
            bedrooms: 2,
            budgetFrom: 6000,
            budgetTo: 8000,
            movingDate: "2026-10-01",
            priority: "HOT",
            forceCreate: false
        });

        console.log(
        "DUPLICATE RESPONSE:",
        JSON.stringify(response.body, null, 2)
        );

        expect(response.status).toBe(422);
    });
  });

  describe("Timeline and History", () => {
    it("should create timeline and history events when qualifying a lead", async () => {
      const leadUser = await createUser(
        "lead-generation",
        "timeline@test.com"
      );

      const token = generateTestToken({
        id: leadUser.id,
        email: leadUser.email,
        roleId: leadUser.roleId,
        roleSlug: "lead-generation"
      });

      const lead = await createLead(leadUser.id, {
        status: "LEAD_GENERATION_FOLLOW_UP"
      });

      await request(app)
        .post(`/api/leads/${lead.id}/qualify`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          qualificationComment: "Customer is qualified",
          interestedLocation: "West Bay",
          budgetFrom: 6000,
          budgetTo: 8000
        });

      const timelineEvents =
        await prisma.leadTimeline.findMany({
          where: {
            leadId: lead.id
          },
          orderBy: {
            createdAt: "asc"
          }
        });

      expect(timelineEvents.length).toBeGreaterThanOrEqual(2);

      expect(
        timelineEvents.some(
          event =>
            event.type === "QUALIFICATION_STARTED"
        )
      ).toBe(true);

      expect(
        timelineEvents.some(
          event =>
            event.type === "LEAD_QUALIFIED"
        )
      ).toBe(true);
    });
  });
});