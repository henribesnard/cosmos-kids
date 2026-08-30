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
import {
  GAIA_PACK_DIR,
  readGaiaManifest,
  renderAttributionDocuments,
} from "./generate-attributions.mjs";

const RUNTIME_MANIFEST_PATH = join(ROOT_DIR, "data", "manifests", "assets.manifest.json");
const PACKS = Object.freeze({
  "solar-system-scope-2k": {
    directory: PACK_DIR,
    manifestUrl: "/assets/textures/solar-system/sss-2k/manifest.json",
    assetBaseUrl: "/assets/textures/solar-system/sss-2k/",
    expectedAssets: 16,
  },
  "esa-gaia-milky-way-2025": {
    directory: GAIA_PACK_DIR,
    manifestUrl: "/assets/textures/milky-way/esa-gaia-2025/manifest.json",
    assetBaseUrl: "/assets/textures/milky-way/esa-gaia-2025/",
    expectedAssets: 1,
  },
});

async function validateAttributionDocuments(solarManifest, gaiaManifest) {
  for (const [filePath, expected] of renderAttributionDocuments(solarManifest, gaiaManifest)) {
    const current = await readFile(filePath, "utf8");
    if (current !== expected) throw new Error(`Generated attribution is stale: ${filePath}`);
  }
}

async function validateRuntimeManifest(manifests) {
  const runtime = JSON.parse(await readFile(RUNTIME_MANIFEST_PATH, "utf8"));
  const runtimeById = new Map(runtime.assets.map((asset) => [asset.id, asset]));

  for (const manifest of manifests) {
    const configuration = PACKS[manifest.id];
    const pack = runtime.packs.find((candidate) => candidate.id === manifest.id);
    if (!pack) throw new Error(`Runtime manifest is missing pack ${manifest.id}`);
    if (pack.manifestUrl !== configuration.manifestUrl) {
      throw new Error(`Unexpected runtime manifest URL for ${manifest.id}: ${pack.manifestUrl}`);
    }

    for (const asset of manifest.assets) {
      const runtimeAsset = runtimeById.get(asset.id);
      if (!runtimeAsset) throw new Error(`Runtime manifest is missing asset ${asset.id}`);
      const expectedUrl = `${configuration.assetBaseUrl}${asset.output.fileName}`;
      if (runtimeAsset.url !== expectedUrl) {
        throw new Error(`${asset.id} runtime URL expected ${expectedUrl}, received ${runtimeAsset.url}`);
      }
      if (runtimeAsset.sha256 !== asset.output.sha256) {
        throw new Error(`${asset.id} runtime SHA-256 does not match the pack manifest`);
      }
    }
  }
}

async function validatePack(manifest, { directory, expectedAssets }, { remote }) {
  if (manifest.assets.length !== expectedAssets) {
    throw new Error(
      `Expected ${expectedAssets} assets in ${manifest.id}, received ${manifest.assets.length}`,
    );
  }
  const seenIds = new Set();
  const seenOutputs = new Set();

  for (const asset of manifest.assets) {
    if (seenIds.has(asset.id)) throw new Error(`Duplicate asset id in ${manifest.id}: ${asset.id}`);
    if (seenOutputs.has(asset.output.fileName)) {
      throw new Error(`Duplicate output file in ${manifest.id}: ${asset.output.fileName}`);
    }
    seenIds.add(asset.id);
    seenOutputs.add(asset.output.fileName);
    if (!asset.output.sha256 || !asset.output.byteLength) {
      throw new Error(`${asset.id} is missing its final hash or byte length`);
    }

    const localBuffer = await readFile(join(directory, asset.output.fileName));
    const local = verifyBuffer(localBuffer, asset.output, `${asset.id} local output`);
    console.log(
      `local  ${asset.id.padEnd(36)} ${local.width}x${local.height} ` +
        `${local.byteLength} bytes ${local.sha256}`,
    );

    if (remote) {
      const sourceBuffer = await fetchWithRetry(asset.source.url, manifest.download ?? {});
      const source = verifyBuffer(sourceBuffer, asset.source, `${asset.id} remote source`);
      console.log(
        `remote ${asset.id.padEnd(36)} ${source.width}x${source.height} ` +
          `${source.byteLength} bytes ${source.sha256}`,
      );
    }
  }
}

export async function validateAssets({ remote = false } = {}) {
  const [solarManifest, gaiaManifest] = await Promise.all([
    readPackManifest(),
    readGaiaManifest(),
  ]);
  const manifests = [solarManifest, gaiaManifest];

  for (const manifest of manifests) {
    const configuration = PACKS[manifest.id];
    if (!configuration) throw new Error(`No validator configuration for asset pack ${manifest.id}`);
    await validatePack(manifest, configuration, { remote });
  }

  await validateRuntimeManifest(manifests);
  await validateAttributionDocuments(solarManifest, gaiaManifest);
  const totalAssets = manifests.reduce((total, manifest) => total + manifest.assets.length, 0);
  console.log(
    `validated ${totalAssets} assets across ${manifests.length} packs, runtime catalogue, and attributions`,
  );
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
