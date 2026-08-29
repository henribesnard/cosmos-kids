import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PACK_DIR,
  ROOT_DIR,
  fetchWithRetry,
  readPackManifest,
  verifyBuffer,
} from "./download-assets.mjs";
import { renderAttributionDocuments } from "./generate-attributions.mjs";

const RUNTIME_MANIFEST_PATH = join(ROOT_DIR, "data", "manifests", "assets.manifest.json");

async function validateAttributionDocuments(manifest) {
  for (const [filePath, expected] of renderAttributionDocuments(manifest)) {
    const current = await readFile(filePath, "utf8");
    if (current !== expected) throw new Error(`Generated attribution is stale: ${filePath}`);
  }
}

async function validateRuntimeManifest(manifest) {
  const runtime = JSON.parse(await readFile(RUNTIME_MANIFEST_PATH, "utf8"));
  const pack = runtime.packs.find((candidate) => candidate.id === manifest.id);
  if (!pack) throw new Error(`Runtime manifest is missing pack ${manifest.id}`);
  if (pack.manifestUrl !== "/assets/textures/solar-system/sss-2k/manifest.json") {
    throw new Error(`Unexpected runtime manifest URL for ${manifest.id}: ${pack.manifestUrl}`);
  }
  const runtimeById = new Map(runtime.assets.map((asset) => [asset.id, asset]));
  for (const asset of manifest.assets) {
    const runtimeAsset = runtimeById.get(asset.id);
    if (!runtimeAsset) throw new Error(`Runtime manifest is missing asset ${asset.id}`);
    const expectedUrl = `/assets/textures/solar-system/sss-2k/${asset.output.fileName}`;
    if (runtimeAsset.url !== expectedUrl) {
      throw new Error(`${asset.id} runtime URL expected ${expectedUrl}, received ${runtimeAsset.url}`);
    }
    if (runtimeAsset.sha256 !== asset.output.sha256) {
      throw new Error(`${asset.id} runtime SHA-256 does not match the pack manifest`);
    }
  }
}

export async function validateAssets({ remote = false } = {}) {
  const manifest = await readPackManifest();
  if (manifest.assets.length !== 16) {
    throw new Error(`Expected 16 V1 assets, received ${manifest.assets.length}`);
  }
  const seenIds = new Set();
  const seenOutputs = new Set();

  for (const asset of manifest.assets) {
    if (seenIds.has(asset.id)) throw new Error(`Duplicate asset id: ${asset.id}`);
    if (seenOutputs.has(asset.output.fileName)) {
      throw new Error(`Duplicate output file: ${asset.output.fileName}`);
    }
    seenIds.add(asset.id);
    seenOutputs.add(asset.output.fileName);
    if (!asset.output.sha256 || !asset.output.byteLength) {
      throw new Error(`${asset.id} is missing its final hash or byte length`);
    }

    const localBuffer = await readFile(join(PACK_DIR, asset.output.fileName));
    const local = verifyBuffer(localBuffer, asset.output, `${asset.id} local output`);
    console.log(
      `local  ${asset.id.padEnd(28)} ${local.width}x${local.height} ` +
        `${local.byteLength} bytes ${local.sha256}`,
    );

    if (remote) {
      const sourceBuffer = await fetchWithRetry(asset.source.url, manifest.download);
      const source = verifyBuffer(sourceBuffer, asset.source, `${asset.id} remote source`);
      console.log(
        `remote ${asset.id.padEnd(28)} ${source.width}x${source.height} ` +
          `${source.byteLength} bytes ${source.sha256}`,
      );
    }
  }

  await validateRuntimeManifest(manifest);
  await validateAttributionDocuments(manifest);
  console.log(`validated ${manifest.assets.length} assets, runtime catalogue, and attributions`);
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  validateAssets({ remote: process.argv.includes("--remote") }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
