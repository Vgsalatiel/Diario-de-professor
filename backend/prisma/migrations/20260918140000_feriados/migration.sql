-- Dia sem aula (feriado/recesso/ponto facultativo) marcado na Agenda,
-- valendo pra todas as turmas do professor.
CREATE TABLE "feriados" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "titulo" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,

    CONSTRAINT "feriados_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feriados_professorId_idx" ON "feriados"("professorId");

CREATE UNIQUE INDEX "feriados_professorId_data_key" ON "feriados"("professorId", "data");

ALTER TABLE "feriados" ADD CONSTRAINT "feriados_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
