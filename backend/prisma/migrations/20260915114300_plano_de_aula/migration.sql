-- CreateEnum
CREATE TYPE "DuracaoPlano" AS ENUM ('quinzenal', 'semestral', 'personalizado');

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "planoId" TEXT;

-- CreateTable
CREATE TABLE "planos_de_aula" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "duracao" "DuracaoPlano" NOT NULL,
    "dataInicio" DATE NOT NULL,
    "dataFim" DATE NOT NULL,
    "conteudo" TEXT,
    "turmaId" TEXT NOT NULL,

    CONSTRAINT "planos_de_aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_aula" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "resumo" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "planoId" TEXT,

    CONSTRAINT "registros_aula_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planos_de_aula_turmaId_idx" ON "planos_de_aula"("turmaId");

-- CreateIndex
CREATE INDEX "registros_aula_turmaId_idx" ON "registros_aula"("turmaId");

-- CreateIndex
CREATE INDEX "registros_aula_planoId_idx" ON "registros_aula"("planoId");

-- CreateIndex
CREATE UNIQUE INDEX "registros_aula_turmaId_data_key" ON "registros_aula"("turmaId", "data");

-- CreateIndex
CREATE INDEX "eventos_planoId_idx" ON "eventos"("planoId");

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_de_aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_de_aula" ADD CONSTRAINT "planos_de_aula_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_aula" ADD CONSTRAINT "registros_aula_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_aula" ADD CONSTRAINT "registros_aula_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_de_aula"("id") ON DELETE SET NULL ON UPDATE CASCADE;
