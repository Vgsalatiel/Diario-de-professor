-- CreateEnum
CREATE TYPE "TipoObservacao" AS ENUM ('comentario', 'solicitacaoCorrecao');

-- AlterTable
ALTER TABLE "observacoes_pedagogicas" ADD COLUMN     "tipo" "TipoObservacao" NOT NULL DEFAULT 'comentario';
ALTER TABLE "observacoes_pedagogicas" ADD COLUMN     "resolvida" BOOLEAN NOT NULL DEFAULT false;
