-- CreateTable
CREATE TABLE "acompanhamentos_aluno" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alunoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,

    CONSTRAINT "acompanhamentos_aluno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acompanhamentos_aluno_alunoId_idx" ON "acompanhamentos_aluno"("alunoId");

-- AddForeignKey
ALTER TABLE "acompanhamentos_aluno" ADD CONSTRAINT "acompanhamentos_aluno_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acompanhamentos_aluno" ADD CONSTRAINT "acompanhamentos_aluno_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
