/*
  Warnings:

  - Added the required column `professorId` to the `eventos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "professorId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "eventos_professorId_idx" ON "eventos"("professorId");

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
