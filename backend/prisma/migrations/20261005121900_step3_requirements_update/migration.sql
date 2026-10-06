-- AlterTable
ALTER TABLE `verification_records` MODIFY `verifiedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `requirements` ADD COLUMN `startupNamePublic` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `requirements_status_createdAt_idx` ON `requirements`(`status`, `createdAt`);

-- CreateIndex
CREATE INDEX `requirements_needSkill_idx` ON `requirements`(`needSkill`);

-- CreateIndex
CREATE INDEX `requirements_stage_idx` ON `requirements`(`stage`);

-- CreateIndex
CREATE INDEX `requirements_ownerId_idx` ON `requirements`(`ownerId`);
