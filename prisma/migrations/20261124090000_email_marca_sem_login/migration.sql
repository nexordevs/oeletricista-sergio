-- O e-mail da marca era preenchido com o e-mail de login no cadastro.
-- Limpa esses casos: o e-mail do orçamento passa a ser só o definido em "Minha marca".
UPDATE "Brand" b SET email = NULL FROM "User" u
WHERE u.id = b."userId" AND b.email IS NOT NULL AND lower(trim(b.email)) = lower(u.email);
