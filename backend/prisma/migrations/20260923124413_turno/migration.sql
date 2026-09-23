-- CreateEnum
CREATE TYPE "Turno" AS ENUM ('manha', 'tarde', 'noite');

-- AlterTable
ALTER TABLE "turmas" ADD COLUMN     "turno" "Turno";
