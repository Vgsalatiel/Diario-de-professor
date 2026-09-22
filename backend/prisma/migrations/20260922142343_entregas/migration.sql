-- CreateEnum
CREATE TYPE "StatusEntrega" AS ENUM ('pendente', 'feito', 'naoEntregou');

-- CreateTable
CREATE TABLE "entregas" (
    "id" TEXT NOT NULL,
    "status" "StatusEntrega" NOT NULL DEFAULT 'pendente',
    "alunoId" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entregas_alunoId_eventoId_key" ON "entregas"("alunoId", "eventoId");

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
