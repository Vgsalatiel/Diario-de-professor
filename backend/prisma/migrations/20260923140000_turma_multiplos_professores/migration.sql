-- CreateTable: uma turma pode ter vários professores (um por disciplina)
CREATE TABLE "turmas_professores" (
    "id" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turmas_professores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "turmas_professores_turmaId_professorId_key" ON "turmas_professores"("turmaId", "professorId");

ALTER TABLE "turmas_professores" ADD CONSTRAINT "turmas_professores_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "turmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "turmas_professores" ADD CONSTRAINT "turmas_professores_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada turma existente vira uma atribuição pro professor que já era dela
INSERT INTO "turmas_professores" ("id", "turmaId", "professorId", "disciplina", "criadoEm")
SELECT gen_random_uuid()::text, "id", "professorId", COALESCE("disciplina", 'Não definida'), now()
FROM "turmas";

-- Avaliacao, DataAula, RegistroAula, PlanoDeAula e ConfigCalculo ganham
-- professorId direto (cada disciplina tem seu próprio recorte dentro da
-- turma) -- backfill a partir do professor que a turma já tinha.
ALTER TABLE "avaliacoes" ADD COLUMN "professorId" TEXT;
UPDATE "avaliacoes" SET "professorId" = (SELECT "professorId" FROM "turmas" WHERE "turmas"."id" = "avaliacoes"."turmaId");
ALTER TABLE "avaliacoes" ALTER COLUMN "professorId" SET NOT NULL;
CREATE INDEX "avaliacoes_professorId_idx" ON "avaliacoes"("professorId");
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "datas_aula" ADD COLUMN "professorId" TEXT;
UPDATE "datas_aula" SET "professorId" = (SELECT "professorId" FROM "turmas" WHERE "turmas"."id" = "datas_aula"."turmaId");
ALTER TABLE "datas_aula" ALTER COLUMN "professorId" SET NOT NULL;
DROP INDEX "datas_aula_turmaId_data_key";
CREATE UNIQUE INDEX "datas_aula_turmaId_professorId_data_key" ON "datas_aula"("turmaId", "professorId", "data");
CREATE INDEX "datas_aula_professorId_idx" ON "datas_aula"("professorId");
ALTER TABLE "datas_aula" ADD CONSTRAINT "datas_aula_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "registros_aula" ADD COLUMN "professorId" TEXT;
UPDATE "registros_aula" SET "professorId" = (SELECT "professorId" FROM "turmas" WHERE "turmas"."id" = "registros_aula"."turmaId");
ALTER TABLE "registros_aula" ALTER COLUMN "professorId" SET NOT NULL;
DROP INDEX "registros_aula_turmaId_data_key";
CREATE UNIQUE INDEX "registros_aula_turmaId_professorId_data_key" ON "registros_aula"("turmaId", "professorId", "data");
CREATE INDEX "registros_aula_professorId_idx" ON "registros_aula"("professorId");
ALTER TABLE "registros_aula" ADD CONSTRAINT "registros_aula_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "planos_de_aula" ADD COLUMN "professorId" TEXT;
UPDATE "planos_de_aula" SET "professorId" = (SELECT "professorId" FROM "turmas" WHERE "turmas"."id" = "planos_de_aula"."turmaId");
ALTER TABLE "planos_de_aula" ALTER COLUMN "professorId" SET NOT NULL;
CREATE INDEX "planos_de_aula_professorId_idx" ON "planos_de_aula"("professorId");
ALTER TABLE "planos_de_aula" ADD CONSTRAINT "planos_de_aula_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "configs_calculo" ADD COLUMN "professorId" TEXT;
UPDATE "configs_calculo" SET "professorId" = (SELECT "professorId" FROM "turmas" WHERE "turmas"."id" = "configs_calculo"."turmaId");
ALTER TABLE "configs_calculo" ALTER COLUMN "professorId" SET NOT NULL;
DROP INDEX "configs_calculo_turmaId_key";
CREATE UNIQUE INDEX "configs_calculo_turmaId_professorId_key" ON "configs_calculo"("turmaId", "professorId");
ALTER TABLE "configs_calculo" ADD CONSTRAINT "configs_calculo_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "professores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Turma deixa de ter dono único -- professorId e disciplina somem daqui
-- (disciplina agora mora em turmas_professores, por atribuição).
ALTER TABLE "turmas" DROP CONSTRAINT "turmas_professorId_fkey";
DROP INDEX "turmas_professorId_idx";
ALTER TABLE "turmas" DROP COLUMN "professorId";
ALTER TABLE "turmas" DROP COLUMN "disciplina";
