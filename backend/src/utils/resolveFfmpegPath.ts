/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import { execSync } from "child_process";
import ffmpegStatic from "ffmpeg-static";
import logger from "./logger";

let cachedPath: string | null = null;

const pathExists = (p: string | null | undefined): p is string =>
  !!p && fs.existsSync(p);

const tryInstallerPath = (): string | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const installer = require("@ffmpeg-installer/ffmpeg");
    const p = installer?.path;
    return pathExists(p) ? p : null;
  } catch {
    return null;
  }
};

const trySystemPath = (): string | null => {
  const candidates = [
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "C:\\ffmpeg\\ffmpeg.exe"
  ];
  for (const candidate of candidates) {
    if (pathExists(candidate)) return candidate;
  }
  try {
    const which = execSync("which ffmpeg", { encoding: "utf8" }).trim();
    if (pathExists(which)) return which;
  } catch {
    // ignore
  }
  return null;
};

/**
 * Resolve o binário ffmpeg disponível no ambiente (Docker Alpine, Railway, dev local).
 */
export const resolveFfmpegPath = (): string | null => {
  if (cachedPath && pathExists(cachedPath)) return cachedPath;

  const candidates = [
    trySystemPath(),
    tryInstallerPath(),
    typeof ffmpegStatic === "string" ? ffmpegStatic : null
  ];

  for (const candidate of candidates) {
    if (pathExists(candidate)) {
      cachedPath = candidate;
      logger.info(`[ffmpeg] Usando: ${candidate}`);
      return candidate;
    }
  }

  logger.warn("[ffmpeg] Nenhum binário ffmpeg encontrado.");
  return null;
};

export const configureFfmpeg = (ffmpeg: { setFfmpegPath: (p: string) => void }): boolean => {
  const resolved = resolveFfmpegPath();
  if (resolved) {
    ffmpeg.setFfmpegPath(resolved);
    return true;
  }
  return false;
};
