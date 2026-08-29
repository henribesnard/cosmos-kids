import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = resolve(SCRIPT_DIR, "..");
export const PACK_DIR = join(
  ROOT_DIR,
  "public",
  "assets",
  "textures",
  "solar-system",
  "sss-2k",
);
export const MANIFEST_PATH = join(PACK_DIR, "manifest.json");

const DEFAULT_HEADERS = Object.freeze({
  Accept: "image/avif,image/webp,image/png,image/jpeg,image/tiff,*/*;q=0.8",
  Referer: "https://www.solarsystemscope.com/textures/",
  "User-Agent": "COSMOS-KIDS-asset-fetcher/1.0 (+local vendoring; contact project maintainer)",
});

const RETRYABLE_STATUS = new Set([403, 408, 425, 429, 500, 502, 503, 504]);

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readUInt16(buffer, offset, littleEndian) {
  return littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
}

function readUInt32(buffer, offset, littleEndian) {
  return littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
}

function inspectJpeg(buffer) {
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (offset + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      return {
        mimeType: "image/jpeg",
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }
    if (segmentLength < 2) break;
    offset += segmentLength;
  }
  throw new Error("JPEG dimensions could not be read");
}

function inspectTiff(buffer) {
  const byteOrder = buffer.toString("ascii", 0, 2);
  const littleEndian = byteOrder === "II";
  if (!littleEndian && byteOrder !== "MM") throw new Error("Invalid TIFF byte order");
  if (readUInt16(buffer, 2, littleEndian) !== 42) throw new Error("Invalid TIFF signature");

  const ifdOffset = readUInt32(buffer, 4, littleEndian);
  const entryCount = readUInt16(buffer, ifdOffset, littleEndian);
  let width;
  let height;

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    const tag = readUInt16(buffer, entryOffset, littleEndian);
    if (tag !== 256 && tag !== 257) continue;
    const type = readUInt16(buffer, entryOffset + 2, littleEndian);
    const count = readUInt32(buffer, entryOffset + 4, littleEndian);
    if (count !== 1 || (type !== 3 && type !== 4)) {
      throw new Error(`Unsupported TIFF dimension tag type=${type} count=${count}`);
    }
    const value =
      type === 3
        ? readUInt16(buffer, entryOffset + 8, littleEndian)
        : readUInt32(buffer, entryOffset + 8, littleEndian);
    if (tag === 256) width = value;
    if (tag === 257) height = value;
  }

  if (!width || !height) throw new Error("TIFF dimensions could not be read");
  return { mimeType: "image/tiff", width, height };
}

export function inspectImage(buffer) {
  if (
    buffer.length >= 24 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return {
      mimeType: "image/png",
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return inspectJpeg(buffer);
  }
  if (
    buffer.length >= 8 &&
    (buffer.toString("ascii", 0, 4) === "II*\u0000" ||
      buffer.toString("ascii", 0, 4) === "MM\u0000*")
  ) {
    return inspectTiff(buffer);
  }
  throw new Error("Unsupported or invalid image signature");
}

export function verifyBuffer(buffer, expected, label) {
  const actual = {
    byteLength: buffer.byteLength,
    sha256: sha256(buffer),
    ...inspectImage(buffer),
  };
  const mismatches = [];
  for (const key of ["byteLength", "sha256", "mimeType", "width", "height"]) {
    if (expected[key] !== null && expected[key] !== undefined && actual[key] !== expected[key]) {
      mismatches.push(`${key}: expected ${expected[key]}, received ${actual[key]}`);
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`${label} failed verification (${mismatches.join("; ")})`);
  }
  return actual;
}

export async function readPackManifest() {
  return JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
}

export async function fetchWithRetry(url, downloadConfig = {}) {
  const attempts = downloadConfig.attempts ?? 4;
  const initialDelayMs = downloadConfig.initialDelayMs ?? 300;
  const headers = {
    ...DEFAULT_HEADERS,
    Referer: downloadConfig.referer ?? DEFAULT_HEADERS.Referer,
    "User-Agent": downloadConfig.userAgent ?? DEFAULT_HEADERS["User-Agent"],
  };
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers, redirect: "follow" });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      const detail = `${response.status} ${response.statusText}`;
      if (!RETRYABLE_STATUS.has(response.status)) {
        throw new Error(`HTTP ${detail} for ${url}`);
      }
      lastError = new Error(`HTTP ${detail} for ${url}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      await sleep(initialDelayMs * 2 ** (attempt - 1));
    }
  }
  throw new Error(`Download failed after ${attempts} attempts: ${lastError?.message ?? url}`);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertFlatFileName(fileName) {
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName === ".") {
    throw new Error(`Unsafe output file name: ${fileName}`);
  }
}

function findPillowCommand() {
  const candidates = process.platform === "win32"
    ? [["python", []], ["py", ["-3"]]]
    : [["python3", []], ["python", []]];
  for (const [command, prefix] of candidates) {
    const result = spawnSync(command, [...prefix, "-c", "import PIL"], { stdio: "ignore" });
    if (result.status === 0) return { command, prefix };
  }
  return null;
}

function convertTiffToPng(inputPath, outputPath, conversion = {}) {
  const requestedTool = conversion.tool?.toLowerCase();
  const magick = spawnSync("magick", ["-version"], { stdio: "ignore" });
  if (!requestedTool?.startsWith("pillow") && magick.status === 0) {
    const result = spawnSync(
      "magick",
      [inputPath, "-strip", "-define", "png:compression-level=9", outputPath],
      { encoding: "utf8" },
    );
    if (result.status !== 0) {
      throw new Error(`ImageMagick conversion failed: ${result.stderr || result.stdout}`);
    }
    return "ImageMagick";
  }

  if (requestedTool?.startsWith("imagemagick") && magick.status !== 0) {
    throw new Error(`The manifest requires ${conversion.tool}, but \`magick\` is unavailable`);
  }

  const pillow = findPillowCommand();
  if (!pillow) {
    throw new Error("TIFF conversion needs ImageMagick (`magick`) or Python with Pillow");
  }
  const program = [
    "from PIL import Image",
    "import sys",
    "with Image.open(sys.argv[1]) as source:",
    "    image = source.convert('RGB')",
    "    image.save(sys.argv[2], format='PNG', optimize=False, compress_level=9)",
  ].join("\n");
  const result = spawnSync(
    pillow.command,
    [...pillow.prefix, "-c", program, inputPath, outputPath],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Pillow conversion failed: ${result.stderr || result.stdout}`);
  }
  return "Pillow";
}

async function materializeAsset(asset, manifest, force) {
  assertFlatFileName(asset.output.fileName);
  const outputPath = join(PACK_DIR, asset.output.fileName);

  if (!force && asset.output.sha256 && (await fileExists(outputPath))) {
    try {
      const existing = await readFile(outputPath);
      const verified = verifyBuffer(existing, asset.output, `${asset.id} local output`);
      return { id: asset.id, action: "cached", ...verified };
    } catch {
      // A stale or partial local file is replaced from the verified upstream source.
    }
  }

  const sourceBuffer = await fetchWithRetry(asset.source.url, manifest.download);
  const sourceVerification = verifyBuffer(sourceBuffer, asset.source, `${asset.id} source`);
  let outputBuffer = sourceBuffer;
  let converter = null;

  if (asset.conversion?.kind === "tiff-to-png") {
    const temporaryStem = `.cosmos-kids-${process.pid}-${asset.id}`;
    const temporaryTiff = join(PACK_DIR, `${temporaryStem}.tif`);
    const temporaryPng = join(PACK_DIR, `${temporaryStem}.png`);
    try {
      await writeFile(temporaryTiff, sourceBuffer);
      converter = convertTiffToPng(temporaryTiff, temporaryPng, asset.conversion);
      outputBuffer = await readFile(temporaryPng);
    } finally {
      await rm(temporaryTiff, { force: true });
      await rm(temporaryPng, { force: true });
    }
  }

  const outputVerification = verifyBuffer(outputBuffer, asset.output, `${asset.id} output`);
  await writeFile(outputPath, outputBuffer);
  return {
    id: asset.id,
    action: "downloaded",
    converter,
    sourceSha256: sourceVerification.sha256,
    ...outputVerification,
  };
}

export async function downloadAssets({ force = false } = {}) {
  const manifest = await readPackManifest();
  await mkdir(PACK_DIR, { recursive: true });
  const results = [];
  for (const asset of manifest.assets) {
    const result = await materializeAsset(asset, manifest, force);
    results.push(result);
    const conversion = result.converter ? ` via ${result.converter}` : "";
    console.log(
      `${result.action.padEnd(10)} ${result.id.padEnd(28)} ${result.width}x${result.height} ` +
        `${result.byteLength} bytes ${result.sha256}${conversion}`,
    );
  }
  return results;
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  downloadAssets({ force: process.argv.includes("--force") }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
