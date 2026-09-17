-- Troca a coluna "materia" (texto único) por "materias" (lista) — um
-- professor pode dar aula de mais de uma matéria. Preserva os dados
-- existentes migrando cada valor único pra uma lista de 1 item.

ALTER TABLE "professores" ADD COLUMN "materias" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "professores"
SET "materias" = ARRAY["materia"]
WHERE "materia" IS NOT NULL AND "materia" <> '';

ALTER TABLE "professores" DROP COLUMN "materia";

ALTER TABLE "professores" ALTER COLUMN "materias" DROP DEFAULT;
