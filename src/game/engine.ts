import * as THREE from "three";
import { PICKAXES, block } from "@/game/blocks";
import { planStructure, type ComputeStructure } from "@/game/compute-structures";
import { blockAtlas, meshChunk } from "@/game/mesher";
import { traceVoxel } from "@/game/dda";
import { DIMENSIONS, dimensionSeed, isDimensionId, type DimensionId } from "@/game/dimensions";
import {
  CHUNKS_X,
  CHUNKS_Z,
  CHUNK,
  WY,
  WX,
  WZ,
  applyEdits,
  editKey,
  generateWorld,
  idx,
  inWorld,
  type EditMap,
  type WorldData,
} from "@/game/world";

const SAVE_KEY = "edgeore-voxel-v1";
const RADIUS = 0.28;
const HEIGHT = 1.72;
const EYE = 1.58;
const REACH = 5;

export type HudSnapshot = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  coins: number;
  xp: number;
  mined: number;
  pickName: string;
  pickColor: string;
  pickLevel: number;
  durability: number;
  durabilityMax: number;
  hotbar: number[];
  counts: Record<number, number>;
  selected: number;
  target: string;
  aim: { name: string; hardness: string; need: string } | null;
  mine: number;
  nearTerminal: boolean;
  terminalDist: number;
  nearVault: boolean;
  vaultDist: number;
  bearing: number;
  quests: string[];
  dimension: string;
  hasTerminal: boolean;
  portal: { toName: string; color: string } | null;
};

export type TouchInput = { joyX: number; joyY: number; lookDx: number; lookDy: number };

type SaveFile = {
  v: 1 | 2;
  seed: number;
  coins: number;
  xp: number;
  mined: number;
  pick: number;
  dur: number;
  inv: Record<string, number>;
  hotbar: number[];
  edits: EditMap;
  quests: string[];
  dimension?: DimensionId | "abyss";
  worlds?: Partial<Record<DimensionId | "abyss", EditMap>>;
};

export type GameHandle = {
  start: () => void;
  setPaused: (paused: boolean) => void;
  setKeys: (codes: string[]) => void;
  setTouch: (touch: TouchInput) => void;
  setMining: (held: boolean) => void;
  setJump: (held: boolean) => void;
  place: () => void;
  selectSlot: (index: number) => void;
  sell: (id: number) => string;
  buyPick: (level: number) => string;
  craftStone: () => string;
  repair: () => string;
  grantVault: () => string;
  usePortal: () => string;
  buildComputeStructure: (kind: ComputeStructure) => string;
  snapshot: () => HudSnapshot;
  dispose: () => void;
};

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getPos: () => { x: number; y: number; z: number };
      setKeys: (codes: string[]) => void;
      setSteer?: (v: number) => void;
    };
  }
}

function loadSave(): SaveFile | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveFile;
    if (data.v !== 1 && data.v !== 2) return null;
    return data;
  } catch {
    return null;
  }
}

export function mountGame(
  canvas: HTMLCanvasElement,
  opts: { onHud: (snap: HudSnapshot) => void; onToast: (msg: string) => void },
): GameHandle {
  const saved = loadSave();
  const seed = saved?.seed ?? 0xe47e;
  const worlds: Record<DimensionId, EditMap> = {
    valley: { ...(saved?.edits ?? {}) },
    geode: {},
    ember: {},
  };
  if (saved?.worlds) {
    const stored = saved.worlds as Partial<Record<DimensionId | "abyss", EditMap>>;
    if (stored.valley) worlds.valley = { ...stored.valley };
    if (stored.geode) worlds.geode = { ...stored.geode };
    else if (stored.abyss) worlds.geode = { ...stored.abyss };
    if (stored.ember) worlds.ember = { ...stored.ember };
  }
  const savedDimension = saved?.dimension === "abyss" ? "geode" : saved?.dimension;
  let dimension: DimensionId = savedDimension && isDimensionId(savedDimension) ? savedDimension : "valley";
  let edits: EditMap = worlds[dimension];
  let world: WorldData = generateWorld(dimensionSeed(seed, dimension), dimension);
  applyEdits(world, edits);

  const inv = new Map<number, number>();
  if (saved?.inv) {
    for (const [k, n] of Object.entries(saved.inv)) inv.set(Number(k), n);
  }
  const hotbar = saved?.hotbar?.length === 9 ? saved.hotbar.slice() : [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let selected = 0;
  let coins = saved?.coins ?? 0;
  let xp = saved?.xp ?? 0;
  let mined = saved?.mined ?? 0;
  let pickLevel = Math.min(PICKAXES.length - 1, saved?.pick ?? 0);
  let durability = saved?.dur ?? PICKAXES[pickLevel].durability;
  const quests = new Set<string>(saved?.quests ?? []);

  const player = {
    x: world.spawn.x,
    y: world.spawn.y,
    z: world.spawn.z,
    yaw: 0,
    pitch: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    onGround: false,
  };

  const keys = new Set<string>();
  let override: Set<string> | null = null;
  const touch: TouchInput = { joyX: 0, joyY: 0, lookDx: 0, lookDy: 0 };
  let started = false;
  let paused = false;
  let miningHeld = false;
  let jumpHeld = false;
  let mine: { x: number; y: number; z: number; prog: number; need: number } | null = null;
  let targetLabel = "";
  let aim: HudSnapshot["aim"] = null;
  let minePct = 0;
  let audio: AudioContext | null = null;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x041018);
  scene.fog = new THREE.Fog(0x0c2430, 28, 72);
  scene.add(new THREE.HemisphereLight(0xe7fff8, 0x4a3424, 1.35));
  const sun = new THREE.DirectionalLight(0xfff6e4, 1.15);
  sun.position.set(24, 40, 24);
  scene.add(sun);
  const shaft = new THREE.SpotLight(0x7ef0ff, 18, 40, 0.55, 0.4, 1);
  shaft.position.set(24, 22, 24);
  shaft.target.position.set(24, 8, 24);
  scene.add(shaft);
  scene.add(shaft.target);

  const glowColors: Record<number, number> = { 7: 0xff8833, 8: 0xffb703, 9: 0xb8fff0, 10: 0x3dff9a, 11: 0x00e5d4, 12: 0x14f195, 16: 0xc084fc, 19: 0x67e8f9 };
  const glowLights: THREE.PointLight[] = [];
  const lamp = new THREE.PointLight(0x14f195, 6, 14);
  scene.add(lamp);
  const vaultLight = new THREE.PointLight(0x00e5d4, 8, 16);
  scene.add(vaultLight);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 120);
  scene.add(camera);

  const atlas = new THREE.CanvasTexture(blockAtlas());
  atlas.magFilter = THREE.NearestFilter;
  atlas.minFilter = THREE.NearestFilter;
  atlas.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshLambertMaterial({ map: atlas });

  const chunkMeshes = new Map<string, THREE.Mesh>();

  function rebuild(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    const old = chunkMeshes.get(key);
    if (old) {
      scene.remove(old);
      old.geometry.dispose();
    }
    const data = meshChunk(world.blocks, cx, cz);
    if (data.positions.length === 0) {
      chunkMeshes.delete(key);
      return;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(data.normals, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(data.uvs, 2));
    const mesh = new THREE.Mesh(geo, material);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    scene.add(mesh);
    chunkMeshes.set(key, mesh);
  }

  for (let cz = 0; cz < CHUNKS_Z; cz++) for (let cx = 0; cx < CHUNKS_X; cx++) rebuild(cx, cz);

  const highlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)),
    new THREE.LineBasicMaterial({ color: 0x14f195 }),
  );
  highlight.visible = false;
  scene.add(highlight);

  const crack = new THREE.Mesh(
    new THREE.BoxGeometry(1.01, 1.01, 1.01),
    new THREE.MeshBasicMaterial({ color: 0xe8a06a, transparent: true, opacity: 0.15, depthWrite: false }),
  );
  crack.visible = false;
  scene.add(crack);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.45, 8, 6, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x14f195, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.set(world.terminal.x, world.terminal.y + 4, world.terminal.z);
  scene.add(beam);

  const drone = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: 0x0e2a26, emissive: 0x14f195, emissiveIntensity: 0.8, roughness: 0.4 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 16), new THREE.MeshBasicMaterial({ color: 0xe8a06a }));
  ring.rotation.x = Math.PI / 2;
  drone.add(body, ring);
  drone.position.set(world.terminal.x + 1.2, world.terminal.y + 1.6, world.terminal.z);
  scene.add(drone);
  const portalGroup = new THREE.Group();
  scene.add(portalGroup);
  const membranes: THREE.MeshBasicMaterial[] = [];
  let portalReady = 0;

  function clearPortalGroup() {
    membranes.length = 0;
    while (portalGroup.children.length) {
      const child = portalGroup.children[0];
      portalGroup.remove(child);
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (material && !Array.isArray(material)) material.dispose();
    }
  }

  function buildPortalMeshes() {
    clearPortalGroup();
    for (const gate of world.portals) {
      const frameMat = new THREE.MeshLambertMaterial({ color: 0x172936, emissive: gate.tint, emissiveIntensity: 0.16 });
      const glowMat = new THREE.MeshBasicMaterial({ color: gate.tint, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
      const bars: Array<[number, number, number, number]> = [
        [-1.6, 2.4, 0.42, 4.9],
        [1.6, 2.4, 0.42, 4.9],
        [0, 4.65, 3.65, 0.45],
      ];
      for (const [dx, dy, w, h] of bars) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.65), frameMat);
        bar.position.set(gate.anchorX + 0.5 + dx, gate.baseY + dy, gate.anchorZ + 0.5);
        portalGroup.add(bar);
      }
      const membrane = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.2), glowMat);
      membrane.position.set(gate.anchorX + 0.5, gate.baseY + 2.45, gate.anchorZ + 0.5);
      portalGroup.add(membrane);
      membranes.push(glowMat);
      const glow = new THREE.PointLight(gate.tint, 0.8, 7);
      glow.position.set(gate.anchorX + 0.5, gate.baseY + 2, gate.anchorZ + 0.5);
      portalGroup.add(glow);
    }
  }

  function scatterGlow() {
    for (const light of glowLights) scene.remove(light);
    glowLights.length = 0;
    let glowCount = 0;
    outer: for (let y = 2; y < WY; y++) {
      for (let z = 0; z < WZ; z++) {
        for (let x = 0; x < WX; x++) {
          const id = world.blocks[idx(x, y, z)];
          const color = glowColors[id];
          if (!color || ((x * 13 + y * 7 + z * 3) % 5) > 1) continue;
          const light = new THREE.PointLight(color, 1.6, 9);
          light.position.set(x + 0.5, y + 0.6, z + 0.5);
          scene.add(light);
          glowLights.push(light);
          if (++glowCount >= 14) break outer;
        }
      }
    }
  }

  function dressWorld() {
    scatterGlow();
    buildPortalMeshes();
    const look = DIMENSIONS[world.dimension];
    (scene.background as THREE.Color).setHex(look.sky);
    (scene.fog as THREE.Fog).color.setHex(look.fog);
    lamp.visible = world.services;
    vaultLight.visible = world.services;
    beam.visible = world.services;
    drone.visible = world.services;
    if (world.services) {
      lamp.position.set(world.terminal.x, world.terminal.y + 1.2, world.terminal.z);
      vaultLight.position.set(world.vault.x, world.vault.y + 1.4, world.vault.z);
      beam.position.set(world.terminal.x, world.terminal.y + 4, world.terminal.z);
      drone.position.set(world.terminal.x + 1.2, world.terminal.y + 1.6, world.terminal.z);
    }
  }

  function rebuildAll() {
    for (const mesh of chunkMeshes.values()) {
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
    chunkMeshes.clear();
    for (let cz = 0; cz < CHUNKS_Z; cz++) for (let cx = 0; cx < CHUNKS_X; cx++) rebuild(cx, cz);
  }

  function buildComputeStructure(kind: ComputeStructure): string {
    if (!started) return "Start the game first.";
    const candidates = [
      [player.x + 13, player.z], [player.x - 13, player.z],
      [player.x, player.z + 13], [player.x, player.z - 13],
      [10, 10], [38, 10], [10, 38], [38, 38],
    ];
    for (const [cx, cz] of candidates) {
      const x = Math.floor(cx), z = Math.floor(cz);
      if (x < 7 || z < 7 || x >= WX - 7 || z >= WZ - 7) continue;
      let highest = 1;
      for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
        for (let y = WY - 2; y >= 1; y--) {
          if (world.blocks[idx(x + dx, y, z + dz)] !== 0) {
            highest = Math.max(highest, y + 1);
            break;
          }
        }
      }
      const result = planStructure(world, kind, { x, y: highest, z }, player);
      if (!result.ok) continue;
      for (const [key, id] of Object.entries(result.edits)) {
        const [xs, ys, zs] = key.split(",");
        const bx = Number(xs), by = Number(ys), bz = Number(zs);
        world.blocks[idx(bx, by, bz)] = id;
        edits[key] = id;
      }
      worlds[dimension] = edits;
      rebuildAll();
      save();
      return `Built ${kind} exhibit (${result.count} blocks) at ${x},${highest},${z}. Local world only.`;
    }
    return "No suitable free area found. Move into open terrain and try again.";
  }

  function nearestPortal() {
    let best: (typeof world.portals)[number] | null = null;
    let bestDist = 3.1;
    for (const gate of world.portals) {
      const dist = Math.hypot(gate.x - player.x, gate.z - player.z);
      if (dist < bestDist && Math.abs(gate.y - player.y) < 4.1) {
        best = gate;
        bestDist = dist;
      }
    }
    return best;
  }

  function usePortal(): string {
    if (!started || paused) return "";
    const now = performance.now();
    if (now < portalReady) return "";
    const gate = nearestPortal();
    if (!gate) {
      toast("Move into a glowing world portal first.");
      return "";
    }
    portalReady = now + 1300;
    const from = dimension;
    worlds[dimension] = edits;
    dimension = gate.to;
    edits = worlds[dimension];
    world = generateWorld(dimensionSeed(seed, dimension), dimension);
    applyEdits(world, edits);
    rebuildAll();
    dressWorld();
    const back = world.portals.find((site) => site.to === from) ?? world.portals[0];
    player.x = back ? back.x : world.spawn.x;
    player.y = back ? back.baseY : world.spawn.y;
    player.z = back ? back.z + 4.2 : world.spawn.z;
    player.vx = 0;
    player.vy = 0;
    player.vz = 0;
    mine = null;
    crack.visible = false;
    save();
    toast(`Entered ${DIMENSIONS[dimension].label}.`);
    opts.onHud(snapshot());
    return "";
  }

  dressWorld();

  const view = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0x6b3f22 });
  const gripMat = new THREE.MeshLambertMaterial({ color: 0x3a2416 });
  const steel = new THREE.MeshLambertMaterial({ color: 0xb7bdc7 });
  const copper = new THREE.MeshLambertMaterial({ color: 0xc47a45 });
  const haft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.52, 0.05), wood);
  haft.position.set(0, -0.06, 0);
  const grain = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.18, 0.02), new THREE.MeshLambertMaterial({ color: 0x8a5a32 }));
  grain.position.set(0, 0.02, 0.02);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.07), gripMat);
  grip.position.set(0, -0.2, 0);
  const ferrule = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.028, 0.09), steel);
  ferrule.position.set(0, 0.1, 0);
  const rivet = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.1), copper);
  rivet.position.set(0, 0.1, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.07), steel);
  head.position.set(0, 0.16, 0);
  const edgeL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 0.09), copper);
  edgeL.position.set(-0.19, 0.16, 0);
  const edgeR = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 0.09), copper);
  edgeR.position.set(0.19, 0.16, 0);
  view.add(haft, grain, grip, ferrule, rivet, head, edgeL, edgeR);
  view.position.set(0.34, -0.32, -0.55);
  camera.add(view);
  let swing = 0;

  const particles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[] = [];
  const pebbleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  const pebbleMat = new THREE.MeshLambertMaterial({ color: 0xe8a06a });
  for (let i = 0; i < 36; i++) {
    const mesh = new THREE.Mesh(pebbleGeo, pebbleMat);
    mesh.visible = false;
    scene.add(mesh);
    particles.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0 });
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain = 0.04) {
    if (!audio) return;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + dur);
  }

  function toast(msg: string) {
    opts.onToast(msg);
  }

  function save() {
    const file: SaveFile = {
      v: 2,
      seed,
      coins,
      xp,
      mined,
      pick: pickLevel,
      dur: durability,
      inv: Object.fromEntries([...inv.entries()].map(([k, n]) => [String(k), n])),
      hotbar,
      edits: worlds.valley,
      worlds,
      dimension,
      quests: [...quests],
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(file));
    } catch {
      /* quota */
    }
  }

  function getId(x: number, y: number, z: number): number {
    if (!inWorld(x, y, z)) return 17;
    return world.blocks[idx(x, y, z)];
  }

  function collides(px: number, py: number, pz: number): boolean {
    const x0 = Math.floor(px - RADIUS);
    const x1 = Math.floor(px + RADIUS);
    const y0 = Math.floor(py);
    const y1 = Math.floor(py + HEIGHT - 0.001);
    const z0 = Math.floor(pz - RADIUS);
    const z1 = Math.floor(pz + RADIUS);
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) if (getId(x, y, z) !== 0) return true;
      }
    }
    return false;
  }

  function mark(x: number, y: number, z: number) {
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    rebuild(cx, cz);
    if (x % CHUNK === 0 && cx > 0) rebuild(cx - 1, cz);
    if (x % CHUNK === CHUNK - 1 && cx + 1 < CHUNKS_X) rebuild(cx + 1, cz);
    if (z % CHUNK === 0 && cz > 0) rebuild(cx, cz - 1);
    if (z % CHUNK === CHUNK - 1 && cz + 1 < CHUNKS_Z) rebuild(cx, cz + 1);
  }

  function writeBlock(x: number, y: number, z: number, id: number) {
    if (!inWorld(x, y, z)) return;
    const i = idx(x, y, z);
    world.blocks[i] = id;
    const key = editKey(x, y, z);
    if (id === world.generated[i]) delete edits[key];
    else edits[key] = id;
    mark(x, y, z);
  }

  function give(id: number, n = 1) {
    if (id === 0 || n <= 0) return;
    inv.set(id, (inv.get(id) ?? 0) + n);
    if (!hotbar.includes(id)) {
      const empty = hotbar.indexOf(0);
      if (empty >= 0) hotbar[empty] = id;
    }
  }

  function take(id: number, n = 1): boolean {
    const have = inv.get(id) ?? 0;
    if (have < n) return false;
    const left = have - n;
    if (left <= 0) {
      inv.delete(id);
      for (let i = 0; i < hotbar.length; i++) if (hotbar[i] === id) hotbar[i] = 0;
    } else inv.set(id, left);
    return true;
  }

  const lookDir = new THREE.Vector3();

  function ray(): { x: number; y: number; z: number; nx: number; ny: number; nz: number } | null {
    camera.getWorldDirection(lookDir);
    const hit = traceVoxel(camera.position, lookDir, REACH, (x, y, z) => (inWorld(x, y, z) ? world.blocks[idx(x, y, z)] : 0), {
      x: WX,
      y: WY,
      z: WZ,
    });
    if (!hit) return null;
    return { x: hit.x, y: hit.y, z: hit.z, nx: hit.faceNormal.x, ny: hit.faceNormal.y, nz: hit.faceNormal.z };
  }

  function overlapsPlayer(x: number, y: number, z: number): boolean {
    return player.x + RADIUS > x && player.x - RADIUS < x + 1 && player.z + RADIUS > z && player.z - RADIUS < z + 1 && player.y < y + 1 && player.y + HEIGHT > y;
  }

  function burst(x: number, y: number, z: number, color: string) {
    pebbleMat.color.set(color);
    let spawned = 0;
    for (const p of particles) {
      if (p.life > 0) continue;
      p.life = 0.45 + Math.random() * 0.25;
      p.mesh.visible = true;
      p.mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      p.vx = (Math.random() - 0.5) * 3;
      p.vy = 1.5 + Math.random() * 2;
      p.vz = (Math.random() - 0.5) * 3;
      spawned++;
      if (spawned > 7) break;
    }
  }

  function breakBlock(x: number, y: number, z: number) {
    const id = getId(x, y, z);
    const def = block(id);
    if (!def || def.hardness === Infinity) return;
    writeBlock(x, y, z, 0);
    mined++;
    xp += def.coins > 10 ? 8 : 1;
    if (def.drop) give(def.drop, 1);
    durability = Math.max(0, durability - 1);
    if (durability === 0) toast("Pickaxe is worn. Repair it in the pack.");
    quests.add("mine");
    if (y < 6) quests.add("deep");
    if (id === 9 || id === 12) quests.add("rare");
    burst(x, y, z, def.speck);
    tone(140 + def.coins, 0.08, "square", 0.05);
    swing = 1;
    save();
  }

  function tryPlace() {
    const hit = ray();
    if (!hit) return;
    const id = hotbar[selected] ?? 0;
    const def = block(id);
    if (!def.placeable || (inv.get(id) ?? 0) <= 0) {
      toast("Nothing in that hotbar slot to place.");
      return;
    }
    const x = hit.x + hit.nx;
    const y = hit.y + hit.ny;
    const z = hit.z + hit.nz;
    if (!inWorld(x, y, z) || getId(x, y, z) !== 0) return;
    if (overlapsPlayer(x, y, z)) {
      toast("Can't place inside yourself.");
      return;
    }
    if (!take(id, 1)) return;
    writeBlock(x, y, z, id);
    tone(220, 0.05, "triangle", 0.03);
    save();
  }

  function down(code: string): boolean {
    if (override) return override.has(code);
    if (code === "Space" && jumpHeld) return true;
    return keys.has(code);
  }

  const move = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  function step(dt: number) {
    if (!started || paused) {
      player.vx = 0;
      player.vz = 0;
      return;
    }
    player.yaw -= touch.lookDx * 0.005;
    player.pitch -= touch.lookDy * 0.005;
    touch.lookDx = 0;
    touch.lookDy = 0;
    player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));

    forward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    move.set(0, 0, 0);
    if (down("KeyW")) move.add(forward);
    if (down("KeyS")) move.sub(forward);
    if (down("KeyD")) move.add(right);
    if (down("KeyA")) move.sub(right);
    if (touch.joyX || touch.joyY) {
      move.addScaledVector(right, touch.joyX);
      move.addScaledVector(forward, touch.joyY);
    }
    if (move.lengthSq() > 1) move.normalize();
    const speed = 5.2;
    player.vx = move.x * speed;
    player.vz = move.z * speed;
    if (down("Space") && player.onGround) {
      player.vy = 7.6;
      player.onGround = false;
    }
    player.vy -= 22 * dt;

    let nx = player.x + player.vx * dt;
    if (collides(nx, player.y, player.z)) {
      nx = player.x;
      player.vx = 0;
    }
    let nz = player.z + player.vz * dt;
    if (collides(nx, player.y, nz)) {
      nz = player.z;
      player.vz = 0;
    }
    let ny = player.y + player.vy * dt;
    if (collides(nx, ny, nz)) {
      if (player.vy < 0) {
        player.onGround = true;
        ny = Math.floor(ny) + 1;
        if (collides(nx, ny, nz)) ny = player.y;
      } else {
        ny = player.y;
      }
      player.vy = 0;
    } else {
      player.onGround = false;
    }
    player.x = Math.max(RADIUS + 0.05, Math.min(WX - RADIUS - 0.05, nx));
    player.y = Math.max(0.05, ny);
    player.z = Math.max(RADIUS + 0.05, Math.min(WZ - RADIUS - 0.05, nz));
    if (player.y < 0.2 && player.vy <= 0) {
      player.y = world.spawn.y;
      player.vy = 0;
    }
  }

  function updateMine(dt: number) {
    minePct = 0;
    targetLabel = "";
    aim = null;
    const hit = started && !paused ? ray() : null;
    if (!hit) {
      highlight.visible = false;
      crack.visible = false;
      mine = null;
      return;
    }
    highlight.visible = true;
    highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    const def = block(getId(hit.x, hit.y, hit.z));
    const pick = PICKAXES[pickLevel];
    const worn = durability <= 0 ? 0.25 : 1;
    if (def.id === 18) {
      targetLabel = "ORE Terminal — open it, don't mine it";
      aim = { name: "ORE Terminal", hardness: "—", need: "Open it. Mining it mints nothing." };
      crack.visible = false;
      mine = null;
      return;
    }
    if (def.id === 19) {
      targetLabel = "Entropy Vault — game reward only";
      aim = { name: "Entropy Vault", hardness: "—", need: "Game challenge. Not a Solana transaction." };
      crack.visible = false;
      mine = null;
      return;
    }
    if (def.hardness === Infinity) {
      targetLabel = `${def.name} — unbreakable`;
      aim = { name: def.name, hardness: "—", need: "Unbreakable" };
      crack.visible = false;
      mine = null;
      return;
    }
    if (pickLevel < def.tier) {
      const need = PICKAXES[def.tier]?.name ?? "a better";
      targetLabel = `${def.name} — needs ${need} pick`;
      aim = { name: def.name, hardness: def.hardness.toFixed(1), need: `Requires ${need}+` };
      crack.visible = false;
      mine = null;
      return;
    }
    targetLabel = def.coins > 0 ? `${def.name} — sells for ${def.coins} miner coins` : def.name;
    aim = {
      name: def.name,
      hardness: def.hardness.toFixed(1),
      need: def.coins > 0 ? `${def.coins} miner coins if sold` : "Game block. Not ORE.",
    };
    if (!miningHeld) {
      mine = null;
      crack.visible = false;
      return;
    }
    if (!mine || mine.x !== hit.x || mine.y !== hit.y || mine.z !== hit.z) {
      mine = { x: hit.x, y: hit.y, z: hit.z, prog: 0, need: def.hardness / (pick.speed * worn) };
      tone(90, 0.03, "square", 0.02);
    }
    mine.prog += dt;
    minePct = Math.min(1, mine.prog / mine.need);
    crack.visible = true;
    crack.position.copy(highlight.position);
    (crack.material as THREE.MeshBasicMaterial).opacity = 0.12 + minePct * 0.55;
    if (mine.prog >= mine.need) {
      breakBlock(hit.x, hit.y, hit.z);
      mine = null;
      crack.visible = false;
    }
  }

  function paintPick() {
    (head.material as THREE.MeshLambertMaterial).color.set(PICKAXES[pickLevel].color);
  }

  function snapshot(): HudSnapshot {
    const dx = world.terminal.x - player.x;
    const dz = world.terminal.z - player.z;
    const terminalDist = Math.hypot(dx, dz);
    const vaultDist = Math.hypot(world.vault.x - player.x, world.vault.z - player.z);
    const face = Math.atan2(-dx, -dz);
    let bearing = face - player.yaw;
    while (bearing > Math.PI) bearing -= Math.PI * 2;
    while (bearing < -Math.PI) bearing += Math.PI * 2;
    const counts: Record<number, number> = {};
    for (const [id, n] of inv) counts[id] = n;
    return {
      x: player.x,
      y: player.y,
      z: player.z,
      yaw: player.yaw,
      coins,
      xp,
      mined,
      pickName: PICKAXES[pickLevel].name,
      pickColor: PICKAXES[pickLevel].color,
      pickLevel,
      durability,
      durabilityMax: PICKAXES[pickLevel].durability,
      hotbar: hotbar.slice(),
      counts,
      selected,
      target: targetLabel,
      aim,
      mine: minePct,
      nearTerminal: world.services && terminalDist < 4.2,
      terminalDist,
      nearVault: world.services && vaultDist < 4.2 && Math.abs(player.y - world.vault.y) < 4,
      vaultDist,
      bearing,
      quests: [...quests],
      dimension: DIMENSIONS[dimension].label,
      hasTerminal: world.services,
      portal: (() => {
        const gate = nearestPortal();
        if (!gate) return null;
        return { toName: DIMENSIONS[gate.to].label, color: `#${gate.tint.toString(16).padStart(6, "0")}` };
      })(),
    };
  }

  let acc = 0;
  let hudAcc = 0;
  let last = performance.now();
  let raf = 0;
  let alive = true;

  function frame(now: number) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= 1 / 60 && steps < 4) {
      step(1 / 60);
      acc -= 1 / 60;
      steps++;
    }
    updateMine(dt);
    camera.position.set(player.x, player.y + EYE, player.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    swing = Math.max(0, swing - dt * 4);
    view.rotation.x = Math.sin(swing * Math.PI) * 0.9;
    const t = now / 1000;
    drone.position.y = world.terminal.y + 1.5 + Math.sin(t * 2) * 0.15;
    ring.rotation.z = t;
    beam.rotation.y = t * 0.4;
    for (const p of particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= 9 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.life <= 0) p.mesh.visible = false;
    }
    for (const membrane of membranes) membrane.opacity = 0.42 + Math.sin(now * 0.003) * 0.13;
    renderer.render(scene, camera);
    hudAcc += dt;
    if (hudAcc > 0.12) {
      hudAcc = 0;
      opts.onHud(snapshot());
    }
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === "Space" || e.code === "KeyE" || e.code === "KeyF" || e.code === "KeyR") e.preventDefault();
    keys.add(e.code);
    if (!started || paused) return;
    if (e.code.startsWith("Digit")) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 9) selected = n - 1;
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }
  function onMouseDown(e: MouseEvent) {
    if (e.button === 0) miningHeld = true;
    if (e.button === 2) {
      e.preventDefault();
      tryPlace();
    }
  }
  function onMouseUp(e: MouseEvent) {
    if (e.button === 0) miningHeld = false;
  }
  function onMouseMove(e: MouseEvent) {
    if (document.pointerLockElement !== canvas || paused) return;
    player.yaw -= e.movementX * 0.0022;
    player.pitch -= e.movementY * 0.0022;
    player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
  }
  function onContext(e: Event) {
    e.preventDefault();
  }
  function onBlur() {
    keys.clear();
    miningHeld = false;
    jumpHeld = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", resize);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("contextmenu", onContext);
  resize();
  raf = requestAnimationFrame(frame);
  opts.onHud(snapshot());

  const handle: GameHandle = {
    buildComputeStructure,
    start() {
      started = true;
      paused = false;
      player.yaw = 0;
      player.pitch = 0;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx && !audio) {
        audio = new Ctx();
        void audio.resume();
      }
      const coarse = window.matchMedia?.("(pointer: coarse)").matches;
      if (!coarse) canvas.requestPointerLock?.();
      toast("Walk toward the mint beam. Breaking ore does not mint ORE.");
    },
    setPaused(v) {
      paused = v;
      if (v && document.pointerLockElement === canvas) document.exitPointerLock();
      miningHeld = false;
    },
    setKeys(codes) {
      override = codes.length ? new Set(codes) : null;
    },
    setTouch(next) {
      if (next.lookDx === 0 && next.lookDy === 0) {
        touch.joyX = next.joyX;
        touch.joyY = next.joyY;
      }
      touch.lookDx += next.lookDx;
      touch.lookDy += next.lookDy;
    },
    setMining(held) {
      miningHeld = held;
    },
    setJump(held) {
      jumpHeld = held;
    },
    place: tryPlace,
    selectSlot(index) {
      if (index >= 0 && index < 9) selected = index;
    },
    sell(id) {
      const def = block(id);
      const have = inv.get(id) ?? 0;
      if (!def.coins || have <= 0) return "Nothing to sell.";
      take(id, have);
      coins += def.coins * have;
      quests.add("sell");
      save();
      toast(`Sold ${have} ${def.name} for ${def.coins * have} miner coins.`);
      opts.onHud(snapshot());
      return "";
    },
    buyPick(level) {
      const pick = PICKAXES[level];
      if (!pick || level !== pickLevel + 1) return "Buy the next pick in order.";
      if (coins < pick.cost) return `Need ${pick.cost} miner coins.`;
      coins -= pick.cost;
      pickLevel = level;
      durability = pick.durability;
      paintPick();
      save();
      toast(`${pick.name} pick equipped.`);
      opts.onHud(snapshot());
      return "";
    },
    craftStone() {
      if (pickLevel !== 0) return "Stone pick is only crafted from wood.";
      if ((inv.get(3) ?? 0) < 24) return "Need 24 rock.";
      take(3, 24);
      pickLevel = 1;
      durability = PICKAXES[1].durability;
      paintPick();
      save();
      toast("Crafted a stone pick.");
      opts.onHud(snapshot());
      return "";
    },
    repair() {
      const cost = 8;
      if ((inv.get(13) ?? 0) < cost) return "Need 8 timber to repair.";
      if (durability >= PICKAXES[pickLevel].durability) return "Pick is already fresh.";
      take(13, cost);
      durability = PICKAXES[pickLevel].durability;
      save();
      toast("Pick repaired.");
      opts.onHud(snapshot());
      return "";
    },
    grantVault() {
      if (quests.has("vault")) return "The vault already paid its game reward.";
      give(11, 4);
      give(16, 1);
      coins += 40;
      quests.add("vault");
      save();
      toast("Vault paid game items only. No ORE was minted.");
      opts.onHud(snapshot());
      return "";
    },
    usePortal,
    snapshot,
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", resize);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("contextmenu", onContext);
      save();
      for (const mesh of chunkMeshes.values()) mesh.geometry.dispose();
      atlas.dispose();
      material.dispose();
      renderer.dispose();
    },
  };

  window.__controlsTest = {
    getYaw: () => player.yaw,
    getSpeed: () => Math.hypot(player.vx, player.vz),
    getPos: () => ({ x: player.x, y: player.y, z: player.z }),
    setKeys: (codes) => handle.setKeys(codes),
    setSteer: () => {
      /* FPS strafes; steer is unused. */
    },
  };

  return handle;
}
