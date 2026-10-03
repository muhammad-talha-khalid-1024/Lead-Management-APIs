-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'LEAD_GENERATION_FOLLOW_UP', 'QUALIFIED', 'PENDING_AGENT_ASSIGNMENT', 'AGENT_ASSIGNED', 'CONVERTED_PENDING_APPROVAL', 'DROPPED_PENDING_APPROVAL', 'CLOSED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'WHATSAPP', 'GOOGLE_CAMPAIGN', 'PROPERTY_PORTAL', 'PHONE_CALL', 'MANUAL_ENTRY');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'VILLA', 'TOWNHOUSE', 'OFFICE', 'COMMERCIAL', 'LAND', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "NotQualifiedReason" AS ENUM ('BUDGET_NOT_SUITABLE', 'PROPERTY_NOT_AVAILABLE', 'NOT_INTERESTED', 'DUPLICATE_LEAD', 'INVALID_CONTACT', 'FUTURE_REQUIREMENT', 'UNABLE_TO_CONTACT', 'OTHER');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remember_token" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp_number" TEXT,
    "email" TEXT,
    "source" "LeadSource" NOT NULL,
    "campaign" TEXT,
    "interested_location" TEXT,
    "property_type" "PropertyType" NOT NULL,
    "bedrooms" INTEGER,
    "budget_from" DECIMAL(12,2),
    "budget_to" DECIMAL(12,2),
    "movingDate" TIMESTAMP(3),
    "priority" "LeadPriority" NOT NULL DEFAULT 'WARM',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "qualification_comment" TEXT,
    "not_qualified_reason" "NotQualifiedReason",
    "not_qualified_comment" TEXT,
    "assigned_agent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "leads_created_by_id_idx" ON "leads"("created_by_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_source_idx" ON "leads"("source");

-- CreateIndex
CREATE INDEX "leads_assigned_agent_id_idx" ON "leads"("assigned_agent_id");

-- CreateIndex
CREATE INDEX "leads_priority_idx" ON "leads"("priority");

-- CreateIndex
CREATE INDEX "leads_phone_idx" ON "leads"("phone");

-- CreateIndex
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_whatsapp_number_idx" ON "leads"("whatsapp_number");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
