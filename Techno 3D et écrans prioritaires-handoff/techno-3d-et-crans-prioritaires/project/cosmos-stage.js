/* COSMOS KIDS — 3D stage.
   <cosmos-stage> owns the three.js scene, camera rig, picking, labels and camera flights.
   Real 3D for levels 1-3 (Earth system, Solar System, stellar neighbourhood);
   particle staging for levels 4-6 and for the black hole / nebula set pieces.

   Public API
     stage.goToState(id)            -> 'landing'|'earth'|'solar'|'planet'|'star'|'nebula'|'exo'|'blackhole'|'galaxy'|'universe'|'free'
     stage.flyTo(bodyId)            -> Promise, emits cosmos-travel / cosmos-arrive
     stage.setLevel(n)              -> 1..6, crossfades scale shells
     stage.set({orbits, labels, names, timeScale, freeMode})
     stage.snapshot()               -> {level, focus}
   Events (CustomEvent on the element)
     cosmos-hover  {id|null}   cosmos-select {id}
     cosmos-travel {id, name, distance}   cosmos-arrive {id, name}
     cosmos-level  {n}
   Textures are procedural placeholders — swap makeTexture() for real NASA maps later. */

import * as THREE from 'three';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ---------- procedural texture placeholders ---------- */
function noiseCanvas(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fn(x / w, y / h);
    const i = (y * w + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return c;
}
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
const fbm = (x, y, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s; };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

const texCache = new Map();
function makeTexture(kind, hex) {
  const key = kind + hex; if (texCache.has(key)) return texCache.get(key);
  const base = rgb(hex); let cv;
  if (kind === 'earth') {
    const ocean = rgb('#0e3a6e'), deep = rgb('#071f45'), shelf = rgb('#1d6fa8'), land = rgb('#2c5f36'), dry = rgb('#8f7c4e'), ice = rgb('#f2f7fb');
    cv = noiseCanvas(1024, 512, (u, v) => {
      const n = fbm(u * 6, v * 4, 6) + 0.12 * fbm(u * 16, v * 11, 3);
      const lat = Math.abs(v - 0.5) * 2;
      if (lat > 0.9) return ice;
      if (n < 0.68) {
        const t = clamp((n - 0.38) * 3.2, 0, 1);
        return mix(deep, n > 0.62 ? shelf : ocean, t);
      }
      const t = clamp((n - 0.68) * 4, 0, 1);
      let c = mix(land, dry, clamp(fbm(u * 9, v * 6, 3) * 1.5 - 0.35 + lat * 0.5, 0, 1));
      c = mix(c, dry, t * 0.25);
      if (lat > 0.7) c = mix(c, ice, clamp((lat - 0.7) / 0.2, 0, 1));
      return c;
    });
  } else if (kind === 'bands') {
    const light = mix(base, [255, 255, 255], 0.35), dark = mix(base, [40, 20, 10], 0.45);
    cv = noiseCanvas(512, 256, (u, v) => {
      const band = Math.sin(v * 46 + fbm(u * 3, v * 9, 3) * 4) * 0.5 + 0.5;
      return mix(dark, light, band * 0.9 + fbm(u * 12, v * 4, 2) * 0.1);
    });
  } else if (kind === 'cloud') {
    cv = noiseCanvas(512, 256, (u, v) => mix(mix(base, [20, 20, 30], 0.25), mix(base, [255, 255, 255], 0.5), fbm(u * 6, v * 6, 5)));
  } else if (kind === 'sun') {
    cv = noiseCanvas(256, 128, (u, v) => {
      const n = fbm(u * 12, v * 12, 4);
      return mix(mix(base, [255, 90, 20], 0.35), [255, 255, 235], n * 0.9);
    });
  } else if (kind === 'metal') {
    cv = noiseCanvas(64, 64, (u, v) => mix(base, [90, 100, 120], fbm(u * 8, v * 8, 3)));
  } else { /* rock */
    cv = noiseCanvas(512, 256, (u, v) => {
      const n = fbm(u * 10, v * 7, 6), crater = Math.pow(vnoise(u * 26, v * 20), 6);
      return mix(mix(base, [30, 25, 22], 0.4), mix(base, [255, 250, 240], 0.35), clamp(n + crater, 0, 1));
    });
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  texCache.set(key, t); return t;
}
function glowSprite(hex, soft = 0.35) {
  const key = 'glow' + hex + soft; if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, hex); g.addColorStop(soft, hex + 'aa'); g.addColorStop(1, hex + '00');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); texCache.set(key, t); return t;
}

/* ---------- element ---------- */
class CosmosStage extends HTMLElement {
  connectedCallback() {
    if (this._boot) { this._restart(); window.__cosmosStage = this; return; }
    this._boot = true;
    const prev = window.__cosmosStage;
    if (prev && prev !== this && prev.dispose) prev.dispose();
    this.style.cssText = 'position:absolute;inset:0;display:block;overflow:hidden;background:#03060f';
    this.canvasHost = document.createElement('div');
    this.canvasHost.style.cssText = 'position:absolute;inset:0';
    this.labelHost = document.createElement('div');
    this.labelHost.style.cssText = 'position:absolute;inset:0;pointer-events:none;font:600 13px/1.2 system-ui,sans-serif';
    this.append(this.canvasHost, this.labelHost);

    this.opts = { orbits: true, labels: true, trails: false, distances: false, timeScale: 1, freeMode: false, labelGap: 74 };
    this.state = 'earth'; this.level = 1; this.focus = 'earth'; this.t = 0;
    this.pickables = []; this.labelDefs = []; this.flight = null;

    this._initRenderer();
    this._buildScene();
    this._bindInput();
    this.goToState(this.getAttribute('state') || 'earth', true);
    this._loop();
    /* self-healing loop: React can move the mount and kill the RAF chain */
    this._watchdog = setInterval(() => {
      if (this._dead || !this.isConnected) return;
      if (performance.now() - (this._frameTs || 0) > 160) this._restart();
    }, 150);
    window.__cosmosStage = this;
    window.dispatchEvent(new CustomEvent('cosmos-stage-ready', { detail: { stage: this } }));
    this.dispatchEvent(new CustomEvent('cosmos-ready'));
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.canvasHost.append(this.renderer.domElement);
    this.renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.05, 60000);
    this.cam = { target: new THREE.Vector3(), dist: 26, yaw: 0.6, pitch: 0.22, offset: new THREE.Vector3() };
    this.ro = new ResizeObserver(() => this._resize()); this.ro.observe(this);
    this._resize();
  }
  _resize() {
    const w = this.clientWidth || 1440, h = this.clientHeight || 900;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  /* ---------- scene construction ---------- */
  _buildScene() {
    const D = window.COSMOS_DATA;
    this.bodies = new Map();
    this.shells = {};
    this.scene.add(new THREE.AmbientLight(0x2a3a5c, 0.9));
    this.sunLight = new THREE.PointLight(0xfff0d0, 2.6, 0, 0); this.scene.add(this.sunLight);
    this.rimLight = new THREE.DirectionalLight(0x6fa8ff, 0.35); this.rimLight.position.set(-1, 0.4, -1); this.scene.add(this.rimLight);

    this._starfield();
    this._shell('earth', () => this._earthSystem(D));
    this._shell('solar', () => this._solarSystem(D));
    this._shell('stellar', () => this._stellar(D));
    this._shell('galaxy', () => this._galaxy(D));
    this._shell('local', () => this._localGroup(D));
    this._shell('universe', () => this._cosmicWeb(D));
    this._shell('blackhole', () => this._blackHole(D));
    this._shell('nebula', () => this._nebulaScene(D));
    this._shell('exo', () => this._exoSystem(D));
  }
  _shell(id, build) {
    const g = new THREE.Group(); g.visible = false; g.userData.opacity = 0;
    this.scene.add(g); this.shells[id] = g;
    const prev = this._g; this._g = g; build(); this._g = prev;
  }
  _add(obj) { this._g.add(obj); return obj; }
  _register(id, mesh, radius) {
    mesh.userData.bodyId = id; mesh.userData.pickRadius = radius; mesh.userData.shell = this._g;
    if (!this.bodies.has(id)) this.bodies.set(id, []);
    this.bodies.get(id).push(mesh);
    this.pickables.push(mesh); return mesh;
  }
  _bodyMesh(id) {
    const list = this.bodies.get(id); if (!list) return null;
    const shell = this.shells[this.activeShell];
    return list.find(m => m.userData.shell === shell) || list[0];
  }
  _label(id, obj, glyph, name, minLevel) { this.labelDefs.push({ id, obj, glyph, name, shell: this._g }); }

  _starfield() {
    for (const [count, size, dist, op] of [[5200, 1.5, 9000, 0.9], [2600, 3.2, 5200, 0.7], [900, 6, 2600, 0.45]]) {
      const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < count; i++) {
        const v = new THREE.Vector3().randomDirection().multiplyScalar(dist * (0.7 + Math.random() * 0.3));
        pos.set([v.x, v.y, v.z], i * 3);
        const k = Math.random();
        c.setHSL(k < 0.6 ? 0.6 : (k < 0.85 ? 0.09 : 0.55), 0.5, 0.72 + Math.random() * 0.28);
        col.set([c.r, c.g, c.b], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        size, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: op,
        depthWrite: false, blending: THREE.AdditiveBlending, map: glowSprite('#ffffff', 0.2)
      }));
      this.scene.add(pts);
    }
    /* faint milky band so deep space never reads as flat black */
    const band = new THREE.Mesh(new THREE.SphereGeometry(9500, 32, 16),
      new THREE.MeshBasicMaterial({ map: this._bandTexture(), side: THREE.BackSide, transparent: true, opacity: 0.5, depthWrite: false }));
    band.rotation.z = 0.5; this.scene.add(band);
  }
  _bandTexture() {
    const cv = noiseCanvas(512, 256, (u, v) => {
      const d = Math.abs(v - 0.5), band = Math.exp(-d * d * 260) * (0.5 + fbm(u * 8, v * 20, 4));
      const c = mix([6, 10, 26], [120, 130, 190], clamp(band, 0, 1) * 0.55);
      return mix(c, [180, 150, 220], clamp(band - 0.6, 0, 1) * 0.3);
    });
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  _planetMesh(b, radiusScale = 1) {
    const r = b.radius * radiusScale;
    const mat = b.emissive
      ? new THREE.MeshBasicMaterial({ map: makeTexture(b.texture || 'sun', b.color) })
      : new THREE.MeshStandardMaterial({ map: makeTexture(b.texture || 'rock', b.color), roughness: 0.86, metalness: 0.03 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), mat);
    mesh.userData.spin = b.rotation || 0.02;
    if (b.texture === 'earth') {
      const cl = document.createElement('canvas'); cl.width = 1024; cl.height = 512;
      const cx = cl.getContext('2d'); const im = cx.createImageData(1024, 512);
      for (let y = 0; y < 512; y++) for (let x = 0; x < 1024; x++) {
        const n = fbm(x / 1024 * 9, y / 512 * 5, 5);
        const a = clamp((n - 0.52) * 4.2, 0, 1) * 235;
        const i = (y * 1024 + x) * 4;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = a;
      }
      cx.putImageData(im, 0, 0);
      const ct = new THREE.CanvasTexture(cl); ct.colorSpace = THREE.SRGBColorSpace;
      const clouds = new THREE.Mesh(new THREE.SphereGeometry(r * 1.012, 48, 32),
        new THREE.MeshStandardMaterial({ map: ct, transparent: true, opacity: 0.55, roughness: 1, depthWrite: false }));
      clouds.userData.spin = 0.008; mesh.add(clouds);
    }
    if (b.atmosphere) {
      const atm = new THREE.Mesh(new THREE.SphereGeometry(r * 1.045, 48, 32), new THREE.MeshBasicMaterial({
        color: b.atmosphere, transparent: true, opacity: 0.2, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      mesh.add(atm);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(b.atmosphere, 0.42), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(r * 3.4); mesh.add(halo);
    }
    if (b.emissive) {
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(b.color, 0.3), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(r * 5); mesh.add(halo);
    }
    if (b.ring) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(b.ring.inner * radiusScale, b.ring.outer * radiusScale, 128, 8), new THREE.MeshBasicMaterial({
        color: b.ring.color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false
      }));
      ring.rotation.x = Math.PI / 2 - 0.22; mesh.add(ring);
    }
    return mesh;
  }
  _orbitRing(radius, color = '#4d6ea8', opacity = 0.3, tilt = 0) {
    const pts = [];
    for (let i = 0; i <= 180; i++) { const a = i / 180 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)); }
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    line.rotation.x = tilt * DEG; line.userData.orbit = true; return line;
  }

  _earthSystem(D) {
    const get = id => D.BODIES.find(b => b.id === id);
    const earth = this._add(this._planetMesh(get('earth')));
    this._register('earth', earth, 6.2); this._label('earth', earth, '🌍', get('earth').name);
    const moon = this._add(this._planetMesh(get('moon')));
    this._register('moon', moon, 1.7); this._label('moon', moon, '🌕', get('moon').name);
    moon.userData.orbitDef = get('moon').orbit;
    const iss = this._add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.16), new THREE.MeshStandardMaterial({ color: '#dfe8f5', metalness: 0.6, roughness: 0.3 })));
    iss.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.9), new THREE.MeshStandardMaterial({ color: '#2b3f6b', metalness: 0.4, roughness: 0.4 })));
    this._register('iss', iss, 0.6); this._label('iss', iss, '🛰', get('iss').name);
    iss.userData.orbitDef = get('iss').orbit;
    this._add(this._orbitRing(26, '#5b7fbd', 0.22, 5.1));
    this._add(this._orbitRing(8.4, '#5b7fbd', 0.16, 51.6));
    this.shells.earth.userData.sunAt = new THREE.Vector3(400, 120, 240);
  }

  _solarSystem(D) {
    const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    const sun = this._add(this._planetMesh(D.BODIES.find(b => b.id === 'sun'), 1));
    this._register('sun', sun, 16); this._label('sun', sun, '☀', D.BODIES.find(b => b.id === 'sun').name);
    for (const id of planets) {
      const b = D.BODIES.find(x => x.id === id);
      const scale = id === 'pluto' ? 1.2 : 0.62;
      const m = this._add(this._planetMesh(b, scale));
      m.userData.orbitDef = b.orbit; m.userData.phase = Math.random() * Math.PI * 2;
      this._register(id, m, Math.max(2, b.radius * scale));
      this._label(id, m, b.glyph, b.name);
      this._add(this._orbitRing(b.orbit.a, id === 'pluto' ? '#6a5f8f' : '#4d6ea8', 0.26, b.orbit.tilt || 0));
    }
    /* asteroid belt */
    const n = 3200, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 250 + Math.random() * 30;
      pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 6, Math.sin(a) * r], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this._add(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#9c8f7c', size: 1.4, transparent: true, opacity: 0.75, depthWrite: false })));
    /* comet + tail */
    const comet = this._add(new THREE.Group());
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('#a8e6ef', 0.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    head.scale.setScalar(9); comet.add(head);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(5, 62, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#9fe0ff', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    tail.rotation.z = Math.PI / 2; tail.position.x = 31; comet.add(tail);
    comet.userData.orbitDef = D.BODIES.find(b => b.id === 'halley').orbit;
    this._register('halley', comet, 8); this._label('halley', comet, '☄', D.BODIES.find(b => b.id === 'halley').name);
    this.shells.solar.userData.sunAt = new THREE.Vector3(0, 0, 0);
  }

  _stellar(D) {
    const stars = [
      { id: 'sun', at: [0, 0, 0] }, { id: 'proxima', at: [-120, 20, 90] }, { id: 'sirius', at: [170, -40, -110] },
      { id: 'vega', at: [-60, 90, -230] }, { id: 'betelgeuse', at: [320, 60, 210] }
    ];
    for (const s of stars) {
      const b = D.BODIES.find(x => x.id === s.id);
      const m = this._add(this._planetMesh({ ...b, radius: b.radius * (s.id === 'sun' ? 0.35 : 1), emissive: true }));
      m.position.set(...s.at);
      this._register(s.id, m, b.radius * 1.6); this._label(s.id, m, b.glyph, b.name);
      const ring = this._add(this._orbitRing(1, '#ffffff', 0));
      ring.visible = false;
    }
    const t = D.BODIES.find(x => x.id === 'trappist');
    const exo = this._add(new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 24), new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.8 })));
    exo.position.set(-260, -70, 160);
    this._register('trappist', exo, 6); this._label('trappist', exo, '🌱', t.name);
    /* field stars */
    const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(200 + Math.random() * 900);
      pos.set([v.x, v.y, v.z], i * 3);
      c.setHSL([0.6, 0.58, 0.12, 0.06, 0.02][Math.floor(Math.random() * 5)], 0.6, 0.75);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this._add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 5, vertexColors: true, map: glowSprite('#ffffff', 0.25), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
    this.shells.stellar.userData.sunAt = new THREE.Vector3(0, 0, 0);
  }

  _spiralPoints(count, radius, arms, spread, thickness, hueA, hueB, size) {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const arm = i % arms, r = Math.pow(Math.random(), 0.55) * radius;
      const a = arm / arms * Math.PI * 2 + r / radius * 4.2 + (Math.random() - 0.5) * spread * (1 - r / radius * 0.6);
      const y = (Math.random() - 0.5) * thickness * (1 - r / radius * 0.7) + (Math.random() - 0.5) * 2;
      pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
      c.setHSL(hueA + (hueB - hueA) * (r / radius) + (Math.random() - 0.5) * 0.05, 0.65, 0.55 + Math.random() * 0.35);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ size, vertexColors: true, map: glowSprite('#ffffff', 0.25), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  }
  _puff(color, scale, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite(color, 0.45), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(scale); return s;
  }

  _galaxy(D) {
    const disk = this._add(this._spiralPoints(26000, 300, 4, 0.55, 26, 0.58, 0.09, 2.6));
    disk.rotation.x = 0.1;
    const core = this._add(this._puff('#ffe6b0', 150, 0.75)); core.position.set(0, 0, 0);
    this._add(this._puff('#ffd08a', 90, 0.5));
    /* nebulae, pulsar, Sgr A* markers inside the galaxy */
    const marks = [
      { id: 'orion', at: [-190, 8, 120], color: '#a67bff', size: 46, glyph: '🌫' },
      { id: 'crab', at: [220, -14, -90], color: '#63e6ff', size: 34, glyph: '🦀' },
      { id: 'vela', at: [-120, 22, -210], color: '#9fd0ff', size: 22, glyph: '📡' },
      { id: 'sgra', at: [0, 0, 0], color: '#ffb35c', size: 26, glyph: '🕳' }
    ];
    for (const m of marks) {
      const b = D.BODIES.find(x => x.id === m.id);
      const g = new THREE.Group(); g.position.set(...m.at);
      const p = this._puff(m.color, m.size, m.id === 'sgra' ? 0.5 : 0.55); g.add(p);
      if (m.id !== 'sgra') for (let i = 0; i < 6; i++) {
        const q = this._puff(m.color, m.size * (0.4 + Math.random() * 0.5), 0.22);
        q.position.set((Math.random() - 0.5) * m.size, (Math.random() - 0.5) * m.size * 0.4, (Math.random() - 0.5) * m.size);
        g.add(q);
      }
      this._add(g); this._register(m.id, g, m.size * 0.5); this._label(m.id, g, m.glyph, b.name);
    }
    /* our position */
    const here = new THREE.Group(); here.position.set(150, 4, -110);
    here.add(this._puff('#ffffff', 12, 0.9));
    this._add(here);
    this._register('milkyway', here, 10); this._label('milkyway', here, '☀', D.UI.youAreHere);
    this.shells.galaxy.userData.sunAt = new THREE.Vector3(0, 200, 0);
  }

  _localGroup(D) {
    const mw = this._add(this._spiralPoints(9000, 90, 4, 0.5, 8, 0.58, 0.1, 2));
    mw.rotation.set(0.3, 0, 0.15);
    this._register('milkyway', mw, 90); this._label('milkyway', mw, '🌌', D.BODIES.find(b => b.id === 'milkyway').name);
    const and = this._add(this._spiralPoints(11000, 130, 2, 0.7, 9, 0.72, 0.02, 2));
    and.position.set(420, 60, -240); and.rotation.set(-0.5, 0.4, 0.6);
    this._register('andromeda', and, 130); this._label('andromeda', and, '🌌', D.BODIES.find(b => b.id === 'andromeda').name);
    for (const [x, y, z, s, col] of [[-260, -120, 180, 30, '#b8c6ff'], [-320, -160, 240, 18, '#c9b6ff'], [200, 200, 320, 14, '#ffd9c0'], [-500, 90, -180, 12, '#cfe0ff']]) {
      const g = this._add(this._spiralPoints(1400, s, 3, 1.2, s * 0.5, 0.6, 0.1, 2));
      g.position.set(x, y, z);
    }
    this.shells.local.userData.sunAt = new THREE.Vector3(0, 600, 0);
  }

  _cosmicWeb(D) {
    const nodes = [];
    for (let i = 0; i < 130; i++) nodes.push(new THREE.Vector3().randomDirection().multiplyScalar(Math.pow(Math.random(), 0.5) * 900));
    const n = 34000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      const b = nodes[Math.floor(Math.random() * nodes.length)];
      const t = Math.random(), jitter = 40 * Math.pow(Math.random(), 2);
      const p = a.clone().lerp(b, t).add(new THREE.Vector3().randomDirection().multiplyScalar(jitter));
      if (p.length() > 950) p.setLength(950);
      pos.set([p.x, p.y, p.z], i * 3);
      c.setHSL(0.6 - 0.12 * t, 0.55, 0.5 + Math.random() * 0.4);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const web = this._add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 4.6, vertexColors: true, map: glowSprite('#ffffff', 0.3), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })));
    this._register('cosmicweb', web, 900); this._label('cosmicweb', web, '🕸', D.BODIES.find(b => b.id === 'cosmicweb').name);
    const bound = this._add(new THREE.Mesh(new THREE.SphereGeometry(980, 48, 32),
      new THREE.MeshBasicMaterial({ color: '#5f7dc0', transparent: true, opacity: 0.05, side: THREE.DoubleSide })));
    bound.userData.pulse = true;
    this.shells.universe.userData.sunAt = new THREE.Vector3(0, 1200, 0);
  }

  _blackHole(D) {
    const g = this._add(new THREE.Group());
    const hole = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 32), new THREE.MeshBasicMaterial({ color: '#000000' }));
    g.add(hole);
    /* photon ring */
    const ring = new THREE.Mesh(new THREE.TorusGeometry(10.6, 0.35, 8, 200), new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = Math.PI / 2 - 1.1; g.add(ring);
    /* accretion disc: layered rings + orbiting particles */
    for (let i = 0; i < 5; i++) {
      const r0 = 13 + i * 5.5;
      const disc = new THREE.Mesh(new THREE.RingGeometry(r0, r0 + 5.2, 160, 1), new THREE.MeshBasicMaterial({
        color: i < 2 ? '#fff1c9' : (i < 4 ? '#ffb35c' : '#ff7a3c'),
        transparent: true, opacity: 0.3 - i * 0.045, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      disc.rotation.x = Math.PI / 2 - 0.28; disc.userData.spinDisc = 0.12 - i * 0.015; g.add(disc);
    }
    const n = 9000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    const radii = new Float32Array(n), ang = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      radii[i] = 12.5 + Math.pow(Math.random(), 1.5) * 26; ang[i] = Math.random() * Math.PI * 2;
      c.setHSL(0.11 - 0.05 * (radii[i] / 40), 0.9, 0.85 - 0.35 * (radii[i] / 40));
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const parts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.1, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    parts.userData.disc = { radii, ang }; parts.rotation.x = -0.28; g.add(parts);
    this._discParts = parts;
    /* lensed background: a warped star ring behind the hole */
    const lens = new THREE.Mesh(new THREE.TorusGeometry(15, 5.5, 2, 160), new THREE.MeshBasicMaterial({ color: '#8fb6ff', transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false }));
    lens.rotation.x = 0.9; g.add(lens);
    this._register('sgra', hole, 14); this._label('sgra', hole, '🕳', D.BODIES.find(b => b.id === 'sgra').name);
    this.shells.blackhole.userData.sunAt = new THREE.Vector3(60, 40, 120);
    this.shells.blackhole.userData.minDist = 34; /* pedagogical limit (§12) */
  }

  _nebulaScene(D) {
    const g = this._add(new THREE.Group());
    const palette = ['#ff7bb0', '#7b8cff', '#63e6ff', '#ffd166'];
    for (let i = 0; i < 120; i++) {
      const p = this._puff(palette[i % palette.length], 60 + Math.random() * 220, 0.10 + Math.random() * 0.12);
      p.position.set((Math.random() - 0.5) * 520, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 520);
      g.add(p);
    }
    const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 520, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 520);
      pos.set([v.x, v.y, v.z], i * 3);
      c.setHSL(0.55 + Math.random() * 0.15, 0.4, 0.8); col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 3.2, vertexColors: true, map: glowSprite('#ffffff', 0.25), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
    const anchor = new THREE.Object3D(); g.add(anchor);
    this._register('orion', anchor, 60); this._label('orion', anchor, '🌫', D.BODIES.find(b => b.id === 'orion').name);
    this.shells.nebula.userData.sunAt = new THREE.Vector3(0, 200, 300);
  }

  _exoSystem(D) {
    const star = this._add(this._planetMesh({ radius: 7, color: '#ff8a5c', texture: 'sun', emissive: true }));
    const cols = ['#b98d74', '#c98f6e', '#7fc6a8', '#8fb6d8', '#9c8f7c', '#b0a08c', '#c4b6a4'];
    for (let i = 0; i < 7; i++) {
      const b = { radius: 1.6 + (i === 3 ? 0.5 : 0), color: cols[i], texture: 'rock' };
      const m = this._add(this._planetMesh(b));
      m.userData.orbitDef = { a: 18 + i * 9, period: 1.5 + i * 2.4 };
      m.userData.phase = i * 0.9;
      if (i === 3) { this._register('trappist', m, 5); this._label('trappist', m, '🌱', D.BODIES.find(x => x.id === 'trappist').name); }
      this._add(this._orbitRing(18 + i * 9, i === 3 ? '#7fc6a8' : '#4d6ea8', i === 3 ? 0.5 : 0.22));
    }
    /* habitable zone band */
    const hz = this._add(new THREE.Mesh(new THREE.RingGeometry(40, 58, 96, 1), new THREE.MeshBasicMaterial({ color: '#4fd6a0', transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })));
    hz.rotation.x = Math.PI / 2;
    this.shells.exo.userData.sunAt = new THREE.Vector3(0, 0, 0);
  }

  /* ---------- states (§40 screen list) ---------- */
  static STATES = {
    landing:   { shell: 'earth',     focus: 'earth',  dist: 19,   yaw: 2.2,  pitch: 0.12, level: 1 },
    earth:     { shell: 'earth',     focus: 'earth',  dist: 22,   yaw: 0.7,  pitch: 0.18, level: 1 },
    solar:     { shell: 'solar',     focus: 'sun',    dist: 760,  yaw: 0.5,  pitch: 0.52, level: 2 },
    planet:    { shell: 'solar',     focus: 'saturn', dist: 46,   yaw: 1.1,  pitch: 0.2,  level: 2 },
    star:      { shell: 'stellar',   focus: 'sirius', dist: 40,   yaw: 0.4,  pitch: 0.16, level: 3 },
    exo:       { shell: 'exo',       focus: null,     dist: 150,  yaw: 0.6,  pitch: 0.5,  level: 3 },
    nebula:    { shell: 'nebula',    focus: null,     dist: 420,  yaw: 0.3,  pitch: 0.1,  level: 4 },
    blackhole: { shell: 'blackhole', focus: 'sgra',   dist: 62,   yaw: 0.5,  pitch: 0.22, level: 4 },
    galaxy:    { shell: 'galaxy',    focus: null,     dist: 620,  yaw: 0.7,  pitch: 0.62, level: 4 },
    local:     { shell: 'local',     focus: null,     dist: 900,  yaw: 0.5,  pitch: 0.45, level: 5 },
    universe:  { shell: 'universe',  focus: null,     dist: 1500, yaw: 0.4,  pitch: 0.3,  level: 6 },
    free:      { shell: 'solar',     focus: 'jupiter', dist: 70,  yaw: 1.4,  pitch: 0.12, level: 2 }
  };

  goToState(id, immediate = false) {
    const s = CosmosStage.STATES[id]; if (!s) return;
    this.state = id;
    this._showShell(s.shell, immediate);
    this.focus = s.focus;
    this.cam.yaw = s.yaw; this.cam.pitch = s.pitch;
    if (immediate) this.cam.dist = s.dist; else this._tweenDist(s.dist, 1100);
    this.level = s.level;
    this.dispatchEvent(new CustomEvent('cosmos-level', { detail: { n: this.level } }));
  }
  _showShell(id, immediate) {
    this.activeShell = id;
    for (const [k, g] of Object.entries(this.shells)) {
      const on = k === id;
      g.userData.targetOpacity = on ? 1 : 0;
      if (immediate) { g.visible = on; g.userData.opacity = on ? 1 : 0; this._applyShellOpacity(g); }
      else if (on) g.visible = true;
    }
    const sun = this.shells[id].userData.sunAt || new THREE.Vector3();
    this.sunLight.position.copy(sun);
  }
  _applyShellOpacity(g) {
    const o = g.userData.opacity;
    g.traverse(n => {
      if (n.material && n.userData.baseOpacity === undefined && n.material.opacity !== undefined) n.userData.baseOpacity = n.material.opacity;
      if (n.material) {
        if (n.material.transparent) n.material.opacity = (n.userData.baseOpacity ?? 1) * o;
        else { n.material.transparent = o < 1; n.material.opacity = o; }
      }
    });
    g.visible = o > 0.01;
  }
  _tweenDist(to, ms) {
    const from = this.cam.dist, t0 = performance.now();
    this._distTween = { from, to, t0, ms };
  }

  setLevel(n) {
    const map = { 1: 'earth', 2: 'solar', 3: 'stellar', 4: 'galaxy', 5: 'local', 6: 'universe' };
    const stateMap = { 1: 'earth', 2: 'solar', 3: 'star', 4: 'galaxy', 5: 'local', 6: 'universe' };
    if (!map[n]) return;
    this.goToState(stateMap[n]);
  }
  set(opts) {
    Object.assign(this.opts, opts);
    for (const g of Object.values(this.shells)) g.traverse(n => { if (n.userData.orbit) n.visible = this.opts.orbits; });
    this.labelHost.style.display = this.opts.labels ? 'block' : 'none';
  }
  snapshot() { return { level: this.level, focus: this.focus, state: this.state }; }

  /* ---------- camera flight (§5) ---------- */
  flyTo(id) {
    const body = window.COSMOS_DATA.BODIES.find(b => b.id === id);
    if (!body) return Promise.resolve();
    const shellFor = { blackhole: 'blackhole', nebula: 'nebula', exo: 'exo' };
    let shell = shellFor[body.kind];
    if (!shell) shell = body.level === 1 ? 'earth' : body.level === 2 ? 'solar' : body.level === 3 ? 'stellar' : body.level === 4 ? 'galaxy' : body.level === 5 ? 'local' : 'universe';
    if (id === 'sgra') shell = 'blackhole';
    if (id === 'orion' || id === 'crab') shell = 'nebula';
    if (id === 'trappist') shell = 'exo';
    const dist = body.kind === 'galaxy' ? 620 : body.kind === 'structure' ? 2000
      : body.kind === 'nebula' ? 420 : body.kind === 'blackhole' ? 62
      : Math.max(12, (body.radius || 6) * 4.4);
    this.dispatchEvent(new CustomEvent('cosmos-travel', {
      detail: { id, name: body.name, distance: (body.stats[0] || {}).value, glyph: body.glyph }
    }));
    this._showShell(shell, false);
    this.focus = id;
    this.level = body.level;
    this.dispatchEvent(new CustomEvent('cosmos-level', { detail: { n: this.level } }));
    /* warp out then in */
    this.warp = 1;
    const start = this.cam.dist;
    this._flight = { t0: performance.now(), ms: 2600, from: start, mid: start * 4.5, to: dist, id };
    return new Promise(res => { this._flightDone = () => { res(); this._flightDone = null; }; });
  }

  /* ---------- input (§4) ---------- */
  _bindInput() {
    const el = this.renderer.domElement;
    el.style.cursor = 'grab';
    let dragging = false, right = false, px = 0, py = 0, moved = 0;
    el.addEventListener('pointerdown', e => {
      dragging = true; right = e.button === 2; px = e.clientX; py = e.clientY; moved = 0;
      el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing';
    });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      this.pointer = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1, cx: e.clientX - r.left, cy: e.clientY - r.top };
      if (!dragging) return;
      const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      if (right) { this.cam.offset.x -= dx * this.cam.dist * 0.0012; this.cam.offset.y += dy * this.cam.dist * 0.0012; }
      else { this.cam.yaw -= dx * 0.005; this.cam.pitch = clamp(this.cam.pitch + dy * 0.004, -1.35, 1.35); }
    });
    el.addEventListener('pointerup', e => {
      dragging = false; el.style.cursor = 'grab';
      if (moved < 6) {
        const hit = this._pick();
        if (hit) this.dispatchEvent(new CustomEvent('cosmos-select', { detail: { id: hit } }));
        else this.dispatchEvent(new CustomEvent('cosmos-select', { detail: { id: null } }));
      }
    });
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('dblclick', () => { const hit = this._pick(); if (hit) this.flyTo(hit); });
    el.addEventListener('wheel', e => {
      e.preventDefault();
      const min = this.shells[this.activeShell]?.userData.minDist || 4;
      const next = this.cam.dist * (1 + Math.sign(e.deltaY) * 0.12);
      if (next < min) {
        this.dispatchEvent(new CustomEvent('cosmos-limit', { detail: { id: this.focus } }));
        this.cam.dist = min;
      } else this.cam.dist = clamp(next, min, 40000);
      /* auto level transition on extreme zoom out (§6) */
      const wide = { earth: 260, solar: 2400, stellar: 3200, galaxy: 3600, local: 4200 }[this.activeShell];
      if (wide && this.cam.dist > wide) this.setLevel(Math.min(6, this.level + 1));
    }, { passive: false });
  }
  _pick() {
    if (!this.pointer) return null;
    const ray = new THREE.Raycaster();
    ray.params.Points.threshold = 6;
    ray.setFromCamera(new THREE.Vector2(this.pointer.x, this.pointer.y), this.camera);
    const shell = this.shells[this.activeShell];
    const list = this.pickables.filter(m => {
      let p = m; while (p) { if (p === shell) return true; p = p.parent; } return false;
    });
    const hits = ray.intersectObjects(list, true);
    if (hits.length) { let o = hits[0].object; while (o && !o.userData.bodyId) o = o.parent; return o?.userData.bodyId || null; }
    /* fallback: nearest label on screen */
    let best = null, bd = 46;
    for (const l of this.labelDefs) {
      if (l.shell !== shell) continue;
      const p = l.obj.getWorldPosition(new THREE.Vector3()).project(this.camera);
      const sx = (p.x * 0.5 + 0.5) * this.clientWidth, sy = (-p.y * 0.5 + 0.5) * this.clientHeight;
      const d = Math.hypot(sx - this.pointer.cx, sy - this.pointer.cy);
      if (p.z < 1 && d < bd) { bd = d; best = l.id; }
    }
    return best;
  }

  /* ---------- frame loop ---------- */
  _loop = () => {
    if (this._dead) return;
    this._raf = requestAnimationFrame(this._loop);
    this._frameTs = performance.now();
    const now = performance.now();
    const dt = Math.min(0.05, (now - (this._last || now)) / 1000); this._last = now;
    this.t += dt * this.opts.timeScale;

    /* shell crossfade */
    for (const g of Object.values(this.shells)) {
      const target = g.userData.targetOpacity ?? 0;
      if (Math.abs(g.userData.opacity - target) > 0.005) {
        g.userData.opacity += (target - g.userData.opacity) * Math.min(1, dt * 3.2);
        this._applyShellOpacity(g);
      }
    }
    /* orbital motion */
    for (const g of Object.values(this.shells)) g.children.forEach(o => this._animateNode(o));
    this.shells.blackhole.traverse(o => { if (o.userData.spinDisc) o.rotation.z += o.userData.spinDisc * dt * 3; });
    if (this._discParts) {
      const { radii, ang } = this._discParts.userData.disc;
      const pos = this._discParts.geometry.attributes.position.array;
      for (let i = 0; i < radii.length; i++) {
        ang[i] += dt * (2.6 / Math.pow(radii[i] / 12, 1.5));
        const r = radii[i], a = ang[i];
        pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = (Math.random() - 0.5) * 0.5; pos[i * 3 + 2] = Math.sin(a) * r;
      }
      this._discParts.geometry.attributes.position.needsUpdate = true;
    }
    this.shells.galaxy.children[0] && (this.shells.galaxy.children[0].rotation.y += dt * 0.012 * this.opts.timeScale);
    this.shells.universe.traverse(o => { if (o.userData.pulse) o.material.opacity = 0.04 + Math.sin(this.t * 0.6) * 0.02; });

    /* distance tween */
    if (this._distTween) {
      const k = clamp((now - this._distTween.t0) / this._distTween.ms, 0, 1);
      this.cam.dist = this._distTween.from + (this._distTween.to - this._distTween.from) * ease(k);
      if (k === 1) this._distTween = null;
    }
    /* flight */
    if (this._flight) {
      const f = this._flight, k = clamp((now - f.t0) / f.ms, 0, 1);
      const e = ease(k);
      this.cam.dist = k < 0.42
        ? f.from + (f.mid - f.from) * ease(k / 0.42)
        : f.mid + (f.to - f.mid) * ease((k - 0.42) / 0.58);
      this.warp = Math.sin(k * Math.PI);
      this.cam.yaw += dt * 0.25 * (1 - k);
      if (k === 1) {
        this.focus = f.id; this._flight = null; this.warp = 0;
        const b = window.COSMOS_DATA.BODIES.find(x => x.id === f.id);
        this.dispatchEvent(new CustomEvent('cosmos-arrive', { detail: { id: f.id, name: b.name, glyph: b.glyph } }));
        this._flightDone && this._flightDone();
      }
    }
    /* camera rig */
    const focusObj = this.focus && this._bodyMesh(this.focus);
    const target = focusObj && focusObj.parent && focusObj.parent.visible
      ? focusObj.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
    this.cam.target.lerp(target, Math.min(1, dt * 3));
    const d = this.cam.dist, cp = Math.cos(this.cam.pitch);
    this.camera.position.set(
      this.cam.target.x + Math.sin(this.cam.yaw) * cp * d + this.cam.offset.x,
      this.cam.target.y + Math.sin(this.cam.pitch) * d + this.cam.offset.y,
      this.cam.target.z + Math.cos(this.cam.yaw) * cp * d + this.cam.offset.z
    );
    this.camera.lookAt(this.cam.target.clone().add(this.cam.offset));
    this.camera.fov = 48 + (this.warp || 0) * 22;
    this.camera.updateProjectionMatrix();

    /* hover */
    if (!this._flight) {
      const hit = this._pick();
      if (hit !== this._hover) {
        this._hover = hit;
        this.dispatchEvent(new CustomEvent('cosmos-hover', { detail: { id: hit } }));
      }
    }
    this._renderLabels();
    this.renderer.render(this.scene, this.camera);
  };

  _animateNode(o) {
    const od = o.userData.orbitDef;
    if (od) {
      const a = (o.userData.phase || 0) + this.t * (12 / Math.max(0.4, od.period)) * (od.period > 500 ? 6 : 1);
      const r = od.a, ecc = od.ecc || 0;
      o.position.set(Math.cos(a) * r * (1 + ecc), Math.sin(a * 1.0) * r * Math.sin((od.tilt || 0) * DEG), Math.sin(a) * r * (1 - ecc * 0.4));
      if (o.userData.orbitDef.a > 200 && o.children.length) o.lookAt(0, 0, 0);
    }
    if (o.userData.spin) o.rotation.y += o.userData.spin * this.opts.timeScale * 0.35;
  }

  _renderLabels() {
    if (!this.opts.labels) return;
    const shell = this.shells[this.activeShell];
    const host = this.labelHost;
    if (!this._labelEls) this._labelEls = new Map();
    const v = new THREE.Vector3();
    const placed = [];
    for (const l of this.labelDefs) {
      let el = this._labelEls.get(l);
      const visible = l.shell === shell;
      if (!visible) { if (el) el.style.display = 'none'; continue; }
      l.obj.getWorldPosition(v).project(this.camera);
      const sx = (v.x * 0.5 + 0.5) * this.clientWidth, sy = (-v.y * 0.5 + 0.5) * this.clientHeight;
      const onScreen = v.z < 1 && sx > 40 && sx < this.clientWidth - 40 && sy > 60 && sy < this.clientHeight - 60;
      const crowded = placed.some(p => Math.hypot(p[0] - sx, p[1] - sy) < (this.opts.labelGap || 74));
      if (!onScreen || crowded) { if (el) el.style.display = 'none'; continue; }
      placed.push([sx, sy]);
      if (!el) {
        el = document.createElement('div');
        el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);white-space:nowrap;color:#dceaff;' +
          'text-shadow:0 1px 8px rgba(0,0,0,.9);letter-spacing:.02em;display:flex;align-items:center;gap:6px;' +
          'padding:3px 9px;border-radius:999px;background:rgba(8,16,34,.34);border:1px solid rgba(150,190,255,.16);backdrop-filter:blur(4px)';
        host.append(el); this._labelEls.set(l, el);
      }
      const name = typeof l.name === 'object' ? (l.name[this.getAttribute('lang') || 'fr'] || l.name.fr) : l.name;
      const active = this._hover === l.id;
      el.textContent = `${l.glyph} ${name}`;
      el.style.display = 'flex';
      el.style.left = sx + 'px'; el.style.top = (sy - 34) + 'px';
      el.style.opacity = active ? '1' : '0.72';
      el.style.borderColor = active ? 'rgba(160,210,255,.6)' : 'rgba(150,190,255,.16)';
      el.style.fontSize = active ? '14px' : '13px';
    }
  }

  _restart() {
    if (this._dead) return;
    cancelAnimationFrame(this._raf);
    this._last = performance.now(); this._frameTs = performance.now();
    this.ro && this.ro.observe(this);
    this._resize();
    this._loop();
  }
  dispose() {
    this._dead = true;
    clearInterval(this._watchdog);
    cancelAnimationFrame(this._raf); this.ro?.disconnect();
    try { this.renderer?.dispose(); } catch (e) {}
    this.remove();
  }
  disconnectedCallback() {
    /* a framework re-mount disconnects then reconnects: only stop if it stays away */
    clearTimeout(this._offT);
    this._offT = setTimeout(() => { if (!this.isConnected) cancelAnimationFrame(this._raf); }, 1200);
  }
}
if (!customElements.get('cosmos-stage')) customElements.define('cosmos-stage', CosmosStage);
