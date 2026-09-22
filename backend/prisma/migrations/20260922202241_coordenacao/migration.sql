-- AlterTable
ALTER TABLE "professores" ADD COLUMN     "isCoordenador" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "observacoes_pedagogicas" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autorId" TEXT NOT NULL,
    "professorAlvoId" TEXT NOT NULL,
    "turmaId" TEXT,

    CONSTRAINT "observacoes_pedagogicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "observacoes_pedagogicas_professorAlvoId_idx" ON "observacoes_pedagogicas"("professorAlvoId");

-- CreateIndex
CREATE INDEX "observacoes_pedagogicas_autorId_idx" ON "observacoes_pedagogicas"("autorId");

-- AddForeignKey
ALTER TABLE "observacoes_pedagogicas" ADD CONSTRAINT "observacoes_pedagogicas_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observacoes_pedagogicas" ADD CONSTRAINT "observacoes_pedagogicas_professorAlvoId_fkey" FOREIGN KEY ("professorAlvoId") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observacoes_pedagogicas" ADD CONSTRAINT "observacoes_pedagogicas_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
