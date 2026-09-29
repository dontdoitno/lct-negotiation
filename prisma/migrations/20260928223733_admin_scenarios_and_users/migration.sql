-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "isTestRun" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioDefinition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "playerRole" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "npcName" TEXT NOT NULL,
    "npcPosition" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "characterNote" TEXT NOT NULL,
    "temperament" TEXT NOT NULL,
    "triggers" JSONB NOT NULL,
    "soothers" JSONB NOT NULL,
    "npcGoal" TEXT NOT NULL,
    "initiator" TEXT NOT NULL DEFAULT 'employee',
    "openingLine" TEXT NOT NULL,
    "exitLine" TEXT NOT NULL,
    "hiddenLayers" JSONB NOT NULL,
    "layerRevealCost" INTEGER NOT NULL DEFAULT 2,
    "playerGoals" JSONB NOT NULL,
    "successCriteria" JSONB NOT NULL,
    "resources" JSONB NOT NULL,
    "constraints" JSONB NOT NULL,
    "difficultyPreset" TEXT NOT NULL DEFAULT 'normal',
    "startMetrics" JSONB NOT NULL,
    "turnLimit" INTEGER NOT NULL DEFAULT 14,
    "sensitivity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "showTypeInBrief" BOOLEAN NOT NULL DEFAULT false,
    "trainingModeDefault" BOOLEAN NOT NULL DEFAULT false,
    "reactions" JSONB NOT NULL,
    "fallbackLines" JSONB,
    "customPrompt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "playthroughCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScenarioDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ScenarioDefinition_status_idx" ON "ScenarioDefinition"("status");

-- CreateIndex
CREATE INDEX "ScenarioDefinition_domain_topic_idx" ON "ScenarioDefinition"("domain", "topic");
