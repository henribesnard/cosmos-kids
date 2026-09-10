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

## Journey catalogue

Journey facts are frozen at build time; the browser performs no source request. Each scientific quantity stores its URL, attribution, retrieval date and approximation flag. Unless stated otherwise below, the catalogue was checked on 2026-09-05.

| Scope | Primary source | Used for |
| --- | --- | --- |
| ISS | [NASA — Space Station Facts and Figures](https://www.nasa.gov/international-space-station/space-station-facts-and-figures/) | approximate altitude, orbital speed and period, continuous presence, daily sunrises |
| ISS vehicles | [NASA — Visiting Vehicles](https://www.nasa.gov/international-space-station/space-station-visiting-vehicles/) | Soyuz and cargo rendezvous context |
| Crew Dragon | [NASA — Crew-3](https://www.nasa.gov/humans-in-space/what-you-need-to-know-about-nasas-spacex-crew-3-mission/) | representative crewed rendezvous |
| Orbital debris | [ESA — Space Environment Report 2025](https://www.esa.int/Space_Safety/Space_Debris/ESA_Space_Environment_Report_2025) | current order of magnitude for debris larger than 10 cm |
| Low-Earth-orbit radiation | [NASA — Orion Passengers on Artemis I](https://www.nasa.gov/missions/artemis/orion/orion-passengers-on-artemis-i-to-test-radiation-vest-for-deep-space-missions/) | comparison between ground and ISS radiation exposure |
| Earth atmosphere | [NASA — Earth’s Atmosphere](https://science.nasa.gov/earth/earth-atmosphere/) | troposphere altitude |
| Boundary of space | [FAI — Statement about the Kármán Line](https://www.fai.org/page/icare-boundary-space) | conventional 100 km boundary |
| Moon | [NASA — Moon Facts](https://science.nasa.gov/moon/facts/) | mean distance, gravity and surface temperatures |
| Lunar missions | [NASA — Moon Missions](https://science.nasa.gov/moon/missions/) | robotic chronology through IM-2/Athena on March 6, 2025 (checked 2026-09-06) |
| Apollo 11 | [NASA — Mission Overview](https://www.nasa.gov/history/apollo-11-mission-overview/) and [Lunar Surface Journal](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landing.html) | flight sequence, lunar arrival and post-flight estimate of landing propellant |
| Artemis II | [NASA — Artemis II](https://www.nasa.gov/mission/artemis-ii/) | April 2026 crewed lunar flyby and crew |
| Lunar dust | [NASA — Dust: An Out-of-This-World Problem](https://www.nasa.gov/humans-in-space/dust-an-out-of-this-world-problem/) | abrasive and electrostatic lunar regolith |
| Mars | [NASA — Mars Relay Network](https://science.nasa.gov/mars/mars-relay-network/) | 54.6–400.2 million km range and 3–22.4 minute light delay |
| Mars exploration | [NASA — Mars](https://science.nasa.gov/mars/) | cruise, entry and surface environment |
| Future human Mars exploration | [NASA — Moon to Mars](https://www.nasa.gov/humans-in-space/moon-to-mars/) | future status of crewed Mars projects |
| Mars radiation | [NASA — Curiosity Radiation Results](https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/) | surface radiation measurement |
| Mars atmosphere | [NASA — Present-day Mars Atmosphere](https://www.nasa.gov/news-release/mars-terraforming-not-possible-using-present-day-technology/) | approximately 0.6% terrestrial pressure and behaviour of liquid water (checked 2026-09-06) |
| First Mars flyby | [NASA — Mariner 4](https://science.nasa.gov/mission/mariner-4/) | first successful robotic flyby in 1965 |
| Ingenuity | [NASA/JPL — Mission Ends](https://www.jpl.nasa.gov/news/after-three-years-on-mars-nasas-ingenuity-helicopter-mission-ends/) | January 2024 end of mission |
| Mars robots | [NASA — 25 Years of Continuous Robotic Mars Exploration](https://www.nasa.gov/history/25-years-of-continuous-robotic-mars-exploration-from-pathfinder-to-perseverance/) | Mariner, Viking, Curiosity, Perseverance, Ingenuity and Zhurong chronology |
| Solar System | [NASA — Solar System Exploration](https://science.nasa.gov/solar-system/) | outer-planet distances, environments and Solar System journey legs |
| Jupiter | [NASA/JPL — Juno](https://www.jpl.nasa.gov/missions/juno/) | approximately five-year cruise and radiation environment |
| Juno shielding | [NASA/JPL — Installing Juno’s Radiation Vault](https://www.jpl.nasa.gov/images/pia13258-installing-junos-radiation-vault/) | approximately 200 kg titanium radiation vault |
| Cassini mission | [NASA — Cassini Timeline](https://science.nasa.gov/mission/cassini/the-journey/timeline/) | approximately 6.7-year cruise and gravity assists |
| Saturn | [NASA — Saturn Facts](https://science.nasa.gov/saturn/facts/) | approximate distance, light time, and ring composition and particle sizes |
| Pluto | [NASA — New Horizons](https://science.nasa.gov/mission/new-horizons/) | more than nine-year cruise and radioisotope power |
| Uranus and Neptune | [NASA — Voyager 2](https://science.nasa.gov/mission/voyager/voyager-2/) | only spacecraft to visit all four giant planets |
| Interstellar boundary | [NASA — Voyager Interstellar Mission](https://science.nasa.gov/mission/voyager/interstellar-mission/) | Voyager 1 heliopause crossing in 2012 |
| Andromeda | [NASA/Hubble — 2025 reassessment](https://science.nasa.gov/missions/hubble/apocalypse-when-hubble-casts-doubt-on-certainty-of-galactic-collision/) | distance and roughly 50% collision probability within ten billion years |
| Galaxies | [NASA/Hubble — Universe Uncovered](https://science.nasa.gov/mission/hubble/science/universe-uncovered/hubble-galaxies/) | limits of human intergalactic travel |
| Universe | [NASA — Universe Overview](https://science.nasa.gov/universe/overview/) | approximately 13.8-billion-year age comparison |
| Black holes | [NASA — Black Holes](https://science.nasa.gov/universe/black-holes/) | horizon, tidal forces and Sagittarius A* |
| Approaching a black hole | [NASA — What Happens When Something Gets Too Close?](https://science.nasa.gov/universe/what-happens-when-something-gets-too-close-to-a-black-hole/) | gravitational time dilation (checked 2026-09-06) |
| Nearby black hole | [ESA — Gaia BH1](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Gaia_discovers_a_new_family_of_black_holes) | approximately 1,560 light-year distance |
| Black-hole images | [Event Horizon Telescope — M87*](https://eventhorizontelescope.org/press-release-april-10-2019-astronomers-capture-first-image-black-hole) and [Sgr A*](https://eventhorizontelescope.org/blog/astronomers-reveal-first-image-black-hole-heart-our-galaxy) | 2019 and 2022 images; luminous environment and shadow |
| Constellations | [IAU — Astronomy FAQ](https://www.iau.org/IAU/Astronomy-FAQs/FAQs.aspx) | 88 official constellations |
| Orion | [NASA — Orion in three dimensions](https://science.nasa.gov/universe/stories/quick-reads/discovering-the-universe-through-the-constellation-orion/) | stars are not neighbours; approximate distances for Betelgeuse, Alnitak and Rigel |
| Night vision | [NASA — Night Sky Notes](https://science.nasa.gov/solar-system/skywatching/night-sky-network/may2024-night-sky-notes/) | dark adaptation and observing away from bright lights |
| Gaia | [ESA — Gaia](https://www.esa.int/Science_Exploration/Space_Science/Gaia) | catalogue scale and end of science observations in January 2025 |

Conventional walking, car and airliner speeds are deliberately labelled as thought experiments. Parker Solar Probe’s approximately 192 km/s value is explicitly a brief peak near perihelion, sourced from [NASA’s Parker Solar Probe mission page](https://science.nasa.gov/mission/parker-solar-probe/), and never described as cruise performance.
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
