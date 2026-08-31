/**
 * Gera assets de marca Evoluti: logo claro, escuro e favicon ampliado.
 */
const path = require("path");
const fs = require("fs");

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("Instale sharp: npm install --no-save sharp");
    process.exit(1);
  }

  const assetsDir = path.join(__dirname, "..", "src", "assets");
  const publicDir = path.join(__dirname, "..", "public");
  const source = path.join(assetsDir, "logo-evoluti-crm.png");

  if (!fs.existsSync(source)) {
    console.error("Arquivo fonte não encontrado:", source);
    process.exit(1);
  }

  const meta = await sharp(source).metadata();
  const { width, height } = meta;

  const darkOut = path.join(assetsDir, "logo-evoluti-crm-dark.png");
  const lightOut = path.join(assetsDir, "logo-evoluti-crm-light.png");
  const faviconOut = path.join(assetsDir, "favicon-evoluti.png");

  // Escuro: mantém original (fundo preto + texto branco)
  await sharp(source).png().toFile(darkOut);

  // Claro: fundo transparente + texto preto (ícone colorido preservado)
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  const channels = info.channels;

  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = channels > 3 ? pixels[i + 3] : 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;

    // Fundo preto → transparente
    if (max < 40) {
      pixels[i + 3] = 0;
      continue;
    }

    // Texto branco/claro sem saturação → preto
    if (min > 175 && sat < 55) {
      pixels[i] = 17;
      pixels[i + 1] = 17;
      pixels[i + 2] = 17;
      pixels[i + 3] = a;
    }
  }

  await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toFile(lightOut);

  // Favicon: recorte do ícone (parte esquerda) com menos margem = ícone maior
  const iconWidth = Math.round(width * 0.36);
  const iconBuffer = await sharp(source)
    .extract({ left: 0, top: 0, width: iconWidth, height })
    .png()
    .toBuffer();

  const faviconSize = 192;
  const pad = Math.round(faviconSize * 0.02);
  const inner = faviconSize - pad * 2;

  await sharp(iconBuffer)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(faviconOut);

  for (const dest of [
    path.join(publicDir, "favicon.png"),
    path.join(publicDir, "apple-touch-icon.png"),
  ]) {
    await sharp(faviconOut).resize(192, 192).png().toFile(dest);
  }

  console.log("OK:", { darkOut, lightOut, faviconOut });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
