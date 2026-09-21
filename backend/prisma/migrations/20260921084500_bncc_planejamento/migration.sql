-- CreateEnum
CREATE TYPE "EtapaBncc" AS ENUM ('fundamental', 'medio');

-- AlterTable
ALTER TABLE "turmas" ADD COLUMN     "disciplina" TEXT,
ADD COLUMN     "etapaBncc" "EtapaBncc",
ADD COLUMN     "anoSerieBncc" INTEGER;

-- AlterTable
ALTER TABLE "planos_de_aula" ADD COLUMN     "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "bnccCodigo" TEXT,
ADD COLUMN     "bnccTexto" TEXT;
