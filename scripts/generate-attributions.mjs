import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PACK_DIR, ROOT_DIR, readPackManifest } from "./download-assets.mjs";

export const GAIA_PACK_DIR = join(
  ROOT_DIR,
  "public",
  "assets",
  "textures",
  "milky-way",
  "esa-gaia-2025",
);

const REID_PAPER_URL = "https://doi.org/10.3847/1538-4357/ab4a11";
const OUTPUTS = Object.freeze({
  solarPack: join(PACK_DIR, "ATTRIBUTION.md"),
  gaiaPack: join(GAIA_PACK_DIR, "ATTRIBUTION.md"),
  root: join(ROOT_DIR, "ATTRIBUTIONS.md"),
  dataSources: join(ROOT_DIR, "docs", "DATA_SOURCES.md"),
});

export async function readGaiaManifest() {
  return JSON.parse(await readFile(join(GAIA_PACK_DIR, "manifest.json"), "utf8"));
}

function solarPackAttribution(manifest) {
  const rows = manifest.assets
    .map(
      (asset) =>
        `| \`${asset.output.fileName}\` | ${asset.body} | ${asset.role} | ` +
        `[\`${asset.source.fileName}\`](${asset.source.url}) | \`${asset.source.sha256}\` |`,
    )
    .join("\n");
  return `# Solar System Scope 2K textures

These files are vendored for COSMOS KIDS so the application does not hotlink the source service.

## Required attribution

> ${manifest.license.attributionText}

- Source: [${manifest.source.name}](${manifest.source.pageUrl})
- License: [${manifest.license.name}](${manifest.license.url})
- Retrieved and verified: ${manifest.retrievedAt}
- Local changes: ${manifest.license.changeNotice}

## File provenance

| Local file | Body | Role | Upstream file | Upstream SHA-256 |
| --- | --- | --- | --- | --- |
${rows}

The SHA-256 values above describe the downloaded upstream files. Runtime hashes, dimensions, and conversion details are recorded in [manifest.json](./manifest.json).
`;
}

function gaiaPackAttribution(manifest) {
  const asset = manifest.assets[0];
  return `# ESA/Gaia Milky Way face-on artist impression

This file is vendored for COSMOS KIDS so the application does not hotlink the source service.

## Required attribution

> ${manifest.license.attributionText}

- Source page: [ESA — The best Milky Way map by Gaia](${manifest.source.pageUrl})
- Direct source file: [${asset.source.fileName}](${asset.source.url})
- Credit: ${manifest.source.name}
- License: [${manifest.license.name}](${manifest.license.url})
- Retrieved and verified: ${manifest.retrievedAt}
- Local change: the source file was renamed \`${asset.output.fileName}\`; image pixels are unchanged.

## Scientific status

This image is a face-on **artist’s impression based on Gaia data**, not a photograph of the Milky Way seen from outside. COSMOS KIDS must identify it as an illustration or reconstructed view.

The interactive spiral-arm geometry is a separate scientific reconstruction informed by Reid et al. (2019), [“Trigonometric Parallaxes of High-mass Star-forming Regions: Our View of the Milky Way”](${REID_PAPER_URL}). It is not extracted from this JPEG and must not be described as an exact reproduction of the Gaia illustration.

## File provenance

| Local file | Role | Upstream file | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | --- | ---: | --- |
| \`${asset.output.fileName}\` | Face-on artist-impression reference | [\`${asset.source.fileName}\`](${asset.source.url}) | ${asset.output.width} × ${asset.output.height} | ${asset.output.byteLength.toLocaleString("en-US")} | \`${asset.output.sha256}\` |
`;
}

function rootAttribution(solarManifest, gaiaManifest) {
  return `# Third-party attributions

## Solar System Scope — Solar Textures

> ${solarManifest.license.attributionText}

The V1 Sun, Moon, planet, Earth-layer, and Saturn-ring textures come from [Solar System Scope](${solarManifest.source.pageUrl}) under [${solarManifest.license.name}](${solarManifest.license.url}). They are stored locally under [\`public/assets/textures/solar-system/sss-2k/\`](./public/assets/textures/solar-system/sss-2k/) with a per-file provenance manifest.

## ESA/Gaia — The best Milky Way map by Gaia

> ${gaiaManifest.license.attributionText}

The Milky Way face-on reference comes from [ESA/Gaia](${gaiaManifest.source.pageUrl}) under [${gaiaManifest.license.name}](${gaiaManifest.license.url}). It is stored locally under [\`public/assets/textures/milky-way/esa-gaia-2025/\`](./public/assets/textures/milky-way/esa-gaia-2025/) with a per-file provenance manifest.

This image is an **artist’s impression based on Gaia data**, not a photograph of the Milky Way seen from outside. The interactive spiral-arm geometry is a separate reconstruction informed by Reid et al. (2019), [DOI 10.3847/1538-4357/ab4a11](${REID_PAPER_URL}), and is not derived from the JPEG pixels.

No endorsement by Solar System Scope, INOVE, ESA, Gaia DPAC, NASA, or Creative Commons is implied.
`;
}

function dataSources(solarManifest, gaiaManifest) {
  const caveats = [...solarManifest.scientificCaveats, ...gaiaManifest.scientificCaveats]
    .map((caveat) => `- ${caveat}`)
    .join("\n");
  const gaiaAsset = gaiaManifest.assets[0];
  return `# COSMOS KIDS data and media sources

## V1 planetary texture baseline

| Field | Value |
| --- | --- |
| Dataset | ${solarManifest.title} |
| Provider | [${solarManifest.source.name}](${solarManifest.source.pageUrl}) |
| Scope | Sun, Moon, eight planets, layered Earth, Venus atmosphere, Saturn rings |
| Projection | Equirectangular for globes; Saturn rings use a radial RGBA strip |
| Resolution | 2048 × 1024 for globe maps; 2048 × 125 for Saturn rings |
| License | [${solarManifest.license.name}](${solarManifest.license.url}) |
| Canonical manifest | [\`public/assets/textures/solar-system/sss-2k/manifest.json\`](../public/assets/textures/solar-system/sss-2k/manifest.json) |
| Runtime catalogue | [\`data/manifests/assets.manifest.json\`](../data/manifests/assets.manifest.json) |

The source files are downloaded and hash-checked by \`scripts/download-assets.mjs\`. Local files are checked by \`scripts/validate-assets.mjs\`; pass \`--remote\` to verify the live upstream bytes as well. Attribution documents are reproducibly generated by \`scripts/generate-attributions.mjs\`.

## Milky Way face-on visual reference

| Field | Value |
| --- | --- |
| Image | The best Milky Way map by Gaia |
| Provider and credit | [${gaiaManifest.source.name}](${gaiaManifest.source.pageUrl}) |
| Scientific status | Face-on artist’s impression based on Gaia data; not a photograph from outside the Galaxy |
| Local role | Visual reference for the Milky Way view |
| Resolution | ${gaiaAsset.output.width} × ${gaiaAsset.output.height} JPEG |
| License | [${gaiaManifest.license.name}](${gaiaManifest.license.url}) |
| Canonical manifest | [\`public/assets/textures/milky-way/esa-gaia-2025/manifest.json\`](../public/assets/textures/milky-way/esa-gaia-2025/manifest.json) |
| Runtime catalogue | [\`data/manifests/assets.manifest.json\`](../data/manifests/assets.manifest.json) |

### Interactive spiral-arm reconstruction

The interactive geometry is not traced from the ESA/Gaia JPEG. It is a separate, simplified reconstruction informed by Reid et al. (2019), [“Trigonometric Parallaxes of High-mass Star-forming Regions: Our View of the Milky Way”](${REID_PAPER_URL}). Arm centre lines, widths, extents, labels, and the Sun’s placement therefore represent an educational model with scientific uncertainty, not exact borders or a literal Gaia map.

The interface must keep these two layers explicit:

- **ESA/Gaia image:** an artist’s face-on interpretation based on Gaia observations;
- **interactive geometry:** a separate parameterised reconstruction based primarily on the maser-parallax model reported by Reid et al. (2019).

## Processing

- Source JPEG and Saturn-ring PNG pixels are preserved; files are only renamed locally.
- Earth normal and specular maps are converted from TIFF to RGB PNG because browsers do not reliably decode TIFF.
- Color and emissive maps are intended for sRGB sampling. Normal and specular maps are data textures and must use a linear/no-color-space interpretation.
- Earth clouds are an opaque grayscale JPEG; use luminance as opacity. Saturn rings contain meaningful RGB and alpha channels.
- The ESA/Gaia Milky Way JPEG is stored byte-for-byte under a local file name; the interactive arm overlay is generated separately in code.

## Scientific and pedagogical caveats

${caveats}

These media packs provide a coherent visual baseline, not a time-resolved or uniformly instrument-traceable scientific dataset. UI copy must distinguish natural color, enhanced color, radar-derived views, composites, artist impressions, and reconstructed areas.
`;
}

export function renderAttributionDocuments(solarManifest, gaiaManifest) {
  return new Map([
    [OUTPUTS.solarPack, solarPackAttribution(solarManifest)],
    [OUTPUTS.gaiaPack, gaiaPackAttribution(gaiaManifest)],
    [OUTPUTS.root, rootAttribution(solarManifest, gaiaManifest)],
    [OUTPUTS.dataSources, dataSources(solarManifest, gaiaManifest)],
  ]);
}

export async function generateAttributions({ check = false } = {}) {
  const [solarManifest, gaiaManifest] = await Promise.all([
    readPackManifest(),
    readGaiaManifest(),
  ]);
  const rendered = renderAttributionDocuments(solarManifest, gaiaManifest);
  let differences = 0;
  for (const [filePath, content] of rendered) {
    let current = null;
    try {
      current = await readFile(filePath, "utf8");
    } catch {
      // Missing output is reported in check mode or created in write mode.
    }
    if (current === content) {
      console.log(`current    ${filePath}`);
      continue;
    }
    if (check) {
      differences += 1;
      console.error(`outdated   ${filePath}`);
    } else {
      await writeFile(filePath, content, "utf8");
      console.log(`generated  ${filePath}`);
    }
  }
  if (differences > 0) {
    throw new Error(`${differences} attribution document(s) need regeneration`);
  }
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMainModule()) {
  generateAttributions({ check: process.argv.includes("--check") }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
