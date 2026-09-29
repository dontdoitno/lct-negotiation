-- AlterTable
ALTER TABLE "ScenarioDefinition" ADD COLUMN     "npcRole" TEXT NOT NULL DEFAULT 'Сотрудник',
ALTER COLUMN "initiator" SET DEFAULT 'npc';

-- Перенос уже сохранённых сценариев: раньше инициатор назывался парой
-- «сотрудник и руководитель», теперь это нейтральные «собеседник и игрок».
UPDATE "ScenarioDefinition" SET "initiator" = 'npc' WHERE "initiator" = 'employee';
UPDATE "ScenarioDefinition" SET "initiator" = 'player' WHERE "initiator" = 'manager';
