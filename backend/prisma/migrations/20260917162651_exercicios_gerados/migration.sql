-- CreateTable
CREATE TABLE "exercicios_gerados" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "dificuldade" TEXT,
    "questoes" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alunoId" TEXT NOT NULL,

    CONSTRAINT "exercicios_gerados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercicios_gerados_alunoId_idx" ON "exercicios_gerados"("alunoId");

-- AddForeignKey
ALTER TABLE "exercicios_gerados" ADD CONSTRAINT "exercicios_gerados_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
