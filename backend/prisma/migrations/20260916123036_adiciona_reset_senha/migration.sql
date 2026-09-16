-- AlterTable
ALTER TABLE "professores" ADD COLUMN     "resetSenhaExpiraEm" TIMESTAMP(3),
ADD COLUMN     "resetSenhaTokenHash" TEXT;
