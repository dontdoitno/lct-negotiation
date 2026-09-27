-- CreateTable
CREATE TABLE "JudgeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "personaType" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "JudgeTurn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "playerText" TEXT NOT NULL,
    "prefiltered" BOOLEAN NOT NULL DEFAULT false,
    "prefilterReason" TEXT,
    "rawDeltas" JSONB NOT NULL,
    "appliedDeltas" JSONB NOT NULL,
    "metricsAfter" JSONB NOT NULL,
    "techniquesUsed" JSONB NOT NULL,
    "techniquesViolated" JSONB NOT NULL,
    "rationale" TEXT NOT NULL,
    "degraded" BOOLEAN NOT NULL DEFAULT false,
    "npcReply" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JudgeTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "JudgeSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "JudgeSession_userId_idx" ON "JudgeSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeTurn_sessionId_index_key" ON "JudgeTurn"("sessionId", "index");
