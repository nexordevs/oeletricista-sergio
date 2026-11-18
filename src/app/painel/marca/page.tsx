import { prisma } from "@/lib/db";
import { panelContext } from "@/lib/panel";
import { hasFeature } from "@/lib/access";
import { BrandForm } from "./BrandForm";

export default async function Marca() {
  const { user, access } = await panelContext();
  const b = await prisma.brand.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, professionalName: user.name } });
  const { logo, signature, ...rest } = b;
  return <BrandForm full={hasFeature(access, "brandFull")} b={{ ...rest, hasLogo: Boolean(logo), hasSignature: Boolean(signature), v: b.updatedAt.getTime() }} />;
}
