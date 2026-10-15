import * as THREE from "three";
import { atmosphereAt, advanceHour } from "@/game/atmosphere";
import { PICKAXES, BLOCKS, block } from "@/game/blocks";
import { placeIntoEdgeOre } from "@/game/content/placement-adapter.mjs";
import { planStructure, type ComputeStructure } from "@/game/compute-structures";
import { IndexedDBChunkStorage, CHUNK_EDGE, CHUNK_VOLUME, type ChunkRecordInput } from "@/game/storage/indexeddb-chunks";
import { validPose, validMachines, type PlayerPose, type MachineEntity } from "@/game/storage/save-state";
import { blockAtlas, meshChunk } from "@/game/mesher";
import { traceVoxel } from "@/game/dda";
import { DIMENSIONS, dimensionSeed, isDimensionId, type DimensionId } from "@/game/dimensions";
import { tryForge } from "@/game/forge";
import { type GameMode, GAME_MODES } from "@/game/modes";
import { buildMiner } from "@/game/miner";
import { SHAFT } from "@/game/shaft";
import { canContinueShaftChannel, SHAFT_COOLDOWN_MS } from "@/game/shaft-channel";
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
  shaftX: number;
  shaftZ: number;
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
  dimensionId: DimensionId;
  hasTerminal: boolean;
  health: number;
  healthMax: number;
  portal: { toName: string; color: string } | null;
  mode: GameMode;
  modeLabel: string;
  pool: number;
  crew: number;
  shaft: { verb: string; item: string; progress: number; ready: boolean } | null;
};

export type TouchInput = { joyX: number; joyY: number; lookDx: number; lookDy: number };

type SaveFile = {
  v: 1 | 2 | 3;
  pose?: PlayerPose;
  machines?: MachineEntity[];
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
  mode?: GameMode;
};

export type GameHandle = {
  start: () => void;
  setPaused: (paused: boolean) => void;
  setKeys: (codes: string[]) => void;
  setTouch: (touch: TouchInput) => void;
  setMining: (held: boolean) => void;
  setMode: (mode: GameMode) => void;
  useItem: () => void;
  toggleView: () => void;
  setJump: (held: boolean) => void;
  place: () => void;
  selectSlot: (index: number) => void;
  sell: (id: number) => string;
  buyPick: (level: number) => string;
  craftStone: () => string;
  repair: () => string;
  grantVault: () => string;
  scanVault: () => string;
  forge: (id: string) => string;
  usePortal: () => string;
  setChannel: (held: boolean) => void;
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
    if (data.v !== 1 && data.v !== 2 && data.v !== 3) return null;
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
  let world: WorldData = generateWorld(dimensionSeed(seed, dimension), dimension, seed);
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
  let health = 20;
  let mode: GameMode = saved?.mode === "community" || saved?.mode === "pool" || saved?.mode === "bunker" ? saved.mode : "solo";
  let pool = 0;
  let crew = 0;
  try {
    crew = Number(localStorage.getItem("edgeore-crew") || 0) || 0;
  } catch {
    crew = 0;
  }
  let crewChannel: BroadcastChannel | null = null;
  try {
    crewChannel = new BroadcastChannel("edgeore-crew");
    crewChannel.onmessage = (event: MessageEvent<{ crew?: number }>) => {
      if (typeof event.data?.crew === "number") crew = event.data.crew;
    };
  } catch {
    crewChannel = null;
  }
  let burnAcc = 0;
  let regenAcc = 0;
  let toldBurn = false;
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

  if (saved?.pose && validPose(saved.pose, world)) {
    player.x = saved.pose.x;
    player.y = saved.pose.y;
    player.z = saved.pose.z;
    player.yaw = saved.pose.yaw;
    player.pitch = saved.pose.pitch;
  }
  const machines: MachineEntity[] = validMachines(saved?.machines) ? saved!.machines!.map(m=>({...m,customData:{...m.customData}})) : [];

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

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x041018);
  scene.fog = new THREE.FogExp2(0x0c2430, 0.032);
  const hemiLight = new THREE.HemisphereLight(0xc8fff4, 0x2a1c14, 0.72);
  const ambientLight = new THREE.AmbientLight(0x7ee7ff, 0.28);
  scene.add(hemiLight);
  scene.add(ambientLight);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.35);
  sun.position.set(24, 40, 24);
  scene.add(sun);
  const shaft = new THREE.SpotLight(0x7ef0ff, 18, 40, 0.55, 0.4, 1);
  shaft.position.set(24, 22, 24);
  shaft.target.position.set(24, 8, 24);
  scene.add(shaft);
  scene.add(shaft.target);

  const glowColors: Record<number, number> = { 7: 0xff8833, 8: 0xffb703, 9: 0xb8fff0, 10: 0x3dff9a, 11: 0x00e5d4, 12: 0x14f195, 16: 0xc084fc, 19: 0x67e8f9, 22: 0xff5500, 23: 0xffd56a, 25: 0xffe08a };
  const glowLights: THREE.PointLight[] = [];
  const lamp = new THREE.PointLight(0x14f195, 6, 14);
  scene.add(lamp);
  const vaultLight = new THREE.PointLight(0x00e5d4, 8, 16);
  scene.add(vaultLight);

  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 2;
  skyCanvas.height = 64;
  const skyCtx = skyCanvas.getContext("2d");
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  function paintSky(top: number, bottom: number) {
    if (!skyCtx) return;
    const grad = skyCtx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, `#${top.toString(16).padStart(6, "0")}`);
    grad.addColorStop(1, `#${bottom.toString(16).padStart(6, "0")}`);
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 2, 64);
    skyTex.needsUpdate = true;
  }
  paintSky(0x1a4660, 0x041018);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(80, 16, 12),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  scene.add(sky);
  const waterMat = new THREE.MeshBasicMaterial({ color: 0x167a96, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
  const waterWaveTime = {value:0};
  waterMat.onBeforeCompile = shader => {
    shader.uniforms.uWaterWaveTime = waterWaveTime;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWaterWaveTime;");
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.z += (sin(transformed.x * 0.4 + uWaterWaveTime * 0.8) + cos(transformed.y * 0.55 - uWaterWaveTime)) * 0.045;");
  };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(WX, 14, 48, 12), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(WX / 2, 8.05, 20);
  scene.add(water);

  const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 120);
  scene.add(camera);

  const atlas = new THREE.CanvasTexture(blockAtlas());
  atlas.magFilter = THREE.NearestFilter;
  atlas.minFilter = THREE.NearestFilter;
  atlas.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <uv_pars_vertex>", "#include <uv_pars_vertex>\nattribute vec4 tileBox;")
      .replace(
        "#include <uv_vertex>",
        "#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = tileBox.xy + fract(vUv) * tileBox.zw;\n#endif",
      );
  };

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
    geo.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
    geo.setAttribute("tileBox", new THREE.BufferAttribute(data.tiles, 4));
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
    (scene.fog as THREE.FogExp2).color.setHex(look.fog);
    (scene.fog as THREE.FogExp2).density = mode === "bunker" ? 0.055 : 0.032;
    paintSky(look.fog, look.sky);
    water.visible = world.dimension === "valley";
    lastSkyUpdate=-1;
    if (world.dimension === "geode") waterMat.color.setHex(0x6a3cb5);
    if (world.dimension === "ember") waterMat.color.setHex(0xc2410c);
    if (world.dimension === "valley") waterMat.color.setHex(0x167a96);
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

  function nearShaft(): boolean {
    return Math.hypot(player.x - world.shaft.x, player.z - world.shaft.z) < 2.3 && Math.abs(player.y - world.shaft.y) < 3;
  }

  function descendShaft(to: DimensionId) {
    const x = world.shaft.x;
    const z = world.shaft.z;
    worlds[dimension] = edits;
    dimension = to;
    edits = worlds[dimension];
    world = generateWorld(dimensionSeed(seed, dimension), dimension, seed);
    applyEdits(world, edits);
    rebuildAll();
    dressWorld();
    player.x = x;
    player.z = z;
    player.y = world.shaft.y;
    player.vx = 0;
    player.vy = 0;
    player.vz = 0;
    mine = null;
    crack.visible = false;
    save();
    opts.onHud(snapshot());
  }

  function tickShaft(dt: number) {
    const link = SHAFT[dimension];
    const holding = (down("KeyP") || channelHeld) && started && !paused;
    const now = performance.now();
    const hasItem = (inv.get(link.item) ?? 0) >= 1;
    const inRange = nearShaft();
    if (!channelOrigin && inRange && holding && hasItem && now >= shaftReadyAt) {
      channelOrigin = { x: player.x, z: player.z };
    }
    if (!canContinueShaftChannel(channelOrigin, player, inRange, holding, hasItem, now, shaftReadyAt)) {
      if (channel > 0) { camera.fov = 72; camera.updateProjectionMatrix(); }
      channel = 0;
      channelOrigin = null;
      return;
    }
    channel = Math.min(1, channel + dt / 3);
    camera.fov = 72 + channel * 12;
    camera.updateProjectionMatrix();
    if (channel < 1) return;
    if (!take(link.item, 1)) {
      channel = 0;
      channelOrigin = null;
      return;
    }
    channel = 0;
    channelOrigin = null;
    shaftReadyAt = now + SHAFT_COOLDOWN_MS;
    camera.fov = 72;
    camera.updateProjectionMatrix();
    descendShaft(link.to);
    toast(
      link.verb === "ascend"
        ? "Climbed the same shaft. The ember shard was a game item. No wallet was asked."
        : "Descended the same shaft. The key was a game item. No wallet was asked.",
    );
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
    world = generateWorld(dimensionSeed(seed, dimension), dimension, seed);
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
  let third = false;
  let channel = 0;
  let channelOrigin: { x: number; z: number } | null = null;
  let shaftReadyAt = 0;
  let channelHeld = false;
  const miner = buildMiner();
  miner.group.visible = false;
  scene.add(miner.group);

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

  // Non-authoritative binary mirror. Existing localStorage edits and economy stay
  // authoritative; restoring chunks requires a future explicit migration.
  let chunkBackupTimer: ReturnType<typeof setTimeout> | null = null;
  const chunkStorage = typeof indexedDB === "undefined" ? null : new IndexedDBChunkStorage();
  let backupChain: Promise<void> = Promise.resolve();
  function flushChunkBackup() {
    if (!chunkStorage) return;
    if (chunkBackupTimer) { clearTimeout(chunkBackupTimer); chunkBackupTimer = null; }
    const currentDimension = dimension;
    const chunks: ChunkRecordInput[] = [];
    for (let cy = 0; cy < Math.ceil(WY / CHUNK_EDGE); cy++) {
      for (let cz = 0; cz < Math.ceil(WZ / CHUNK_EDGE); cz++) {
        for (let cx = 0; cx < Math.ceil(WX / CHUNK_EDGE); cx++) {
          const blockIds = new Uint8Array(CHUNK_VOLUME);
          for (let ly = 0; ly < CHUNK_EDGE; ly++) for (let lz = 0; lz < CHUNK_EDGE; lz++) for (let lx = 0; lx < CHUNK_EDGE; lx++) {
            const x = cx * CHUNK_EDGE + lx, y = cy * CHUNK_EDGE + ly, z = cz * CHUNK_EDGE + lz;
            if (x < WX && y < WY && z < WZ) blockIds[lx + lz * CHUNK_EDGE + ly * CHUNK_EDGE * CHUNK_EDGE] = world.blocks[idx(x,y,z)];
          }
          chunks.push({ world: `seed:${seed}:dimension:${currentDimension}`, x: cx, y: cy, z: cz, blockIds });
        }
      }
    }
    backupChain = backupChain.catch(() => undefined).then(() => chunkStorage.saveChunksBatch(chunks));
    void backupChain.catch(() => { /* localStorage remains authoritative */ });
  }
  function scheduleChunkBackup() {
    if (!chunkStorage) return;
    if (chunkBackupTimer) clearTimeout(chunkBackupTimer);
    chunkBackupTimer = setTimeout(flushChunkBackup, 700);
  }

  function save() {
    const file: SaveFile = {
      v: 3,
      pose: {x:player.x,y:player.y,z:player.z,yaw:player.yaw,pitch:player.pitch},
      machines,
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
      mode,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(file));
      scheduleChunkBackup();
      return true;
    } catch {
      return false;
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
    if (mode === "community" && def.coins > 0) {
      crew += def.coins;
      try {
        localStorage.setItem("edgeore-crew", String(crew));
      } catch {
        /* ignore */
      }
      crewChannel?.postMessage({ crew });
    }
    if (mode === "pool" && def.coins >= 6) {
      pool += 10;
      if (pool >= 100) {
        pool -= 100;
        give(25, 1);
        toast("Pool practice paid a lantern. Game item only. Not ORE.");
      }
    }
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
    if (id === 25 && glowLights.length < 24) {
      const light = new THREE.PointLight(0xffe08a, 1.4, 8);
      light.position.set(x + 0.5, y + 0.8, z + 0.5);
      scene.add(light);
      glowLights.push(light);
    }
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
    const speed = down("ShiftLeft") || down("ShiftRight") ? 8.4 : 5.2;
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
        const impact = player.vy;
        player.onGround = true;
        ny = Math.floor(ny) + 1;
        if (collides(nx, ny, nz)) ny = player.y;
        if (impact < -12) hurt(Math.min(10, Math.floor(-impact - 11)));
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
    tickBody(dt);
  }

  function hurt(amount: number) {
    health = Math.max(0, health - amount);
    if (health > 0) return;
    health = 20;
    burnAcc = 0;
    player.x = world.spawn.x;
    player.y = world.spawn.y;
    player.z = world.spawn.z;
    player.vx = 0;
    player.vy = 0;
    player.vz = 0;
    toast("You blacked out at the spawn. Miner coins stayed in the pack.");
  }

  function tickBody(dt: number) {
    if (!started || paused) return;
    const under = getId(Math.floor(player.x), Math.floor(player.y - 0.08), Math.floor(player.z));
    if (under === 22) {
      regenAcc = 0;
      burnAcc += dt;
      if (burnAcc >= 0.45) {
        burnAcc = 0;
        if (!toldBurn) {
          toldBurn = true;
          toast("Magma burns game health. Your wallet is not involved.");
        }
        hurt(mode === "bunker" ? 4 : 2);
      }
      return;
    }
    burnAcc = 0;
    regenAcc += dt;
    if (regenAcc >= (mode === "bunker" ? 6.4 : 3.2) && health < 20) {
      regenAcc = 0;
      health += 1;
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
      shaftX: world.shaft.x,
      shaftZ: world.shaft.z,
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
      dimensionId: dimension,
      hasTerminal: world.services,
      health,
      healthMax: 20,
      mode,
      modeLabel: GAME_MODES[mode].label,
      pool,
      crew,
      shaft: nearShaft()
        ? {
            verb: SHAFT[dimension].verb,
            item: SHAFT[dimension].itemName,
            progress: channel,
            ready: (inv.get(SHAFT[dimension].item) ?? 0) > 0,
          }
        : null,
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

  let lastPositionSave = 0;
  let graphicsHour = 17.3;
  let lastSkyUpdate = -1;
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
    tickShaft(dt);
    if (started && !paused && now - lastPositionSave > 5000) {
      lastPositionSave = now;
      save();
    }
    camera.position.set(player.x, player.y + EYE, player.z);
    camera.rotation.order = "YXZ";
    if (third) {
      camera.position.set(player.x + Math.sin(player.yaw) * 4.4, player.y + 2.5, player.z + Math.cos(player.yaw) * 4.4);
      camera.lookAt(player.x - Math.sin(player.yaw) * 6, player.y + 1.2 - player.pitch, player.z - Math.cos(player.yaw) * 6);
      miner.group.visible = true;
      miner.group.position.set(player.x, player.y, player.z);
      miner.group.rotation.y = player.yaw;
      miner.arm.rotation.x = -0.7 - Math.sin(swing * Math.PI) * 1.1;
      view.visible = false;
    } else {
      camera.rotation.y = player.yaw;
      camera.rotation.x = player.pitch;
      miner.group.visible = false;
      view.visible = true;
    }
    swing = Math.max(0, swing - dt * 4);
    view.rotation.x = Math.sin(swing * Math.PI) * 0.9;
    const t = now / 1000;
    waterWaveTime.value=t;
    water.position.y = 8.05 + Math.sin(t * 1.4) * 0.035;
    if (world.dimension === "valley") {
      graphicsHour = advanceHour(graphicsHour, dt, true);
      if (now-lastSkyUpdate>1000) {
        lastSkyUpdate=now;
        const atmosphere=atmosphereAt(graphicsHour,"fair");
        sun.position.set(WX/2+Math.cos(atmosphere.sunAngle)*42, Math.sin(atmosphere.sunAngle)*48, WZ/2+18);
        sun.intensity=atmosphere.sunIntensity;
        ambientLight.intensity=atmosphere.ambientIntensity;
        hemiLight.intensity=atmosphere.ambientIntensity*1.6;
        renderer.toneMappingExposure=atmosphere.exposure;
        (scene.background as THREE.Color).setHex(atmosphere.skyTop);
        const fog=scene.fog as THREE.FogExp2;
        fog.color.setHex(atmosphere.fogColor);
        fog.density=mode==="bunker"?Math.max(0.05,atmosphere.fogDensity):atmosphere.fogDensity;
        paintSky(atmosphere.skyTop,atmosphere.skyHorizon);
      }
    }
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

  function applyItem() {
    const id = hotbar[selected] ?? 0;
    if (id !== 26) {
      toast("Select a medkit, then press Q. It only restores game health.");
      return;
    }
    if (!take(26, 1)) return;
    health = Math.min(20, health + 8);
    toast("Medkit restored game health. It did not touch your wallet.");
    save();
    opts.onHud(snapshot());
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === "Space" || e.code === "KeyE" || e.code === "KeyF" || e.code === "KeyR" || e.code === "KeyQ" || e.code === "KeyP") e.preventDefault();
    keys.add(e.code);
    if (!started || paused) return;
    if (e.code === "KeyQ") applyItem();
    if (e.code === "KeyV") {
      third = !third;
      toast(third ? "Third person. The miner is a game model, not a wallet." : "First person.");
    }
    if (e.code.startsWith("Digit")) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 9) selected = n - 1;
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
    if (e.code === "KeyP") channel = 0;
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
    save();
    keys.clear();
    miningHeld = false;
    jumpHeld = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", resize);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("contextmenu", onContext);
  resize();
  raf = requestAnimationFrame(frame);
  opts.onHud(snapshot());

  // Development-only blueprint importer, intentionally not a gameplay or wallet API.
  let blueprintImportQueue: Promise<unknown> = Promise.resolve();
  async function importBlueprint(raw: unknown, origin: [number, number, number]) {
    const { shaftColumn } = await import("@/game/shaft");
    const task = blueprintImportQueue.catch(() => undefined).then(() => placeIntoEdgeOre(raw, origin, {
      BLOCKS, WX, WY, WZ, shaft: shaftColumn(seed), player,
      terminal: world.terminal, vault: world.vault, portals: world.portals, machines,
      readBlock: getId, writeBlock, save,
      flushBackup: async () => { flushChunkBackup(); await backupChain; },
    }));
    blueprintImportQueue = task;
    return task;
  }

  const handle: GameHandle = {
    buildComputeStructure,
    start() {
      started = true;
      paused = false;
      if (!saved?.pose || !validPose(saved.pose, world)) { player.yaw = 0; player.pitch = 0; }
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
    setMode(next) {
      mode = next;
      if (next === "bunker" && !quests.has("bunker-kit")) {
        give(24, 8);
        quests.add("bunker-kit");
        toast("Bunker kit: 8 plates. Magma hits harder. Still not ORE.");
      } else {
        toast(GAME_MODES[next].detail);
      }
      dressWorld();
      save();
      opts.onHud(snapshot());
    },
    useItem() {
      applyItem();
    },
    setChannel(held: boolean) {
      channelHeld = held;
      if (!held && channel < 0.2 && !nearShaft()) usePortal();
      if (!held) channel = 0;
    },
    toggleView() {
      third = !third;
      toast(third ? "Third person. The miner is a game model, not a wallet." : "First person.");
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
      if (!quests.has("scanned")) return "Scan the chamber first. That step stays in the game.";
      if (quests.has("vault")) return "The vault already paid its game reward.";
      const relic = take(23, 1);
      give(11, relic ? 8 : 4);
      give(16, relic ? 2 : 1);
      if (relic) give(12, 1);
      coins += relic ? 80 : 40;
      quests.add("vault");
      save();
      toast(relic ? "Relic bundle paid in game items. No ORE was minted." : "Small bundle paid. An abyss relic pays more. Still not ORE.");
      opts.onHud(snapshot());
      return "";
    },
    scanVault() {
      quests.add("scanned");
      save();
      toast("Chamber scanned. This note is local. It is not an Entropy proof.");
      opts.onHud(snapshot());
      return "";
    },
    forge(id) {
      const counts: Record<number, number> = {};
      for (const [blockId, amount] of inv) counts[blockId] = amount;
      const result = tryForge(counts, id);
      if (!result.ok) return result.reason;
      inv.clear();
      for (const [key, amount] of Object.entries(result.counts)) {
        if (amount > 0) inv.set(Number(key), amount);
      }
      for (let i = 0; i < hotbar.length; i++) if ((inv.get(hotbar[i] ?? 0) ?? 0) <= 0) hotbar[i] = 0;
      for (const [blockId, amount] of inv) {
        if (amount > 0 && !hotbar.includes(blockId)) {
          const empty = hotbar.indexOf(0);
          if (empty >= 0) hotbar[empty] = blockId;
        }
      }
      save();
      toast("Forged a game item. No ORE was minted.");
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
      flushChunkBackup();
      void backupChain.finally(() => chunkStorage?.close());
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

  if (import.meta.env.DEV && (location.hostname === "127.0.0.1" || location.hostname === "localhost") && new URLSearchParams(location.search).get("e2e") === "1") {
    const testControl = Object.freeze({
      snapshot: () => ({...snapshot(), seed, position: {x:player.x,y:player.y,z:player.z}}),
      getBlock: (x:number,y:number,z:number) => inWorld(x,y,z) ? getId(x,y,z) : null,
      placeBlueprint: (raw:unknown, origin:[number,number,number]) => importBlueprint(raw,origin),
      flush: async () => { if(!save())throw Error("Authoritative save failed"); flushChunkBackup(); await backupChain; },
      storage: () => ({database:"edgeore-world-chunks-v1",world:`seed:${seed}:dimension:${dimension}`}),
    });
    Object.defineProperty(window,"__edgeoreE2E",{value:testControl,configurable:true});
  }
  return handle;
}
