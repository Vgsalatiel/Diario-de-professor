-- CreateEnum
CREATE TYPE "TipoAvaliacao" AS ENUM ('nota', 'conceito');

-- AlterTable
ALTER TABLE "notas" ADD COLUMN     "conceito" TEXT;

-- AlterTable
ALTER TABLE "configs_calculo" ADD COLUMN     "tipoAvaliacao" "TipoAvaliacao" NOT NULL DEFAULT 'nota';
