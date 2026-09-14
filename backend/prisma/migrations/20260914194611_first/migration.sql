-- CreateEnum
CREATE TYPE "SistemaPeriodo" AS ENUM ('bimestre', 'trimestre', 'semestre');

-- CreateEnum
CREATE TYPE "SituacaoMatricula" AS ENUM ('ativo', 'inativo', 'transferido');

-- CreateEnum
CREATE TYPE "ModeloCalculo" AS ENUM ('simples', 'ponderada');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('prova', 'trabalho', 'reuniao', 'outro');

-- CreateTable
CREATE TABLE "professores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "materia" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "anoLetivo" TEXT NOT NULL,
    "escola" TEXT NOT NULL,
    "sistemaPeriodo" "SistemaPeriodo" NOT NULL,
    "cor" TEXT NOT NULL,
    "diasAula" INTEGER[],
    "professorId" TEXT NOT NULL,

    CONSTRAINT "turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefonePais" TEXT,
    "matricula" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "situacao" "SituacaoMatricula" NOT NULL DEFAULT 'ativo',
    "turmaId" TEXT NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacoes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "periodo" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,

    CONSTRAINT "avaliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" TEXT NOT NULL,
    "valor" DOUBLE PRECISION,
    "alunoId" TEXT NOT NULL,
    "avaliacaoId" TEXT NOT NULL,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datas_aula" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "periodo" TEXT NOT NULL,
    "semAula" BOOLEAN NOT NULL DEFAULT false,
    "turmaId" TEXT NOT NULL,

    CONSTRAINT "datas_aula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frequencias" (
    "id" TEXT NOT NULL,
    "presente" BOOLEAN,
    "alunoId" TEXT NOT NULL,
    "dataAulaId" TEXT NOT NULL,

    CONSTRAINT "frequencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configs_calculo" (
    "id" TEXT NOT NULL,
    "modelo" "ModeloCalculo" NOT NULL DEFAULT 'simples',
    "mediaAprovacao" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "turmaId" TEXT NOT NULL,

    CONSTRAINT "configs_calculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "data" DATE NOT NULL,
    "hora" TEXT,
    "conteudo" TEXT,
    "turmaId" TEXT,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professores_email_key" ON "professores"("email");

-- CreateIndex
CREATE INDEX "turmas_professorId_idx" ON "turmas"("professorId");

-- CreateIndex
CREATE INDEX "alunos_turmaId_idx" ON "alunos"("turmaId");

-- CreateIndex
CREATE INDEX "avaliacoes_turmaId_idx" ON "avaliacoes"("turmaId");

-- CreateIndex
CREATE UNIQUE INDEX "notas_alunoId_avaliacaoId_key" ON "notas"("alunoId", "avaliacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "datas_aula_turmaId_data_key" ON "datas_aula"("turmaId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "frequencias_alunoId_dataAulaId_key" ON "frequencias"("alunoId", "dataAulaId");

-- CreateIndex
CREATE UNIQUE INDEX "configs_calculo_turmaId_key" ON "configs_calculo"("turmaId");

-- CreateIndex
CREATE INDEX "eventos_turmaId_idx" ON "eventos"("turmaId");

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_avaliacaoId_fkey" FOREIGN KEY ("avaliacaoId") REFERENCES "avaliacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datas_aula" ADD CONSTRAINT "datas_aula_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequencias" ADD CONSTRAINT "frequencias_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequencias" ADD CONSTRAINT "frequencias_dataAulaId_fkey" FOREIGN KEY ("dataAulaId") REFERENCES "datas_aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configs_calculo" ADD CONSTRAINT "configs_calculo_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
