-- CreateEnum
CREATE TYPE "LeadTimelineType" AS ENUM ('LEAD_CREATED', 'QUALIFICATION_STARTED', 'LEAD_QUALIFIED', 'LEAD_NOT_QUALIFIED', 'AGENT_ASSIGNED', 'LEAD_CONVERTED', 'LEAD_DROPPED', 'OUTCOME_APPROVED', 'LEAD_CLOSED');

-- CreateTable
CREATE TABLE "lead_timeline" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "type" "LeadTimelineType" NOT NULL,
    "performed_by_id" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_timeline_lead_id_idx" ON "lead_timeline"("lead_id");

-- CreateIndex
CREATE INDEX "lead_timeline_performed_by_id_idx" ON "lead_timeline"("performed_by_id");

-- CreateIndex
CREATE INDEX "lead_timeline_type_idx" ON "lead_timeline"("type");

-- CreateIndex
CREATE INDEX "lead_timeline_created_at_idx" ON "lead_timeline"("created_at");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_timeline" ADD CONSTRAINT "lead_timeline_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_timeline" ADD CONSTRAINT "lead_timeline_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
