-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "parentId" TEXT,
    "branchTurn" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turn" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "playerText" TEXT NOT NULL,
    "inputMode" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "deltas" JSONB NOT NULL,
    "stateAfter" JSONB NOT NULL,
    "npcText" TEXT NOT NULL,
    "npcAudioUrl" TEXT,
    "rationale" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debrief" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "outcome" JSONB NOT NULL,
    "stars" INTEGER NOT NULL,
    "breakpoints" JSONB NOT NULL,
    "reflectionAnswers" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Debrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "bestStars" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomScenario" (
    "id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "personaType" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "JudgeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudgeTurn" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JudgeTurn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Turn_sessionId_index_key" ON "Turn"("sessionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Debrief_sessionId_key" ON "Debrief"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_userId_levelId_key" ON "Progress"("userId", "levelId");

-- CreateIndex
CREATE INDEX "JudgeSession_userId_idx" ON "JudgeSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeTurn_sessionId_index_key" ON "JudgeTurn"("sessionId", "index");

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debrief" ADD CONSTRAINT "Debrief_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JudgeTurn" ADD CONSTRAINT "JudgeTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "JudgeSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

