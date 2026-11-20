-- Catálogo de materiais: serviços e materiais na mesma tabela, separados por "kind".
ALTER TABLE "ServiceTemplate" ADD COLUMN "kind" "ItemKind" NOT NULL DEFAULT 'SERVICE';
ALTER TABLE "UserService" ADD COLUMN "kind" "ItemKind" NOT NULL DEFAULT 'SERVICE';
CREATE INDEX "UserService_userId_kind_idx" ON "UserService"("userId", "kind");
