-- AlterTable
ALTER TABLE "exercicios_gerados" ADD COLUMN     "dataProva" DATE,
ADD COLUMN     "nomeProva" TEXT;

-- AlterTable
ALTER TABLE "professores" ADD COLUMN     "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificacaoExpiraEm" TIMESTAMP(3),
ADD COLUMN     "verificacaoTokenHash" TEXT;
