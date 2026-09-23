-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "pauta" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "eventos" ADD COLUMN     "participantes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "eventos" ADD COLUMN     "ata" TEXT;

-- CreateTable
CREATE TABLE "encaminhamentos" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventoId" TEXT NOT NULL,
    "responsavelId" TEXT,

    CONSTRAINT "encaminhamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "encaminhamentos_eventoId_idx" ON "encaminhamentos"("eventoId");

-- AddForeignKey
ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "professores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
