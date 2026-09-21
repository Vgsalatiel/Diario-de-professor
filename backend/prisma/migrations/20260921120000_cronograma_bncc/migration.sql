-- AlterTable
ALTER TABLE "planos_de_aula" DROP COLUMN "bnccCodigo",
DROP COLUMN "bnccTexto",
ADD COLUMN     "cronograma" JSONB;

-- AlterTable
ALTER TABLE "registros_aula" ADD COLUMN     "planoItemNumero" INTEGER,
ADD COLUMN     "bnccCodigo" TEXT,
ADD COLUMN     "bnccTexto" TEXT;
