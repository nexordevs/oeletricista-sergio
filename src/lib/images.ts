import "server-only";
import sharp from "sharp";
const MAX_BYTES = 6 * 1024 * 1024;
const OK = ["image/png", "image/jpeg", "image/webp"];
export class ImageError extends Error {}
/** Valida e reprocessa a imagem no servidor (remove metadados, limita tamanho). */
export async function processImage(file: File, opts: { maxW: number; maxH?: number; format: "png" | "webp" }) {
  if (!OK.includes(file.type)) throw new ImageError("Envie uma imagem PNG, JPG ou WEBP.");
  if (file.size > MAX_BYTES) throw new ImageError("Imagem muito grande (máximo 6 MB).");
  const buf = Buffer.from(await file.arrayBuffer());
  let img = sharp(buf, { failOn: "error" }).rotate().resize({ width: opts.maxW, height: opts.maxH ?? opts.maxW, fit: "inside", withoutEnlargement: true });
  img = opts.format === "png" ? img.png({ compressionLevel: 9 }) : img.webp({ quality: 80 });
  try {
    const { data, info } = await img.toBuffer({ resolveWithObject: true });
    return { data, mime: `image/${opts.format}`, width: info.width, height: info.height };
  } catch { throw new ImageError("Não foi possível ler a imagem."); }
}
