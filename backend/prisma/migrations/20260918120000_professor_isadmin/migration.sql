-- Conta de diretor(a): entra pelo mesmo login, mas cai no painel de
-- administração em vez do painel de professor.
ALTER TABLE "professores" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
