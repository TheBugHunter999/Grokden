<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  // ── Types ──────────────────────────────────────────────────────────────
  type NavTab = "galaxy" | "timeline" | "search" | "insights" | "simulate";
  type Command = "explore" | "synthesize" | "recall" | "simulate" | "evolve";

  interface Planet {
    id: string; label: string; x: number; y: number;
    radius: number; color: string; atmosphere: string;
    ringColor?: string; hasRing: boolean; orbitRadius: number;
    orbitSpeed: number; orbitPhase: number; surfaceSeed: number;
    connections: number; level: number; type: string;
    lastAccessed: string; strength: number; category: string;
    description: string; glowIntensity: number;
    notes?: string;
    images?: { id: string; name: string; dataUrl: string; aspectRatio: number }[];
    custom?: boolean;
  }

  interface Camera { x: number; y: number; zoom: number; targetZoom: number; targetX: number; targetY: number; }
  interface Connection { from: string; to: string; color: string; strength: number; }
  interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; }
  interface StreamParticle { connIdx: number; t: number; speed: number; size: number; }

  // ── State ──────────────────────────────────────────────────────────────
  let canvas: HTMLCanvasElement | undefined = $state();
  let animFrame = 0;
  let time = 0;
  let W = 0;
  let H = 0;
  let activeNav = $state<NavTab>("galaxy");
  let selectedPlanet = $state<Planet | null>(null);
  let hoveredPlanet = $state<Planet | null>(null);
  let activeCommand = $state<Command>("explore");
  let isDragging = $state(false);
  let dragDistance = 0;
  let draggedPlanetId: string | null = null;
  let dragStart = { x: 0, y: 0 };
  let mouseScreen = $state({ x: 0, y: 0 });

  const camera: Camera = { x: 0, y: 0, zoom: 0.18, targetZoom: 0.18, targetX: 0, targetY: 0 };

  let particles: Particle[] = [];
  let streamParticles: StreamParticle[] = [];
  let nebulaBlobs: { x: number; y: number; rx: number; ry: number; color1: string; color2: string; opacity: number; rotation: number; pulseSpeed: number; phase: number }[] = [];
  let dustClouds: { x: number; y: number; rx: number; ry: number; color: string; opacity: number; rotation: number; rotSpeed: number; phase: number; density: number }[] = [];
  let mouseWorld = { x: 0, y: 0 };
  let galaxyStarSprite: HTMLCanvasElement | null = null;
  let galaxyStars: { x: number; y: number; size: number; brightness: number; seed: number }[] = [];
  let universeStars: { x: number; y: number; z: number; size: number; brightness: number; rotSpeed: number }[] = [];
  let galaxyTool = $state<"explore" | "move" | "connect">("explore");
  let connectFromId = $state<string | null>(null);
  let showPlanetSpawner = $state(false);
  let planetNotice = $state("");
  let expandedImage = $state<{ name: string; dataUrl: string } | null>(null);
  let persistTimer: ReturnType<typeof setTimeout> | undefined;
  let planetDraft = $state({ name: "New world", type: "Project Memory", color: "#55aadd", radius: 105, hasRing: true });

  // ── Planet Data ──────────────────────────────────────────────────────
  let PLANETS = $state<Planet[]>([
    { id: "experiences", label: "EXPERIENCES", x: -1200, y: -800, radius: 140, color: "#c89650", atmosphere: "#ddb870", ringColor: "#e8d0a0", hasRing: true, orbitRadius: 1450, orbitSpeed: 0.00018, orbitPhase: 0, surfaceSeed: 1, connections: 42100000, level: 8, type: "Sensory Archive", lastAccessed: "1.5m ago", strength: 9.2, category: "experiences", description: "42.1B experiential memory nodes", glowIntensity: 0.8 },
    { id: "skills", label: "SKILLS", x: 1100, y: -950, radius: 110, color: "#ff9f43", atmosphere: "#ffc880", ringColor: "#ffe0b0", hasRing: false, orbitRadius: 1325, orbitSpeed: 0.00025, orbitPhase: 1.2, surfaceSeed: 2, connections: 21300000, level: 7, type: "Procedural Memory", lastAccessed: "3.7m ago", strength: 8.5, category: "skills", description: "21.3B procedural skill patterns", glowIntensity: 0.7 },
    { id: "knowledge", label: "KNOWLEDGE", x: 1450, y: 500, radius: 165, color: "#4cc9f0", atmosphere: "#80e0ff", ringColor: "#a0e8ff", hasRing: true, orbitRadius: 1700, orbitSpeed: 0.00014, orbitPhase: 2.5, surfaceSeed: 3, connections: 38700000, level: 9, type: "Declarative Store", lastAccessed: "2.3s ago", strength: 9.8, category: "knowledge", description: "38.7B factual knowledge nodes", glowIntensity: 0.9 },
    { id: "insights", label: "INSIGHTS", x: -1050, y: 1000, radius: 95, color: "#ff6bb5", atmosphere: "#ff90cc", ringColor: "#ffb0dd", hasRing: false, orbitRadius: 1400, orbitSpeed: 0.00021, orbitPhase: 3.8, surfaceSeed: 4, connections: 8900000, level: 8, type: "Pattern Recognition", lastAccessed: "12s ago", strength: 9.1, category: "insights", description: "8.9B insight connections", glowIntensity: 0.75 },
    { id: "concepts", label: "CONCEPTS", x: 350, y: -1400, radius: 125, color: "#6b9fff", atmosphere: "#90b8ff", ringColor: "#b0d0ff", hasRing: true, orbitRadius: 1575, orbitSpeed: 0.00016, orbitPhase: 5.0, surfaceSeed: 5, connections: 17000000, level: 7, type: "Abstract Framework", lastAccessed: "45s ago", strength: 8.8, category: "concepts", description: "17.0B conceptual structures", glowIntensity: 0.8 },
    { id: "cognition", label: "COGNITION", x: -500, y: 1450, radius: 115, color: "#6bffa0", atmosphere: "#90ffc0", ringColor: "#b0ffd0", hasRing: false, orbitRadius: 1550, orbitSpeed: 0.0002, orbitPhase: 0.7, surfaceSeed: 6, connections: 12840000, level: 9, type: "Meta-Cognitive Hub", lastAccessed: "5s ago", strength: 9.5, category: "cognition", description: "12.8M cognitive processes", glowIntensity: 0.85 },
    { id: "emotions", label: "EMOTIONS", x: -1700, y: 150, radius: 88, color: "#ff5577", atmosphere: "#ff8099", ringColor: "#ffaabb", hasRing: false, orbitRadius: 1800, orbitSpeed: 0.00013, orbitPhase: 2.1, surfaceSeed: 7, connections: 6200000, level: 6, type: "Affective Memory", lastAccessed: "8s ago", strength: 8.2, category: "emotions", description: "6.2B emotional imprints", glowIntensity: 0.65 },
    { id: "language", label: "LANGUAGE", x: 1850, y: -275, radius: 150, color: "#f0e060", atmosphere: "#fff090", ringColor: "#ffffbb", hasRing: true, orbitRadius: 1975, orbitSpeed: 0.00011, orbitPhase: 3.3, surfaceSeed: 8, connections: 31500000, level: 8, type: "Linguistic Core", lastAccessed: "0.8s ago", strength: 9.4, category: "language", description: "31.5B linguistic tokens", glowIntensity: 0.88 },
    { id: "intuition", label: "INTUITION", x: -225, y: -1700, radius: 74, color: "#e0a060", atmosphere: "#f0c080", ringColor: "#f8d8a0", hasRing: false, orbitRadius: 1850, orbitSpeed: 0.00028, orbitPhase: 4.5, surfaceSeed: 9, connections: 3800000, level: 9, type: "Subconscious Oracle", lastAccessed: "0.1s ago", strength: 9.9, category: "intuition", description: "3.8M pre-conscious signals", glowIntensity: 0.95 },
    { id: "creativity", label: "CREATIVITY", x: 800, y: 1350, radius: 175, color: "#ff7744", atmosphere: "#ffaa77", ringColor: "#ffccaa", hasRing: true, orbitRadius: 1675, orbitSpeed: 0.00014, orbitPhase: 5.8, surfaceSeed: 10, connections: 28900000, level: 8, type: "Generative Engine", lastAccessed: "1.2s ago", strength: 9.3, category: "creativity", description: "28.9B creative pathways", glowIntensity: 0.82 },
    { id: "ethics", label: "ETHICS", x: -1550, y: -1250, radius: 64, color: "#88ddff", atmosphere: "#aaeeff", ringColor: "#ccffff", hasRing: false, orbitRadius: 1900, orbitSpeed: 0.00012, orbitPhase: 1.8, surfaceSeed: 11, connections: 2100000, level: 7, type: "Moral Compass", lastAccessed: "22s ago", strength: 8.9, category: "ethics", description: "2.1M ethical frameworks", glowIntensity: 0.7 },
  ]);

  let CONNECTIONS = $state<Connection[]>([
    { from: "experiences", to: "knowledge", color: "#4cc9f0", strength: 0.9 },
    { from: "knowledge", to: "insights", color: "#c89650", strength: 0.85 },
    { from: "skills", to: "knowledge", color: "#ff9f43", strength: 0.8 },
    { from: "insights", to: "concepts", color: "#ff6bb5", strength: 0.75 },
    { from: "concepts", to: "skills", color: "#6b9fff", strength: 0.7 },
    { from: "cognition", to: "insights", color: "#6bffa0", strength: 0.88 },
    { from: "experiences", to: "insights", color: "#ddb870", strength: 0.65 },
    { from: "knowledge", to: "concepts", color: "#80e0ff", strength: 0.72 },
    { from: "cognition", to: "knowledge", color: "#90ffc0", strength: 0.78 },
    { from: "emotions", to: "experiences", color: "#ff5577", strength: 0.82 },
    { from: "emotions", to: "cognition", color: "#ff8899", strength: 0.7 },
    { from: "language", to: "knowledge", color: "#f0e060", strength: 0.92 },
    { from: "language", to: "concepts", color: "#fff090", strength: 0.68 },
    { from: "intuition", to: "insights", color: "#e0a060", strength: 0.88 },
    { from: "intuition", to: "creativity", color: "#f0c080", strength: 0.75 },
    { from: "creativity", to: "skills", color: "#ff7744", strength: 0.82 },
    { from: "creativity", to: "cognition", color: "#ffaa77", strength: 0.7 },
    { from: "ethics", to: "cognition", color: "#88ddff", strength: 0.65 },
    { from: "ethics", to: "experiences", color: "#aaeeff", strength: 0.6 },
    { from: "language", to: "creativity", color: "#ffe080", strength: 0.78 },
  ]);

  const CATEGORIES = [
    { label: "Experiences", count: "42.1B", color: "#c89650" },
    { label: "Knowledge", count: "38.7B", color: "#4cc9f0" },
    { label: "Language", count: "31.5B", color: "#f0e060" },
    { label: "Creativity", count: "28.9B", color: "#ff7744" },
    { label: "Skills", count: "21.3B", color: "#ff9f43" },
    { label: "Concepts", count: "17.0B", color: "#6b9fff" },
    { label: "Insights", count: "8.9B", color: "#ff6bb5" },
    { label: "Emotions", count: "6.2B", color: "#ff5577" },
  ];

  const ORBITING_MEMORIES = [
    { label: "Quantum Dynamics", level: 8, connections: "12.4K" },
    { label: "Emergent Awareness", level: 7, connections: "8.7K" },
    { label: "Meta-Cognition Loops", level: 9, connections: "15.2K" },
    { label: "Self-Reflective Systems", level: 6, connections: "6.3K" },
  ];

  const COMMANDS: { id: Command; label: string; icon: string }[] = [
    { id: "explore", label: "EXPLORE", icon: "✦" },
    { id: "synthesize", label: "SYNTHESIZE", icon: "◈" },
    { id: "recall", label: "RECALL", icon: "◉" },
    { id: "simulate", label: "SIMULATE", icon: "◇" },
    { id: "evolve", label: "EVOLVE", icon: "❋" },
  ];

  const GALAXY_STORAGE_KEY = "Grokden.memoryGalaxy.v2";

  function scheduleGalaxyPersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(GALAXY_STORAGE_KEY, JSON.stringify({ planets: PLANETS, connections: CONNECTIONS }));
      } catch (error) {
        planetNotice = "Galaxy changes are live, but local storage is full.";
        console.warn("Failed to persist memory galaxy", error);
      }
    }, 220);
  }

  function restoreGalaxy() {
    try {
      const stored = localStorage.getItem(GALAXY_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { planets?: Planet[]; connections?: Connection[] };
      if (Array.isArray(parsed.planets) && parsed.planets.length) PLANETS = parsed.planets;
      if (Array.isArray(parsed.connections)) CONNECTIONS = parsed.connections;
    } catch (error) {
      console.warn("Failed to restore memory galaxy", error);
    }
  }

  function ensureProceduralWorlds() {
    const names = [
      "Idea Garden", "Project Vault", "Research", "Design Language", "Future Builds", "References",
      "Experiments", "Dream Log", "Decisions", "People", "Places", "Reading", "Audio", "Visuals",
      "Questions", "Prototypes", "Lessons", "Loose Threads",
    ];
    const colors = ["#7aa2f7", "#6bd6c8", "#e6b566", "#e78aa8", "#93c47d", "#9f8fe8"];
    const additions: Planet[] = [];
    const routes: Connection[] = [];
    names.forEach((name, index) => {
      const id = `archive-${index + 1}`;
      if (PLANETS.some((planet) => planet.id === id)) return;
      const band = Math.floor(index / 6);
      const angle = (index % 6) / 6 * Math.PI * 2 + band * 0.38;
      const distance = 2850 + band * 1650 + (index % 3) * 240;
      const color = colors[index % colors.length];
      additions.push({
        id,
        label: name.toUpperCase(),
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * 0.72,
        radius: 54 + (index * 13) % 34,
        color,
        atmosphere: color,
        ringColor: color,
        hasRing: index % 4 === 0,
        orbitRadius: distance,
        orbitSpeed: 0,
        orbitPhase: 0,
        surfaceSeed: 31 + index,
        connections: 1200 + index * 931,
        level: 2 + index % 6,
        type: "Procedural Archive",
        lastAccessed: `${index + 2}d ago`,
        strength: 5.2 + (index % 5) * 0.7,
        category: "archive",
        description: "A procedurally placed memory world in the outer galaxy.",
        glowIntensity: 0.58,
        notes: "",
        images: [],
      });
      const anchor = ["knowledge", "creativity", "experiences", "skills", "concepts", "insights"][index % 6];
      if (!CONNECTIONS.some((route) => route.from === id && route.to === anchor)) {
        routes.push({ from: id, to: anchor, color, strength: 0.42 });
      }
    });
    if (additions.length) PLANETS = [...PLANETS, ...additions];
    if (routes.length) CONNECTIONS = [...CONNECTIONS, ...routes];
  }

  function updatePlanet(id: string, patch: Partial<Planet>) {
    PLANETS = PLANETS.map((planet) => planet.id === id ? { ...planet, ...patch } : planet);
    if (selectedPlanet?.id === id) selectedPlanet = PLANETS.find((planet) => planet.id === id) ?? null;
    scheduleGalaxyPersist();
  }

  function addPlanet() {
    const name = planetDraft.name.trim();
    if (!name) {
      planetNotice = "Give the planet a name first.";
      return;
    }
    const [x, y] = screenToWorld(W / 2, H / 2);
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "planet"}-${Date.now()}`;
    const color = planetDraft.color;
    const planet: Planet = {
      id,
      label: name.toUpperCase(),
      x: x + 180 / camera.zoom,
      y,
      radius: Math.max(55, Math.min(180, planetDraft.radius)),
      color,
      atmosphere: color,
      ringColor: color,
      hasRing: planetDraft.hasRing,
      orbitRadius: Math.hypot(x, y),
      orbitSpeed: 0,
      orbitPhase: 0,
      surfaceSeed: Math.random() * 1000,
      connections: 0,
      level: 1,
      type: planetDraft.type.trim() || "Project Memory",
      lastAccessed: "just now",
      strength: 5,
      category: "custom",
      description: "A new memory world, ready for ideas and artifacts.",
      glowIntensity: 0.72,
      notes: "",
      images: [],
      custom: true,
    };
    PLANETS = [...PLANETS, planet];
    selectedPlanet = planet;
    showPlanetSpawner = false;
    planetNotice = `${name} entered the galaxy.`;
    camera.targetX = -planet.x;
    camera.targetY = -planet.y;
    camera.targetZoom = 0.75;
    scheduleGalaxyPersist();
  }

  function connectPlanets(fromId: string, toId: string) {
    if (fromId === toId || CONNECTIONS.some((connection) => connection.from === fromId && connection.to === toId)) return;
    const from = PLANETS.find((planet) => planet.id === fromId);
    if (!from) return;
    CONNECTIONS = [...CONNECTIONS, { from: fromId, to: toId, color: from.color, strength: 0.72 }];
    connectFromId = null;
    planetNotice = "Memory route connected.";
    initStreamParticles();
    scheduleGalaxyPersist();
  }

  function resizeImageFile(file: File): Promise<{ id: string; name: string; dataUrl: string; aspectRatio: number }> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error(`${file.name} is not an image.`));
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        reject(new Error(`${file.name} is larger than 12 MB.`));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error(`Could not decode ${file.name}.`));
        image.onload = () => {
          const maxWidth = 1600;
          const maxHeight = 1000;
          const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const output = document.createElement("canvas");
          output.width = width;
          output.height = height;
          const context = output.getContext("2d");
          if (!context) {
            reject(new Error("Image preview is unavailable."));
            return;
          }
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          context.drawImage(image, 0, 0, width, height);
          resolve({
            id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            dataUrl: output.toDataURL("image/webp", 0.86),
            aspectRatio: width / height,
          });
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handlePlanetImageUpload(event: Event) {
    if (!selectedPlanet) return;
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []).slice(0, 6);
    if (!files.length) return;
    planetNotice = "Preparing image previews…";
    try {
      const images = await Promise.all(files.map(resizeImageFile));
      updatePlanet(selectedPlanet.id, { images: [...(selectedPlanet.images ?? []), ...images] });
      planetNotice = `${images.length} image${images.length === 1 ? "" : "s"} added without stretching.`;
    } catch (error) {
      planetNotice = String(error instanceof Error ? error.message : error);
    } finally {
      input.value = "";
    }
  }

  function removePlanetImage(planetId: string, imageId: string) {
    const planet = PLANETS.find((item) => item.id === planetId);
    if (!planet) return;
    updatePlanet(planetId, { images: (planet.images ?? []).filter((image) => image.id !== imageId) });
  }

  // ── Texture System ──────────────────────────────────────────────────
  const PLANET_TEX = ["planet00", "planet05", "planet03", "planet01", "planet04", "planet06", "planet08", "planet07", "planet09", "planet02", "planet08"];
  let planetImages: Map<string, HTMLImageElement> = new Map();
  let cloudImg: HTMLImageElement | null = null;
  let particleImg: HTMLImageElement | null = null;
  let noiseImages: HTMLImageElement[] = [];
  let texturesReady = false;

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img); // resolve even on error so we don't block
      img.src = src;
    });
  }

  async function loadAllTextures() {
    const promises: Promise<void>[] = [];
    // Planet textures
    for (const name of PLANET_TEX) {
      promises.push(loadImage(`/planets/${name}.png`).then(img => { planetImages.set(name, img); }));
    }
    // Cloud (for core bloom)
    promises.push(loadImage("/planets/cloud.png").then(img => { cloudImg = img; }));
    // Particle sprite (for stars/particles)
    promises.push(loadImage("/planets/particle.png").then(img => { particleImg = img; }));
    // Noise textures (for nebula overlays)
    for (let i = 0; i < 5; i++) {
      promises.push(loadImage(`/planets/noise${i}.png`).then(img => { noiseImages.push(img); }));
    }
    await Promise.all(promises);
    texturesReady = true;
  }

  function getPlanetTexture(idx: number): HTMLImageElement | null {
    if (!texturesReady) return null;
    const name = PLANET_TEX[idx % PLANET_TEX.length];
    return planetImages.get(name) || null;
  }

  // ── Galaxy Star System (adapted from 3d-galaxy-particles + particle-galaxy-3js) ──
  function createGalaxySprite() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = "#000";
    g.fillRect(0, 0, 64, 64);
    // Cross diffraction spikes (from 3d-galaxy-particles alpha map)
    let gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "#fff");
    gr.addColorStop(1, "#000");
    g.fillStyle = gr;
    g.fillRect(30, 0, 4, 64);
    g.fillRect(0, 30, 64, 4);
    // Soft circular glow
    gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0.05, "#ffffff");
    gr.addColorStop(0.3, "#ffffffaa");
    gr.addColorStop(0.6, "#ffffff33");
    gr.addColorStop(1.0, "#000000");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    galaxyStarSprite = c;
  }

  function initGalaxyStars() {
    galaxyStars = [];
    const BRANCHES = 3, RADIUS = 5000, SPIN = Math.PI * 3.0, RANDOMNESS = 0.5, COUNT = 6000;
    for (let i = 0; i < COUNT; i++) {
      const progress = i / COUNT;
      const st = Math.sqrt(progress);
      const qt = progress * progress;
      const mt = st + (qt - st) * progress;
      const angle = qt * SPIN * (2.0 - Math.sqrt(1.0 - qt));
      const branchOffset = (Math.PI * 2 / BRANCHES) * Math.floor(Math.random() * BRANCHES);
      const s1 = Math.random();
      const scatter = (Math.random() * 2 - 1) * RANDOMNESS * mt;
      const scatterAngle = Math.random() * Math.PI * 2;
      const x = progress * Math.cos(angle + branchOffset) * RADIUS + Math.cos(scatterAngle) * scatter * RADIUS * 0.28;
      const y = progress * Math.sin(angle + branchOffset) * RADIUS + Math.sin(scatterAngle) * scatter * RADIUS * 0.28;
      galaxyStars.push({
        x, y,
        size: (Math.random() * 2.5 + 0.6) * (1 - mt * 0.35),
        brightness: (1 - mt * 0.55) * (0.45 + Math.random() * 0.55),
        seed: s1,
      });
    }
  }

  function initUniverseStars() {
    universeStars = [];
    const COUNT = 7000, SPHERE_R = 14000;
    for (let i = 0; i < COUNT; i++) {
      const u = Math.random(), v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      let x = Math.sin(phi) * Math.cos(theta) * SPHERE_R * 2.2;
      let y = Math.sin(phi) * Math.sin(theta) * SPHERE_R * 1.4;
      let z = Math.cos(phi) * SPHERE_R * 2.2;
      let q = Math.random(); q = q * q * q * q;
      x *= q; y *= q; z *= q;
      const l = Math.sqrt(x * x + y * y + z * z) / (SPHERE_R * 2.2);
      const sizeMult = (2 - l) * (2 - l);
      universeStars.push({
        x, y, z,
        size: (Math.random() * 1.8 + 0.3) * sizeMult,
        brightness: 0.2 + Math.random() * 0.8,
        rotSpeed: 0.00008 + Math.random() * 0.00035,
      });
    }
  }

  function drawUniverseStars(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of universeStars) {
      const parallax = 0.12 + (s.z / 14000) * 0.12;
      const rotAngle = time * s.rotSpeed;
      const cosA = Math.cos(rotAngle), sinA = Math.sin(rotAngle);
      const rx = s.x * cosA - s.z * sinA;
      const rz = s.x * sinA + s.z * cosA;
      const sx = (rx + camera.x * parallax) * camera.zoom * 0.25 + W / 2;
      const sy = (s.y + camera.y * parallax) * camera.zoom * 0.25 + H / 2;
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      const twinkle = Math.sin(time * 0.015 + s.rotSpeed * 10000) * 0.25 + 0.75;
      const alpha = s.brightness * twinkle * 0.5;
      const size = Math.max(0.5, s.size * camera.zoom * 0.4);
      ctx.globalAlpha = alpha;
      if (size > 2.5 && galaxyStarSprite) {
        const sp = size * 5;
        ctx.drawImage(galaxyStarSprite, sx - sp / 2, sy - sp / 2, sp, sp);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.3, size * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── Galaxy Simulation Helpers (adapted from webgpu-galaxy + particle-galaxy-3js) ──
  function simpleNoise(x: number, y: number, t: number): number {
    return Math.sin(x * 0.003 + t * 0.002) * Math.cos(y * 0.004 + t * 0.001) * 0.5
         + Math.sin(x * 0.007 - y * 0.005 + t * 0.003) * 0.3
         + Math.cos(x * 0.002 + y * 0.006 + t * 0.0015) * 0.2;
  }

  function initDustClouds() {
    dustClouds = [];
    const armCount = 2, tightness = 1.75, maxR = 2200;
    for (let i = 0; i < 35; i++) {
      const armIdx = Math.floor(Math.random() * armCount);
      const armAngle = (armIdx / armCount) * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.7) * maxR;
      const normR = r / maxR;
      const spiralAngle = normR * tightness * Math.PI * 2;
      const angleOffset = (Math.random() - 0.5) * 1.8;
      const angle = armAngle + spiralAngle + angleOffset;
      const rOff = (Math.random() - 0.5) * 600;
      const dist = r + rOff;
      const colors = ["#6ba8cc", "#7a9ab8", "#cc8b6c", "#6ccc8b", "#b8906c", "#8ba8cc"];
      dustClouds.push({
        x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
        rx: 250 + Math.random() * 500, ry: 120 + Math.random() * 250,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.015 + Math.random() * 0.025,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.0002,
        phase: Math.random() * Math.PI * 2,
        density: 1 - normR * 0.5,
      });
    }
  }

  function drawDustClouds(ctx: CanvasRenderingContext2D) {
    const [cx, cy] = worldToScreen(0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const c of dustClouds) {
      const rotAngle = c.rotation + time * c.rotSpeed;
      const wobble = simpleNoise(c.x, c.y, time * 0.5) * 15;
      const [sx, sy] = worldToScreen(c.x + wobble, c.y + wobble * 0.7);
      const rx = c.rx * camera.zoom * c.density;
      const ry = c.ry * camera.zoom * c.density;
      const pulse = Math.sin(time * 0.004 + c.phase) * 0.15 + 0.85;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(rotAngle);
      ctx.globalAlpha = c.opacity * pulse;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
      g.addColorStop(0, c.color + "44");
      g.addColorStop(0.4, c.color + "22");
      g.addColorStop(0.7, c.color + "08");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // ── drawSpiralArmStars removed (replaced by galaxy star system) ──

  // ── Initialize Background ─────────────────────────────────────────────
  let resizeObserver: ResizeObserver | null = null;

  function initBackground() {
    createGalaxySprite();
    initGalaxyStars();
    initUniverseStars();
    nebulaBlobs = [
      { x: -2400, y: -1650, rx: 2400, ry: 1500, color1: "rgba(180,130,60,0.2)", color2: "rgba(85,170,170,0.08)", opacity: 1.0, rotation: 0.3, pulseSpeed: 0.002, phase: 0 },
      { x: 2700, y: 1200, rx: 2250, ry: 1440, color1: "rgba(200,100,80,0.18)", color2: "rgba(200,150,80,0.07)", opacity: 0.95, rotation: -0.5, pulseSpeed: 0.0015, phase: 1.5 },
      { x: -1200, y: 2400, rx: 2100, ry: 1200, color1: "rgba(85,170,170,0.18)", color2: "rgba(107,200,160,0.07)", opacity: 0.85, rotation: 0.8, pulseSpeed: 0.0018, phase: 3.0 },
      { x: 1950, y: -1950, rx: 1800, ry: 1140, color1: "rgba(255,208,107,0.18)", color2: "rgba(255,159,67,0.07)", opacity: 0.8, rotation: -0.2, pulseSpeed: 0.0012, phase: 4.5 },
      { x: 0, y: 0, rx: 3000, ry: 1800, color1: "rgba(200,150,80,0.1)", color2: "rgba(85,170,170,0.04)", opacity: 0.7, rotation: 0, pulseSpeed: 0.001, phase: 2.0 },
      { x: -3000, y: 750, rx: 1650, ry: 1050, color1: "rgba(200,80,90,0.12)", color2: "rgba(200,100,120,0.04)", opacity: 0.6, rotation: 1.2, pulseSpeed: 0.0025, phase: 5.5 },
      { x: 1500, y: 2100, rx: 1500, ry: 900, color1: "rgba(107,200,160,0.1)", color2: "rgba(85,170,170,0.04)", opacity: 0.55, rotation: -0.8, pulseSpeed: 0.002, phase: 0.8 },
    ];
    initDustClouds();
  }

  function initStreamParticles() {
    streamParticles = [];
    for (let ci = 0; ci < CONNECTIONS.length; ci++) {
      for (let i = 0; i < 10; i++) {
        streamParticles.push({ connIdx: ci, t: Math.random(), speed: 0.003 + Math.random() * 0.006, size: 2.5 + Math.random() * 3 });
      }
    }
  }

  // ── Camera Transforms ─────────────────────────────────────────────────
  function worldToScreen(wx: number, wy: number): [number, number] {
    return [(wx + camera.x) * camera.zoom + W / 2, (wy + camera.y) * camera.zoom + H / 2];
  }

  function screenToWorld(sx: number, sy: number): [number, number] {
    return [(sx - W / 2) / camera.zoom - camera.x, (sy - H / 2) / camera.zoom - camera.y];
  }

  // ── Planet Position (with orbit) ──────────────────────────────────────
  function getPlanetWorldPos(p: Planet, t: number): [number, number] {
    const angle = p.orbitPhase + t * p.orbitSpeed;
    const wobble = Math.sin(t * 0.001 + p.surfaceSeed) * 8;
    return [p.x + Math.cos(angle) * 12 + wobble * 0.3, p.y + Math.sin(angle) * 12 + wobble * 0.2];
  }

  // ── Rendering ──────────────────────────────────────────────────────────
  function drawBackground(ctx: CanvasRenderingContext2D) {
    // Deep space gradient (neutral dark, no blue/navy)
    const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 1.2);
    bg.addColorStop(0, "#0e0e14");
    bg.addColorStop(0.2, "#090910");
    bg.addColorStop(0.5, "#060608");
    bg.addColorStop(1, "#030305");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // Subtle cosmic dust wash (diagonal)
    const dust = ctx.createLinearGradient(0, 0, W, H);
    dust.addColorStop(0, "rgba(80,70,50,0.02)");
    dust.addColorStop(0.4, "rgba(60,80,100,0.012)");
    dust.addColorStop(0.7, "rgba(100,70,60,0.015)");
    dust.addColorStop(1, "rgba(60,90,70,0.008)");
    ctx.fillStyle = dust;
    ctx.fillRect(0, 0, W, H);
  }

  function hashStar(x: number, y: number, seed: number) {
    const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return value - Math.floor(value);
  }

  /** Deterministic tiles keep the galaxy populated no matter how far the camera travels. */
  function drawInfiniteStarfield(ctx: CanvasRenderingContext2D) {
    const tileSize = 900;
    const [minX, minY] = screenToWorld(-80, -80);
    const [maxX, maxY] = screenToWorld(W + 80, H + 80);
    const startX = Math.floor(minX / tileSize);
    const endX = Math.ceil(maxX / tileSize);
    const startY = Math.floor(minY / tileSize);
    const endY = Math.ceil(maxY / tileSize);
    ctx.save();
    for (let tileX = startX; tileX <= endX; tileX++) {
      for (let tileY = startY; tileY <= endY; tileY++) {
        for (let index = 0; index < 22; index++) {
          const wx = (tileX + hashStar(tileX, tileY, index * 2)) * tileSize;
          const wy = (tileY + hashStar(tileX, tileY, index * 2 + 1)) * tileSize;
          const [sx, sy] = worldToScreen(wx, wy);
          const brightness = 0.22 + hashStar(tileY, tileX, index + 60) * 0.58;
          const size = 0.45 + hashStar(tileX + 9, tileY - 4, index + 120) * 1.15;
          ctx.globalAlpha = brightness * (0.86 + Math.sin(time * 0.008 + index) * 0.14);
          ctx.fillStyle = index % 11 === 0 ? "#9ab8ff" : index % 7 === 0 ? "#ffe0a8" : "#ffffff";
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawNebulae(ctx: CanvasRenderingContext2D) {
    for (let ni = 0; ni < nebulaBlobs.length; ni++) {
      const n = nebulaBlobs[ni];
      const [sx, sy] = worldToScreen(n.x, n.y);
      const pulse = Math.sin(time * n.pulseSpeed + n.phase) * 0.15 + 0.85;
      const rx = n.rx * camera.zoom;
      const ry = n.ry * camera.zoom;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(n.rotation);
      ctx.globalAlpha = n.opacity * pulse;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
      g.addColorStop(0, n.color1);
      g.addColorStop(0.6, n.color2);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Noise texture overlay for organic depth
      if (noiseImages.length > 0) {
        const noise = noiseImages[ni % noiseImages.length];
        if (noise && noise.complete && noise.naturalWidth > 0) {
          ctx.globalCompositeOperation = "overlay";
          ctx.globalAlpha = n.opacity * pulse * 0.08;
          ctx.drawImage(noise, -rx, -ry, rx * 2, ry * 2);
          ctx.globalCompositeOperation = "source-over";
        }
      }
      ctx.restore();
    }
  }

  function drawStars(ctx: CanvasRenderingContext2D) {
    // Galaxy spiral arm stars (adapted from 3d-galaxy-particles shader + particle-galaxy-3js)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // ── Spiral arm stars ──
    for (let i = 0; i < galaxyStars.length; i++) {
      const s = galaxyStars[i];
      const progress = i / galaxyStars.length;
      const st = Math.sqrt(progress);
      const qt = progress * progress;
      const mt = st + (qt - st) * progress;
      // Differential rotation: center faster (from 3d-galaxy-particles vertex shader)
      const rotAngle = time * 0.00035 * (2.0 - st) * 0.5;
      const cosA = Math.cos(rotAngle), sinA = Math.sin(rotAngle);
      const rx = s.x * cosA - s.y * sinA;
      const ry = s.x * sinA + s.y * cosA;
      // FBM-like organic wobble (curl noise from particle-galaxy-3js)
      const wobbleX = simpleNoise(s.x * 0.006, s.y * 0.006, time * 0.18) * 18 * mt;
      const wobbleY = simpleNoise(s.x * 0.006 + 80, s.y * 0.006 + 80, time * 0.18) * 18 * mt;
      const parallax = 0.6;
      let sx = (rx + wobbleX + camera.x * parallax) * camera.zoom * 0.5 + W / 2;
      let sy = (ry + wobbleY + camera.y * parallax) * camera.zoom * 0.5 + H / 2;
      // Mouse repulsion (from webgpu-galaxy applyMouseForce)
      const mdx = sx - mouseScreen.x;
      const mdy = sy - mouseScreen.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mDist < 250 && mDist > 1) {
        const force = Math.pow(1 - mDist / 250, 2) * 45;
        sx += (mdx / mDist) * force;
        sy += (mdy / mDist) * force;
      }
      if (sx < -100 || sx > W + 100 || sy < -100 || sy > H + 100) continue;
      const twinkle = Math.sin(time * 0.012 + s.seed * 100) * 0.3 + 0.7;
      const alpha = s.brightness * twinkle;
      // Warm-to-cool color gradient (#ff6633 inner → #55aadd outer — no purple)
      const innR = 255, innG = 102, innB = 51;
      const outR = 85, outG = 170, outB = 221;
      const r = Math.round(innR + (outR - innR) * mt);
      const gc = Math.round(innG + (outG - innG) * mt);
      const b = Math.round(innB + (outB - innB) * mt);
      const colorHex = `#${r.toString(16).padStart(2,"0")}${gc.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
      const size = s.size * Math.min(camera.zoom, 2.0);
      ctx.globalAlpha = Math.min(1, alpha);
      if (size > 0.8 && galaxyStarSprite) {
        const spriteSize = size * 16;
        ctx.drawImage(galaxyStarSprite, sx - spriteSize / 2, sy - spriteSize / 2, spriteSize, spriteSize);
        // Color tint overlay
        ctx.globalAlpha = Math.min(1, alpha * 0.25);
        ctx.fillStyle = colorHex;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.4, size * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawConnections(ctx: CanvasRenderingContext2D) {
    for (let ci = 0; ci < CONNECTIONS.length; ci++) {
      const conn = CONNECTIONS[ci];
      const fromP = PLANETS.find(p => p.id === conn.from);
      const toP = PLANETS.find(p => p.id === conn.to);
      if (!fromP || !toP) continue;
      const [fx, fy] = getPlanetWorldPos(fromP, time);
      const [tx, ty] = getPlanetWorldPos(toP, time);
      const [sx1, sy1] = worldToScreen(fx, fy);
      const [sx2, sy2] = worldToScreen(tx, ty);
      const mx = (sx1 + sx2) / 2 + Math.sin(ci * 2.17) * 90 * camera.zoom;
      const my = (sy1 + sy2) / 2 + Math.cos(ci * 1.63) * 70 * camera.zoom;

      // Calm data cables replace the former luminous beams.
      ctx.save();
      ctx.globalAlpha = 0.28 * conn.strength;
      ctx.strokeStyle = conn.color;
      ctx.lineWidth = Math.max(0.65, 1.1 * camera.zoom);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.quadraticCurveTo(mx, my, sx2, sy2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawStreamParticlesOnPaths(ctx: CanvasRenderingContext2D) {
    for (const sp of streamParticles) {
      const conn = CONNECTIONS[sp.connIdx];
      const fromP = PLANETS.find(p => p.id === conn.from);
      const toP = PLANETS.find(p => p.id === conn.to);
      if (!fromP || !toP) continue;
      sp.t += sp.speed;
      if (sp.t > 1) sp.t -= 1;
      const [fx, fy] = getPlanetWorldPos(fromP, time);
      const [tx, ty] = getPlanetWorldPos(toP, time);
      const [sx1, sy1] = worldToScreen(fx, fy);
      const [sx2, sy2] = worldToScreen(tx, ty);
      const mx = (sx1 + sx2) / 2 + Math.sin(time * 0.005 + sp.connIdx) * 25 * camera.zoom;
      const my = (sy1 + sy2) / 2 + Math.cos(time * 0.005 + sp.connIdx) * 20 * camera.zoom;
      const t = sp.t;
      const px = (1 - t) * (1 - t) * sx1 + 2 * (1 - t) * t * mx + t * t * sx2;
      const py = (1 - t) * (1 - t) * sy1 + 2 * (1 - t) * t * my + t * t * sy2;
      const alpha = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1;
      ctx.save();
      ctx.globalAlpha = alpha * 0.7;
      if (particleImg && particleImg.complete && particleImg.naturalWidth > 0) {
        // Use particle sprite for soft glow
        const spriteSize = sp.size * 8 * camera.zoom;
        ctx.drawImage(particleImg, px - spriteSize / 2, py - spriteSize / 2, spriteSize, spriteSize);
      } else {
        // Fallback gradient glow
        const glow = ctx.createRadialGradient(px, py, 0, px, py, sp.size * 6 * camera.zoom);
        glow.addColorStop(0, conn.color);
        glow.addColorStop(0.3, conn.color + "88");
        glow.addColorStop(0.6, conn.color + "22");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, sp.size * 6 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      // Bright core
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, sp.size * 0.8 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCore(ctx: CanvasRenderingContext2D) {
    const [cx, cy] = worldToScreen(0, 0);
    const baseR = 380 * camera.zoom;
    const pulse = Math.sin(time * 0.015) * 0.12 + 0.88;

    // Controlled outer bloom (no screen-filling light)
    const bloom1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 4);
    bloom1.addColorStop(0, `rgba(255,240,200,${0.18 * pulse})`);
    bloom1.addColorStop(0.2, `rgba(255,220,150,${0.08 * pulse})`);
    bloom1.addColorStop(0.5, `rgba(200,150,80,${0.03 * pulse})`);
    bloom1.addColorStop(1, "transparent");
    ctx.fillStyle = bloom1;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 4, 0, Math.PI * 2);
    ctx.fill();

    // Cloud texture bloom overlay (subtle)
    if (cloudImg && cloudImg.complete && cloudImg.naturalWidth > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.08 * pulse;
      const cloudSize = baseR * 4;
      const rot = time * 0.0003;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.drawImage(cloudImg, -cloudSize / 2, -cloudSize / 2, cloudSize, cloudSize);
      ctx.restore();
    }

    // Subtle light rays (8 beams, short, no screen-spanning)
    ctx.save();
    ctx.globalAlpha = 0.08 * pulse;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time * 0.0008;
      const beamLen = baseR * 3.5;
      const beamWidth = 0.035 + Math.sin(time * 0.003 + i) * 0.01;
      const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * beamLen, cy + Math.sin(angle) * beamLen);
      g.addColorStop(0, "#ffd06b");
      g.addColorStop(0.2, "#c8965044");
      g.addColorStop(0.5, "#55aadd22");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle - beamWidth) * beamLen, cy + Math.sin(angle - beamWidth) * beamLen);
      ctx.lineTo(cx + Math.cos(angle + beamWidth) * beamLen, cy + Math.sin(angle + beamWidth) * beamLen);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Spiral arms (4 arms, controlled glow)
    ctx.save();
    for (let arm = 0; arm < 4; arm++) {
      const armAngle = (arm / 4) * Math.PI * 2 + time * 0.0015;
      ctx.globalAlpha = (0.35 + Math.sin(time * 0.01 + arm) * 0.1) * pulse;
      ctx.strokeStyle = arm % 2 === 0 ? "#c89650aa" : "#55aadd99";
      ctx.lineWidth = 5 * camera.zoom;
      ctx.shadowColor = arm % 2 === 0 ? "#c89650" : "#55aadd";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let s = 0; s < 80; s++) {
        const t = s / 80;
        const spiralAngle = armAngle + t * Math.PI * 2.5;
        const spiralR = t * baseR * 3;
        const sx = cx + Math.cos(spiralAngle) * spiralR;
        const sy = cy + Math.sin(spiralAngle) * spiralR;
        if (s === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    // Inner glow (controlled)
    const innerG = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 2);
    innerG.addColorStop(0, `rgba(255,250,240,${0.45 * pulse})`);
    innerG.addColorStop(0.3, `rgba(255,230,180,${0.2 * pulse})`);
    innerG.addColorStop(0.6, `rgba(200,150,80,${0.06 * pulse})`);
    innerG.addColorStop(1, "transparent");
    ctx.fillStyle = innerG;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 2, 0, Math.PI * 2);
    ctx.fill();

    // Core sphere (blazing bright)
    const coreG = ctx.createRadialGradient(cx - baseR * 0.3, cy - baseR * 0.3, 0, cx, cy, baseR);
    coreG.addColorStop(0, `rgba(255,255,255,${pulse})`);
    coreG.addColorStop(0.15, `rgba(255,255,240,${0.98 * pulse})`);
    coreG.addColorStop(0.35, `rgba(255,240,200,${0.9 * pulse})`);
    coreG.addColorStop(0.55, `rgba(255,208,107,${0.8 * pulse})`);
    coreG.addColorStop(0.75, `rgba(200,150,80,${0.6 * pulse})`);
    coreG.addColorStop(1, `rgba(85,170,170,${0.25 * pulse})`);
    ctx.fillStyle = coreG;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.fill();

    // Blazing center hotspot
    const hotspot = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.35);
    hotspot.addColorStop(0, `rgba(255,255,255,${0.95 * pulse})`);
    hotspot.addColorStop(0.4, `rgba(255,250,230,${0.5 * pulse})`);
    hotspot.addColorStop(1, "transparent");
    ctx.fillStyle = hotspot;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Concentric energy rings (subtle)
    for (let r = 1; r <= 5; r++) {
      const ringR = baseR * (0.6 + r * 0.45);
      const ringPulse = Math.sin(time * 0.01 + r * 0.6) * 0.15 + 0.25;
      ctx.strokeStyle = r % 2 === 0 ? `rgba(200,150,80,${ringPulse})` : `rgba(85,170,170,${ringPulse * 0.6})`;
      ctx.lineWidth = (2 - r * 0.2) * camera.zoom;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Core label
    ctx.save();
    ctx.font = `700 ${Math.max(12, 14 * camera.zoom)}px Inter, sans-serif`;
    ctx.fillStyle = `rgba(255,208,107,${0.85 * pulse})`;
    ctx.textAlign = "center";
    ctx.letterSpacing = "0.15em";
    ctx.shadowColor = "#ffd06b";
    ctx.shadowBlur = 10;
    ctx.fillText("CENTRAL NEXUS", cx, cy + baseR + 24 * camera.zoom);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawPlanet(ctx: CanvasRenderingContext2D, p: Planet, pIdx: number) {
    const [wx, wy] = getPlanetWorldPos(p, time);
    const [sx, sy] = worldToScreen(wx, wy);
    const r = p.radius * camera.zoom;
    const isHovered = hoveredPlanet?.id === p.id;
    const isSelected = selectedPlanet?.id === p.id;
    const glowMult = isHovered ? 1.3 : isSelected ? 1.2 : 1;
    const pulse = Math.sin(time * 0.012 + p.surfaceSeed * 2) * 0.1 + 0.9;

    // The planet halo is now the only large light source in the scene.
    const atmosR = r * 2.15 * glowMult;
    const atmosG = ctx.createRadialGradient(sx, sy, r * 0.3, sx, sy, atmosR);
    atmosG.addColorStop(0, p.atmosphere + "cc");
    atmosG.addColorStop(0.15, p.atmosphere + "88");
    atmosG.addColorStop(0.3, p.atmosphere + "44");
    atmosG.addColorStop(0.55, p.atmosphere + "14");
    atmosG.addColorStop(1, "transparent");
    ctx.fillStyle = atmosG;
    ctx.beginPath();
    ctx.arc(sx, sy, atmosR, 0, Math.PI * 2);
    ctx.fill();

    // Secondary outer halo (rim light)
    const haloR = r * 2.2;
    const haloG = ctx.createRadialGradient(sx, sy, r * 0.9, sx, sy, haloR);
    haloG.addColorStop(0, p.color + "66");
    haloG.addColorStop(0.5, p.color + "22");
    haloG.addColorStop(1, "transparent");
    ctx.fillStyle = haloG;
    ctx.beginPath();
    ctx.arc(sx, sy, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Ring (behind planet) - bigger
    if (p.hasRing) {
      ctx.save();
      ctx.globalAlpha = 0.6 * pulse;
      ctx.strokeStyle = p.ringColor || p.atmosphere;
      ctx.lineWidth = 5 * camera.zoom;
      ctx.shadowColor = p.ringColor || p.atmosphere;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 2.1, r * 0.55, 0.3, Math.PI, Math.PI * 2);
      ctx.stroke();
      // Second back ring
      ctx.globalAlpha = 0.35 * pulse;
      ctx.lineWidth = 3 * camera.zoom;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 2.5, r * 0.65, 0.3, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Planet body (texture or gradient)
    const tex = getPlanetTexture(pIdx);
    ctx.save();
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.clip();

    if (tex && tex.complete && tex.naturalWidth > 0) {
      // Draw real planet texture
      const texSize = r * 2.4; // slightly larger than radius for good coverage
      ctx.drawImage(tex, sx - texSize / 2, sy - texSize / 2, texSize, texSize);
      // Subtle animated noise overlay for surface movement
      if (noiseImages.length > 0) {
        const nIdx = pIdx % noiseImages.length;
        const noise = noiseImages[nIdx];
        if (noise && noise.complete && noise.naturalWidth > 0) {
          ctx.globalCompositeOperation = "overlay";
          ctx.globalAlpha = 0.12;
          const rot = time * 0.0002 * (pIdx % 2 === 0 ? 1 : -1);
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(rot);
          ctx.drawImage(noise, -r, -r, r * 2, r * 2);
          ctx.restore();
          ctx.globalCompositeOperation = "source-over";
          ctx.globalAlpha = 1;
        }
      }
    } else {
      // Fallback gradient planet body
      const bodyG = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.35, 0, sx + r * 0.1, sy + r * 0.1, r * 1.1);
      bodyG.addColorStop(0, lightenColor(p.color, 80));
      bodyG.addColorStop(0.3, lightenColor(p.color, 40));
      bodyG.addColorStop(0.6, p.color);
      bodyG.addColorStop(0.85, darkenColor(p.color, 50));
      bodyG.addColorStop(1, darkenColor(p.color, 100));
      ctx.fillStyle = bodyG;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      // Surface detail bands
      ctx.globalAlpha = 0.35;
      for (let b = 0; b < 6; b++) {
        const bandY = sy - r + (b + 0.5) * (r * 2 / 6);
        const bandH = r * 0.18;
        const bandPhase = Math.sin(time * 0.003 + p.surfaceSeed + b * 1.5) * 4;
        ctx.fillStyle = b % 2 === 0 ? lightenColor(p.color, 40) : darkenColor(p.color, 30);
        ctx.beginPath();
        ctx.ellipse(sx + bandPhase, bandY, r * 0.95, bandH, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Storm spots
      for (let s = 0; s < 3; s++) {
        const spotAngle = time * 0.002 + p.surfaceSeed * 2 + s * 2.1;
        const spotX = sx + Math.cos(spotAngle) * r * 0.5;
        const spotY = sy + Math.sin(spotAngle * 0.7) * r * 0.3;
        const spotR = r * (0.1 + s * 0.05);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = lightenColor(p.color, 50);
        ctx.beginPath();
        ctx.arc(spotX, spotY, spotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Specular highlight (subtle on textured planets)
    const specG = ctx.createRadialGradient(sx - r * 0.4, sy - r * 0.4, 0, sx - r * 0.15, sy - r * 0.15, r * 0.8);
    specG.addColorStop(0, tex ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.6)");
    specG.addColorStop(0.2, tex ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.25)");
    specG.addColorStop(0.5, "rgba(255,255,255,0.03)");
    specG.addColorStop(1, "transparent");
    ctx.fillStyle = specG;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Rim light (edge glow from star light)
    ctx.save();
    ctx.globalAlpha = 0.4 * pulse;
    const rimG = ctx.createRadialGradient(sx + r * 0.3, sy + r * 0.3, r * 0.7, sx, sy, r * 1.05);
    rimG.addColorStop(0, "transparent");
    rimG.addColorStop(0.7, "transparent");
    rimG.addColorStop(0.85, p.atmosphere + "88");
    rimG.addColorStop(1, p.atmosphere + "cc");
    ctx.fillStyle = rimG;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ring (in front) - bigger, more dramatic
    if (p.hasRing) {
      ctx.save();
      ctx.globalAlpha = 0.7 * pulse;
      ctx.strokeStyle = p.ringColor || p.atmosphere;
      ctx.lineWidth = 5 * camera.zoom;
      ctx.shadowColor = p.ringColor || p.atmosphere;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 2.1, r * 0.55, 0.3, 0, Math.PI);
      ctx.stroke();
      // Second ring
      ctx.globalAlpha = 0.45 * pulse;
      ctx.lineWidth = 3.5 * camera.zoom;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 2.5, r * 0.65, 0.3, 0, Math.PI);
      ctx.stroke();
      // Third thin ring
      ctx.globalAlpha = 0.25 * pulse;
      ctx.lineWidth = 2 * camera.zoom;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 2.8, r * 0.72, 0.3, 0, Math.PI);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Hover/selection ring
    if (isHovered || isSelected) {
      ctx.save();
      ctx.strokeStyle = isSelected ? "#ffd06b" : "#4cc9f0";
      ctx.lineWidth = 2 * camera.zoom;
      ctx.globalAlpha = 0.85;
      ctx.shadowColor = isSelected ? "#ffd06b" : "#4cc9f0";
      ctx.shadowBlur = 10;
      ctx.setLineDash([4 * camera.zoom, 4 * camera.zoom]);
      ctx.lineDashOffset = time * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, r + 8 * camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Orbiting moons (bigger)
    for (let m = 0; m < 2; m++) {
      const moonAngle = time * 0.008 * (1 + m * 0.5) + p.surfaceSeed + m * Math.PI;
      const moonDist = r * (1.6 + m * 0.5);
      const moonX = sx + Math.cos(moonAngle) * moonDist;
      const moonY = sy + Math.sin(moonAngle) * moonDist * 0.6;
      const moonR = 3 * camera.zoom;
      ctx.fillStyle = `rgba(220,230,255,${0.7 - m * 0.15})`;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();
      // Moon trail
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = "rgba(200,210,255,0.5)";
      ctx.lineWidth = 0.5 * camera.zoom;
      ctx.beginPath();
      ctx.arc(sx, sy, moonDist, moonAngle - 0.5, moonAngle);
      ctx.stroke();
      ctx.restore();
    }

    // Label (larger, brighter)
    ctx.save();
    const fontSize = Math.max(9, 11 * camera.zoom);
    ctx.font = `700 ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = `rgba(224,228,255,${isHovered || isSelected ? 1.0 : 0.75})`;
    ctx.textAlign = "center";
    ctx.letterSpacing = "0.12em";
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 4;
    ctx.fillText(p.label, sx, sy + r + 18 * camera.zoom);
    ctx.shadowBlur = 0;
    if (isHovered || isSelected) {
      ctx.font = `500 ${Math.max(7, 9 * camera.zoom)}px Inter, sans-serif`;
      ctx.fillStyle = "rgba(180,190,230,0.8)";
      ctx.fillText(`${formatCount(p.connections)} connections`, sx, sy + r + 32 * camera.zoom);
    }
    ctx.restore();
  }

  function drawLensFlare(ctx: CanvasRenderingContext2D) {
    const [cx, cy] = worldToScreen(0, 0);
    const dx = cx - W / 2;
    const dy = cy - H / 2;
    // Subtle flare dots (no screen-spanning cross)
    const flarePoints = [0.3, 0.6, 1.0];
    const flareSizes = [12, 20, 10];
    const flareAlphas = [0.06, 0.04, 0.05];
    ctx.save();
    for (let i = 0; i < flarePoints.length; i++) {
      const fx = W / 2 - dx * flarePoints[i];
      const fy = H / 2 - dy * flarePoints[i];
      const size = flareSizes[i] * camera.zoom;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, size);
      g.addColorStop(0, `rgba(220,230,255,${flareAlphas[i]})`);
      g.addColorStop(0.4, `rgba(200,150,80,${flareAlphas[i] * 0.3})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, size, 0, Math.PI * 2);
      ctx.fill();
    }
    // Small center cross
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    const crossLen = 40 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(cx - crossLen, cy);
    ctx.lineTo(cx + crossLen, cy);
    ctx.moveTo(cx, cy - crossLen);
    ctx.lineTo(cx, cy + crossLen);
    ctx.stroke();
    ctx.restore();
  }

  function drawAmbientParticles(ctx: CanvasRenderingContext2D) {
    if (particles.length < 200) {
      particles.push({
        x: (Math.random() - 0.5) * 8000, y: (Math.random() - 0.5) * 6000,
        vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
        life: 0, maxLife: 300 + Math.random() * 500, size: Math.random() * 3.5 + 0.5,
        color: ["#55aadd", "#c89650", "#ffd06b", "#ff8866", "#6bffa0", "#ff9f43", "#f0e060", "#88ccaa"][Math.floor(Math.random() * 8)],
      });
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      // Curl-noise-inspired motion (FBM from particle-galaxy-3js vertex shader)
      const noiseVx = simpleNoise(p.x * 0.008, p.y * 0.008, time * 0.5) * 0.25;
      const noiseVy = simpleNoise(p.x * 0.008 + 77, p.y * 0.008 + 77, time * 0.5) * 0.25;
      p.x += p.vx + noiseVx; p.y += p.vy + noiseVy; p.life++;
      // Mouse repulsion on ambient particles (from webgpu-galaxy applyMouseForce)
      const pdx = p.x - mouseWorld.x;
      const pdy = p.y - mouseWorld.y;
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pDist < 400 && pDist > 1) {
        const force = (1 - pDist / 400) * 2.5;
        p.x += (pdx / pDist) * force;
        p.y += (pdy / pDist) * force;
      }
      if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }
      const [sx, sy] = worldToScreen(p.x, p.y);
      const alpha = p.life < 30 ? p.life / 30 : (p.maxLife - p.life) / 60;
      ctx.save();
      ctx.globalAlpha = Math.min(alpha, 0.6);
      if (particleImg && particleImg.complete && particleImg.naturalWidth > 0) {
        const spriteSize = p.size * 6 * camera.zoom;
        ctx.drawImage(particleImg, sx - spriteSize / 2, sy - spriteSize / 2, spriteSize, spriteSize);
      } else {
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.size * 4 * camera.zoom);
        glow.addColorStop(0, p.color + "88");
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, p.size * 4 * camera.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      // Core
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Orbital Paths & Energy Waves ───────────────────────────────────────
  function drawOrbitalPaths(ctx: CanvasRenderingContext2D) {
    const [cx, cy] = worldToScreen(0, 0);
    for (const p of PLANETS) {
      const orbitR = p.orbitRadius * camera.zoom * 0.5;
      const pulse = Math.sin(time * 0.008 + p.surfaceSeed) * 0.12 + 0.2;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = p.color + "55";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 12]);
      ctx.lineDashOffset = -time * 0.25;
      ctx.beginPath();
      ctx.ellipse(cx, cy, orbitR, orbitR * 0.65, 0.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  function drawEnergyWaves(ctx: CanvasRenderingContext2D) {
    const [cx, cy] = worldToScreen(0, 0);
    for (let w = 0; w < 4; w++) {
      const wavePhase = (time * 0.006 + w * 1.57) % 6.28;
      const waveR = wavePhase * 400 * camera.zoom;
      const waveAlpha = Math.max(0, 1 - wavePhase / 6.28) * 0.1;
      ctx.save();
      ctx.globalAlpha = waveAlpha;
      ctx.strokeStyle = w % 2 === 0 ? "#c89650" : "#55aadd";
      ctx.lineWidth = 1.5 * camera.zoom;
      ctx.beginPath();
      ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Main Render Loop ──────────────────────────────────────────────────
  function render() {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (W < 10 || H < 10) {
      // Canvas not properly sized yet, retry next frame
      animFrame = requestAnimationFrame(render);
      return;
    }
    time++;

    // Smooth camera
    camera.x += (camera.targetX - camera.x) * 0.08;
    camera.y += (camera.targetY - camera.y) * 0.08;
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.08;

    ctx.clearRect(0, 0, W, H);
    drawBackground(ctx);
    drawInfiniteStarfield(ctx);
    drawStars(ctx);
    drawUniverseStars(ctx);
    drawNebulae(ctx);
    drawDustClouds(ctx);
    drawAmbientParticles(ctx);
    drawConnections(ctx);
    try {
      for (let pi = 0; pi < PLANETS.length; pi++) drawPlanet(ctx, PLANETS[pi], pi);
    } catch (_) { /* swallow to keep loop alive */ }

    animFrame = requestAnimationFrame(render);
  }

  // ── Interaction ────────────────────────────────────────────────────────
  function planetAtScreen(screenX: number, screenY: number): Planet | null {
    const [wx, wy] = screenToWorld(screenX, screenY);
    for (let index = PLANETS.length - 1; index >= 0; index--) {
      const planet = PLANETS[index];
      const [px, py] = getPlanetWorldPos(planet, time);
      if (Math.hypot(wx - px, wy - py) < planet.radius + 16 / camera.zoom) return planet;
    }
    return null;
  }

  function focusPlanet(planet: Planet) {
    selectedPlanet = planet;
    const [wx, wy] = getPlanetWorldPos(planet, time);
    camera.targetX = -wx;
    camera.targetY = -wy;
    camera.targetZoom = Math.max(0.55, Math.min(2.5, 400 / (planet.radius * 5)));
    updatePlanet(planet.id, { lastAccessed: "just now" });
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0 || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const hit = planetAtScreen(e.clientX - rect.left, e.clientY - rect.top);
    dragDistance = 0;
    dragStart = { x: e.clientX, y: e.clientY };

    if (galaxyTool === "connect" && hit) {
      if (!connectFromId) {
        connectFromId = hit.id;
        selectedPlanet = hit;
        planetNotice = `Select a destination for ${hit.label}.`;
      } else {
        connectPlanets(connectFromId, hit.id);
      }
      return;
    }

    if (galaxyTool === "move" && hit) {
      draggedPlanetId = hit.id;
      selectedPlanet = hit;
      isDragging = true;
      return;
    }

    isDragging = true;
  }

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const [wx, wy] = screenToWorld(mouseScreen.x, mouseScreen.y);
    mouseWorld = { x: wx, y: wy };

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      dragDistance += Math.hypot(dx, dy);
      if (draggedPlanetId) {
        const planet = PLANETS.find((item) => item.id === draggedPlanetId);
        if (planet) {
          planet.x += dx / camera.zoom;
          planet.y += dy / camera.zoom;
          planet.orbitSpeed = 0;
          planet.orbitPhase = 0;
        }
      } else {
        camera.targetX += dx / camera.zoom;
        camera.targetY += dy / camera.zoom;
        camera.x += dx / camera.zoom;
        camera.y += dy / camera.zoom;
      }
      dragStart = { x: e.clientX, y: e.clientY };
    }

    // Hit test planets
    let found: Planet | null = null;
    for (const p of PLANETS) {
      const [px, py] = getPlanetWorldPos(p, time);
      const dist = Math.sqrt((wx - px) ** 2 + (wy - py) ** 2);
      if (dist < p.radius + 10) { found = p; break; }
    }
    hoveredPlanet = found;
    if (canvas) canvas.style.cursor = found ? "pointer" : isDragging ? "grabbing" : "grab";
  }

  function handleMouseUp(e: MouseEvent) {
    if (e.button !== 0) return;
    const movedPlanet = draggedPlanetId;
    const wasDrag = dragDistance > 4;
    isDragging = false;
    draggedPlanetId = null;
    if (movedPlanet) {
      if (wasDrag) {
        planetNotice = "Planet position saved.";
        scheduleGalaxyPersist();
      }
      return;
    }
    if (!wasDrag && hoveredPlanet) {
      focusPlanet(hoveredPlanet);
    }
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
    camera.targetZoom = Math.max(0.15, Math.min(5, camera.targetZoom * zoomFactor));
  }

  function handleMouseLeave() {
    if (draggedPlanetId) scheduleGalaxyPersist();
    isDragging = false;
    draggedPlanetId = null;
    hoveredPlanet = null;
  }

  // ── Utilities ──────────────────────────────────────────────────────────
  function lightenColor(hex: string, amount: number): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `rgb(${r},${g},${b})`;
  }

  function darkenColor(hex: string, amount: number): string {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
    return `rgb(${r},${g},${b})`;
  }

  function formatCount(n: number): string {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toString();
  }

  function waveform(seed: number, count = 32): number[] {
    return Array.from({ length: count }, (_, i) =>
      Math.sin(seed + i * 0.4) * 0.4 + Math.sin(seed * 1.7 + i * 0.7) * 0.3 + 0.5
    );
  }

  function resetView() {
    camera.targetX = 0; camera.targetY = 0; camera.targetZoom = 0.18;
  }

  function resize() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    W = rect.width; H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }

  let resizeTimeout: ReturnType<typeof setTimeout>;

  onMount(async () => {
    restoreGalaxy();
    ensureProceduralWorlds();
    initBackground();
    initStreamParticles();
    resize();
    // Use ResizeObserver for reliable container sizing
    if (canvas?.parentElement) {
      resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(canvas.parentElement);
    }
    // Force re-resize after layout settles
    resizeTimeout = setTimeout(() => resize(), 200);
    // Start render loop immediately (textures load async)
    animFrame = requestAnimationFrame(render);
    selectedPlanet = PLANETS.find((planet) => planet.id === "knowledge") ?? PLANETS[0] ?? null;
    // Load textures in background (render loop uses gradients until ready)
    await loadAllTextures();
  });

  onDestroy(() => {
    cancelAnimationFrame(animFrame);
    clearTimeout(resizeTimeout);
    clearTimeout(persistTimer);
    resizeObserver?.disconnect();
  });
</script>

<svelte:window onkeydown={(event) => { if (event.key === "Escape") expandedImage = null; }} />

<div class="mg-root">
  <!-- Left Panels -->
  <div class="mg-left">
    <div class="mg-panel">
      <div class="mg-panel__head">
        <span class="mg-dot mg-dot--cyan"></span>
        <span class="mg-panel__title">MEMORY OVERVIEW</span>
      </div>
      <div class="mg-panel__body">
        <div class="mg-big-stat"><span class="mg-big-stat__val">128.7B</span><span class="mg-big-stat__lbl">NODES</span></div>
        <div class="mg-big-stat"><span class="mg-big-stat__val">1.9T</span><span class="mg-big-stat__lbl">CONNECTIONS</span></div>
        <div class="mg-big-stat"><span class="mg-big-stat__val">&infin;</span><span class="mg-big-stat__lbl">DEPTH</span></div>
        <div class="mg-waveform">{#each waveform(1) as v, i}<span class="mg-waveform__bar" style="height:{v*100}%;animation-delay:{i*25}ms"></span>{/each}</div>
      </div>
    </div>
    <div class="mg-panel">
      <div class="mg-panel__head">
        <span class="mg-dot mg-dot--violet"></span>
        <span class="mg-panel__title">COHERENCE</span>
      </div>
      <div class="mg-panel__body mg-panel__body--center">
        <div class="mg-gauge">
          <svg viewBox="0 0 80 80" class="mg-gauge__svg">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(100,120,255,0.1)" stroke-width="4"/>
            <circle cx="40" cy="40" r="34" fill="none" stroke="url(#gaugeGrad)" stroke-width="4" stroke-dasharray="210" stroke-dashoffset="3" stroke-linecap="round" class="mg-gauge__arc"/>
          </svg>
          <svg width="0" height="0"><defs><linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4cc9f0"/><stop offset="100%" stop-color="#a06cff"/></linearGradient></defs></svg>
          <span class="mg-gauge__val">98.7%</span>
        </div>
        <span class="mg-sublbl">WAVE FUNCTION COHERENCE</span>
      </div>
    </div>
    <div class="mg-panel">
      <div class="mg-panel__head">
        <span class="mg-dot mg-dot--gold"></span>
        <span class="mg-panel__title">QUANTUM METRICS</span>
      </div>
      <div class="mg-panel__body">
        <div class="mg-qm"><span class="mg-qm__lbl">Entanglement</span><span class="mg-qm__val mg-qm__val--cyan">98.2%</span></div>
        <div class="mg-qm"><span class="mg-qm__lbl">Superposition</span><span class="mg-qm__val mg-qm__val--violet">&infin;</span></div>
        <div class="mg-qm"><span class="mg-qm__lbl">Decoherence</span><span class="mg-qm__val mg-qm__val--green">0.03%</span></div>
        <div class="mg-qm"><span class="mg-qm__lbl">Retrieval Vel.</span><span class="mg-qm__val mg-qm__val--cyan">2.4Q/s</span></div>
      </div>
    </div>
  </div>

  <!-- Canvas -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="mg-canvas-wrap"
    role="application"
    aria-label="Interactive memory galaxy"
    tabindex="0"
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseLeave}
    onwheel={handleWheel}
  >
    <canvas bind:this={canvas} class="mg-canvas"></canvas>

    <div class="mg-space-tools" role="toolbar" tabindex="0" aria-label="Galaxy tools" onmousedown={(event) => event.stopPropagation()}>
      <button class:active={galaxyTool === "explore"} onclick={() => { galaxyTool = "explore"; connectFromId = null; }}>Explore</button>
      <button class:active={galaxyTool === "move"} onclick={() => { galaxyTool = "move"; connectFromId = null; }}>Move</button>
      <button class:active={galaxyTool === "connect"} onclick={() => { galaxyTool = "connect"; connectFromId = null; }}>Connect</button>
      <span></span>
      <button class="mg-space-tools__add" onclick={() => (showPlanetSpawner = !showPlanetSpawner)}>+ Planet</button>
    </div>

    {#if showPlanetSpawner}
      <div class="mg-spawner" role="dialog" tabindex="-1" aria-label="Spawn a planet" onmousedown={(event) => event.stopPropagation()}>
        <div class="mg-spawner__head">
          <div><span>NEW MEMORY WORLD</span><strong>Spawn a planet</strong></div>
          <button aria-label="Close planet spawner" onclick={() => (showPlanetSpawner = false)}>×</button>
        </div>
        <label><span>Name</span><input type="text" bind:value={planetDraft.name} /></label>
        <label><span>Purpose</span><input type="text" bind:value={planetDraft.type} /></label>
        <div class="mg-spawner__row">
          <label><span>Atmosphere</span><input class="mg-color" type="color" bind:value={planetDraft.color} /></label>
          <label class="mg-spawner__range"><span>Size · {planetDraft.radius}</span><input type="range" min="55" max="180" step="5" bind:value={planetDraft.radius} /></label>
        </div>
        <label class="mg-spawner__ring"><input type="checkbox" bind:checked={planetDraft.hasRing} /><span>Orbital ring</span></label>
        <button class="mg-spawner__submit" onclick={addPlanet}>Create planet</button>
      </div>
    {/if}

    {#if planetNotice}
      <div class="mg-notice" role="status">{planetNotice}</div>
    {/if}

    <!-- Tooltip -->
    {#if hoveredPlanet && !isDragging}
      <div class="mg-tooltip" style="left:{mouseScreen.x + 16}px;top:{mouseScreen.y - 10}px">
        <div class="mg-tooltip__name">{hoveredPlanet.label}</div>
        <div class="mg-tooltip__type">{hoveredPlanet.type} &middot; Level {hoveredPlanet.level}</div>
        <div class="mg-tooltip__stat">{formatCount(hoveredPlanet.connections)} connections</div>
      </div>
    {/if}

    <!-- Reset view button -->
    <button class="mg-reset-btn" onclick={resetView} title="Reset view">
      <svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 2a6 6 0 1 0 6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14 2v6h-6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>

  <!-- Right Panels -->
  <div class="mg-right">
    <div class="mg-panel">
      <div class="mg-panel__head">
        <span class="mg-dot mg-dot--cyan"></span>
        <span class="mg-panel__title">MEMORY CLUSTERS</span>
      </div>
      <div class="mg-panel__body">
        {#each CATEGORIES as cat}
          <div class="mg-cluster-row">
            <span class="mg-cluster-dot" style="background:{cat.color};box-shadow:0 0 6px {cat.color}60"></span>
            <span class="mg-cluster-name">{cat.label}</span>
            <span class="mg-cluster-count">{cat.count}</span>
          </div>
        {/each}
      </div>
    </div>

    {#if selectedPlanet}
      <div class="mg-panel mg-panel--highlight">
        <div class="mg-panel__head">
          <span class="mg-dot mg-dot--gold"></span>
          <span class="mg-panel__title">NODE INSPECTOR</span>
        </div>
        <div class="mg-panel__body">
          <input
            class="mg-inspector__name-input"
            value={selectedPlanet.label}
            aria-label="Planet name"
            oninput={(event) => updatePlanet(selectedPlanet!.id, { label: event.currentTarget.value.toUpperCase() })}
          />
          <div class="mg-inspector__sub">{selectedPlanet.type} &middot; Level {selectedPlanet.level}</div>
          <div class="mg-inspector__row"><span>Last Accessed</span><span>{selectedPlanet.lastAccessed}</span></div>
          <div class="mg-inspector__row"><span>Connections</span><span>{formatCount(selectedPlanet.connections)}</span></div>
          <div class="mg-inspector__row"><span>Strength</span><span class="mg-text--cyan">{selectedPlanet.strength}/10</span></div>
          <div class="mg-inspector__desc">{selectedPlanet.description}</div>
          <div class="mg-significance">
            <div class="mg-significance__bar"><div class="mg-significance__fill" style="width:{selectedPlanet.strength*10}%"></div></div>
            <span class="mg-significance__val">{(selectedPlanet.strength*10).toFixed(1)}%</span>
          </div>
          <div class="mg-journal-head">
            <span>PLANET JOURNAL</span>
            <label class="mg-upload-btn">
              + Images
              <input type="file" accept="image/*" multiple onchange={handlePlanetImageUpload} />
            </label>
          </div>
          <textarea
            class="mg-journal"
            rows="5"
            value={selectedPlanet.notes ?? ""}
            placeholder="Ideas, plans, future projects, or anything worth remembering…"
            oninput={(event) => updatePlanet(selectedPlanet!.id, { notes: event.currentTarget.value })}
          ></textarea>
          {#if selectedPlanet.images?.length}
            <div class="mg-image-grid">
              {#each selectedPlanet.images as image (image.id)}
                <figure style:--image-ratio={image.aspectRatio}>
                  <button class="mg-image-open" aria-label={`Open ${image.name} at full size`} onclick={() => (expandedImage = image)}>
                    <img src={image.dataUrl} alt={image.name} />
                  </button>
                  <button class="mg-image-remove" aria-label={`Remove ${image.name}`} onclick={() => removePlanetImage(selectedPlanet!.id, image.id)}>×</button>
                  <figcaption title={image.name}>{image.name}</figcaption>
                </figure>
              {/each}
            </div>
          {:else}
            <div class="mg-image-empty">Images are resized for this panel and always keep their original proportions.</div>
          {/if}
        </div>
      </div>
    {/if}

    <div class="mg-panel">
      <div class="mg-panel__head">
        <span class="mg-dot mg-dot--pink"></span>
        <span class="mg-panel__title">NEURAL ACTIVITY</span>
        <span class="mg-live">LIVE</span>
      </div>
      <div class="mg-panel__body">
        <div class="mg-neural-wave">{#each waveform(time * 0.05, 48) as v, i}<span class="mg-neural-wave__bar" style="height:{v*100}%;animation-delay:{i*15}ms"></span>{/each}</div>
        <span class="mg-sublbl">SYNAPTIC FLOW</span>
      </div>
    </div>
  </div>

  <!-- Bottom Command Center -->
  <div class="mg-bottom">
    <div class="mg-cmd-center">
      {#each COMMANDS as cmd}
        <button class="mg-cmd-btn" class:mg-cmd-btn--active={activeCommand === cmd.id} onclick={() => activeCommand = cmd.id}>
          <span class="mg-cmd-btn__icon">{cmd.icon}</span>
          <span class="mg-cmd-btn__label">{cmd.label}</span>
        </button>
      {/each}
    </div>
    <div class="mg-nav-bar">
      {#each [{id:"galaxy" as NavTab,l:"GALAXY",i:"✦"},{id:"timeline" as NavTab,l:"TIMELINE",i:"◷"},{id:"search" as NavTab,l:"SEARCH",i:"⌕"},{id:"insights" as NavTab,l:"INSIGHTS",i:"◉"},{id:"simulate" as NavTab,l:"SIMULATE",i:"◇"}] as tab}
        <button class="mg-nav-tab" class:mg-nav-tab--active={activeNav === tab.id} onclick={() => activeNav = tab.id}>
          <span class="mg-nav-tab__icon">{tab.i}</span>
          <span class="mg-nav-tab__label">{tab.l}</span>
        </button>
      {/each}
    </div>
  </div>

  {#if expandedImage}
    <div class="mg-image-viewer" role="dialog" tabindex="-1" aria-modal="true" aria-label={`Image preview: ${expandedImage.name}`} onclick={() => (expandedImage = null)} onkeydown={(event) => { if (event.key === "Escape") expandedImage = null; }}>
      <div class="mg-image-viewer__window" role="document" tabindex="-1" onclick={(event) => event.stopPropagation()} onkeydown={(event) => event.stopPropagation()}>
        <header>
          <div><span>PLANET ASSET</span><strong>{expandedImage.name}</strong></div>
          <button type="button" aria-label="Close image preview" onclick={() => (expandedImage = null)}>×</button>
        </header>
        <div class="mg-image-viewer__stage">
          <img src={expandedImage.dataUrl} alt={expandedImage.name} />
        </div>
        <footer>Original proportions preserved · fit to window</footer>
      </div>
    </div>
  {/if}
</div>

<style>
  .mg-root {
    position: relative; width: 100%; height: 100%;
    min-height: 0; overflow: hidden;
    display: grid;
    grid-template-columns: 260px 1fr 280px;
    grid-template-rows: 1fr auto;
    font-family: "Inter", system-ui, sans-serif;
    background: #030308;
  }
  .mg-canvas-wrap { position: relative; grid-column: 2; grid-row: 1; overflow: hidden; cursor: grab; }
  .mg-canvas { width: 100%; height: 100%; display: block; }
  .mg-left { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; gap: 6px; padding: 10px; overflow-y: auto; z-index: 2; scrollbar-width: none; }
  .mg-left::-webkit-scrollbar { display: none; }
  .mg-right { grid-column: 3; grid-row: 1; display: flex; flex-direction: column; gap: 6px; padding: 10px; overflow-y: auto; z-index: 2; scrollbar-width: none; }
  .mg-right::-webkit-scrollbar { display: none; }
  .mg-bottom { grid-column: 1 / -1; grid-row: 2; z-index: 3; }

  /* Panels */
  .mg-panel {
    background: rgba(8,8,12,0.82); border: 1px solid rgba(200,150,80,0.1);
    border-radius: 10px; backdrop-filter: blur(20px) saturate(1.4);
    transition: border-color 200ms, box-shadow 200ms;
  }
  .mg-panel:hover { border-color: rgba(200,150,80,0.22); box-shadow: 0 0 14px rgba(200,150,80,0.1); }
  .mg-panel--highlight { border-color: rgba(255,208,107,0.2); }
  .mg-panel--highlight:hover { border-color: rgba(255,208,107,0.35); box-shadow: 0 0 16px rgba(255,208,107,0.1); }
  .mg-panel__head { display: flex; align-items: center; gap: 7px; padding: 8px 12px 6px; border-bottom: 1px solid rgba(200,150,80,0.06); }
  .mg-panel__title { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; color: rgba(224,228,255,0.7); }
  .mg-panel__body { padding: 8px 12px 10px; display: flex; flex-direction: column; gap: 6px; }
  .mg-panel__body--center { align-items: center; }

  .mg-dot { width: 5px; height: 5px; border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
  .mg-dot--cyan { background: #4cc9f0; box-shadow: 0 0 6px #4cc9f060; }
  .mg-dot--violet { background: #a06cff; box-shadow: 0 0 6px #a06cff60; }
  .mg-dot--gold { background: #ffd06b; box-shadow: 0 0 6px #ffd06b60; }
  .mg-dot--pink { background: #ff6bb5; box-shadow: 0 0 6px #ff6bb560; }
  @keyframes pulse { 0%,100%{opacity:.6}50%{opacity:1} }

  .mg-live { margin-left: auto; font-size: 7px; font-weight: 700; letter-spacing: 0.12em; padding: 1px 6px; border-radius: 99px; background: rgba(255,80,100,0.15); color: #ff6b8a; border: 1px solid rgba(255,80,100,0.2); animation: pulse 1.5s ease-in-out infinite; }

  /* Big stats */
  .mg-big-stat__val { display: flex; align-items: baseline; gap: 8px; font-size: 18px; font-weight: 700; font-family: "JetBrains Mono", monospace; color: #e0e4ff; text-shadow: 0 0 10px rgba(200,150,80,0.3); }
  .mg-big-stat__lbl { font-size: 9px; color: rgba(136,144,200,0.5); letter-spacing: 0.1em; }

  /* Waveform */
  .mg-waveform { display: flex; align-items: flex-end; gap: 1px; height: 18px; width: 100%; margin-top: 4px; }
  .mg-waveform__bar { flex: 1; min-width: 2px; border-radius: 1px; background: linear-gradient(180deg,#c89650,#55aadd); opacity: 0.7; animation: wave 1.5s ease-in-out infinite alternate; }
  @keyframes wave { 0%{transform:scaleY(.5)}100%{transform:scaleY(1)} }

  /* Gauge */
  .mg-gauge { position: relative; width: 80px; height: 80px; }
  .mg-gauge__svg { width: 100%; height: 100%; }
  .mg-gauge__arc { transform: rotate(-90deg); transform-origin: center; animation: gauge-fill 2s ease-out forwards; }
  @keyframes gauge-fill { from{stroke-dashoffset:210} to{stroke-dashoffset:3} }
  .mg-gauge__val { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; font-family: "JetBrains Mono", monospace; color: #e0e4ff; text-shadow: 0 0 8px rgba(76,201,240,0.3); }
  .mg-sublbl { font-size: 8px; color: rgba(136,144,200,0.4); letter-spacing: 0.08em; text-align: center; }

  /* Quantum metrics */
  .mg-qm { display: flex; align-items: center; gap: 6px; }
  .mg-qm__lbl { flex: 1; font-size: 10px; color: rgba(136,144,200,0.6); }
  .mg-qm__val { font-size: 11px; font-weight: 600; font-family: "JetBrains Mono", monospace; }
  .mg-qm__val--cyan { color: #4cc9f0; text-shadow: 0 0 6px rgba(76,201,240,0.3); }
  .mg-qm__val--violet { color: #c89650; text-shadow: 0 0 6px rgba(200,150,80,0.3); }
  .mg-qm__val--green { color: #6bffa0; text-shadow: 0 0 6px rgba(107,255,160,0.3); }

  /* Clusters */
  .mg-cluster-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
  .mg-cluster-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .mg-cluster-name { flex: 1; font-size: 11px; color: rgba(224,228,255,0.7); }
  .mg-cluster-count { font-size: 10px; font-family: "JetBrains Mono", monospace; color: rgba(136,144,200,0.5); }

  /* Inspector */
  .mg-inspector__sub { font-size: 10px; color: rgba(136,144,200,0.55); }
  .mg-inspector__row { display: flex; justify-content: space-between; font-size: 10px; color: rgba(224,228,255,0.6); padding: 2px 0; border-bottom: 1px solid rgba(100,120,255,0.05); }
  .mg-inspector__row span:last-child { font-family: "JetBrains Mono", monospace; color: rgba(224,228,255,0.8); }
  .mg-inspector__desc { font-size: 10px; color: rgba(136,144,200,0.5); font-style: italic; }
  .mg-text--cyan { color: #4cc9f0 !important; }

  .mg-significance { display: flex; align-items: center; gap: 8px; }
  .mg-significance__bar { flex: 1; height: 3px; background: rgba(100,120,255,0.1); border-radius: 2px; overflow: hidden; }
  .mg-significance__fill { height: 100%; background: linear-gradient(90deg,#c89650,#ffd06b); border-radius: 2px; box-shadow: 0 0 6px rgba(200,150,80,0.4); transition: width 500ms; }
  .mg-significance__val { font-size: 10px; font-family: "JetBrains Mono", monospace; color: #ffd06b; }

  /* Neural waveform */
  .mg-neural-wave { display: flex; align-items: flex-end; gap: 1px; height: 28px; width: 100%; }
  .mg-neural-wave__bar { flex: 1; min-width: 2px; border-radius: 1px; opacity: 0.8; animation: wave 1.2s ease-in-out infinite alternate; background: linear-gradient(180deg,#c89650,#55aadd); }

  /* Tooltip */
  .mg-tooltip { position: absolute; pointer-events: none; z-index: 10; background: rgba(8,8,12,0.92); border: 1px solid rgba(200,150,80,0.2); border-radius: 8px; padding: 8px 12px; backdrop-filter: blur(16px); min-width: 140px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
  .mg-tooltip__name { font-size: 11px; font-weight: 700; color: #e0e4ff; letter-spacing: 0.05em; }
  .mg-tooltip__type { font-size: 9px; color: rgba(136,144,200,0.6); margin-top: 2px; }
  .mg-tooltip__stat { font-size: 9px; color: #4cc9f0; font-family: "JetBrains Mono", monospace; margin-top: 3px; }

  /* Reset button */
  .mg-reset-btn { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border: 1px solid rgba(200,150,80,0.15); border-radius: 8px; background: rgba(8,8,12,0.7); color: rgba(224,228,255,0.6); cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(12px); transition: all 150ms; z-index: 5; }
  .mg-reset-btn:hover { background: rgba(200,150,80,0.2); border-color: rgba(200,150,80,0.3); color: #c89650; }

  /* Galaxy builder */
  .mg-space-tools {
    position: absolute; top: 12px; left: 12px; z-index: 7;
    display: flex; align-items: center; gap: 3px; padding: 4px;
    border: 1px solid rgba(140,160,220,0.16); border-radius: 9px;
    background: rgba(7,8,13,0.84); backdrop-filter: blur(18px) saturate(1.25);
    box-shadow: 0 12px 32px rgba(0,0,0,.34);
  }
  .mg-space-tools button {
    height: 27px; padding: 0 9px; border: 1px solid transparent; border-radius: 6px;
    background: transparent; color: rgba(190,196,220,.55); font: 600 8px/1 "JetBrains Mono", monospace;
    letter-spacing: .06em; cursor: pointer;
  }
  .mg-space-tools button:hover { color: rgba(236,238,248,.86); background: rgba(255,255,255,.045); }
  .mg-space-tools button.active { color: #a9c3ff; border-color: rgba(130,160,230,.26); background: rgba(90,125,210,.14); }
  .mg-space-tools > span { width: 1px; height: 17px; background: rgba(140,160,220,.14); }
  .mg-space-tools .mg-space-tools__add { color: #ffd28a; }

  .mg-spawner {
    position: absolute; top: 52px; left: 12px; z-index: 8; width: 300px; padding: 12px;
    box-sizing: border-box; border: 1px solid rgba(130,160,230,.22); border-radius: 11px;
    background: rgba(7,8,13,.94); backdrop-filter: blur(24px) saturate(1.3);
    box-shadow: 0 24px 60px rgba(0,0,0,.52);
  }
  .mg-spawner__head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
  .mg-spawner__head > div { display: flex; flex-direction: column; gap: 4px; }
  .mg-spawner__head span { color: rgba(120,155,230,.72); font: 600 7px/1 "JetBrains Mono", monospace; letter-spacing: .16em; }
  .mg-spawner__head strong { color: #eceefa; font-size: 13px; font-weight: 600; }
  .mg-spawner__head button { width: 24px; height: 24px; border: 0; border-radius: 5px; background: transparent; color: rgba(190,196,220,.5); font-size: 17px; cursor: pointer; }
  .mg-spawner__head button:hover { color: #fff; background: rgba(255,255,255,.06); }
  .mg-spawner > label, .mg-spawner__row label { display: flex; flex-direction: column; gap: 5px; margin-bottom: 9px; color: rgba(190,196,220,.5); font-size: 8px; font-weight: 600; }
  .mg-spawner input[type="text"] { height: 31px; padding: 0 9px; border: 1px solid rgba(130,150,210,.16); border-radius: 7px; outline: 0; background: rgba(18,20,30,.78); color: #e8eaf4; font: 500 10px/1 Inter, sans-serif; }
  .mg-spawner input[type="text"]:focus { border-color: rgba(120,155,240,.5); }
  .mg-spawner__row { display: grid; grid-template-columns: 84px minmax(0,1fr); gap: 10px; }
  .mg-spawner .mg-color { width: 100%; height: 31px; padding: 3px; border: 1px solid rgba(130,150,210,.16); border-radius: 7px; background: rgba(18,20,30,.78); cursor: pointer; }
  .mg-spawner__range input { height: 31px; accent-color: #7aa2f7; }
  .mg-spawner .mg-spawner__ring { flex-direction: row; align-items: center; gap: 7px; }
  .mg-spawner__ring input { accent-color: #7aa2f7; }
  .mg-spawner__submit { width: 100%; height: 32px; border: 1px solid rgba(120,155,240,.34); border-radius: 7px; background: rgba(85,120,205,.16); color: #dfe7ff; font: 600 9px/1 "JetBrains Mono", monospace; cursor: pointer; }
  .mg-spawner__submit:hover { background: rgba(85,120,205,.26); }
  .mg-notice { position: absolute; left: 12px; bottom: 12px; z-index: 6; max-width: min(360px, calc(100% - 70px)); padding: 7px 10px; border: 1px solid rgba(130,160,220,.15); border-radius: 7px; background: rgba(7,8,13,.82); color: rgba(205,210,230,.62); font: 500 8px/1.3 "JetBrains Mono", monospace; backdrop-filter: blur(12px); }

  .mg-inspector__name-input { width: 100%; box-sizing: border-box; padding: 4px 6px; border: 1px solid transparent; border-radius: 5px; outline: 0; background: transparent; color: #e0e4ff; font: 700 13px/1 Inter, sans-serif; letter-spacing: .02em; }
  .mg-inspector__name-input:hover, .mg-inspector__name-input:focus { border-color: rgba(130,160,230,.2); background: rgba(255,255,255,.025); }
  .mg-journal-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 5px; padding-top: 8px; border-top: 1px solid rgba(120,140,220,.08); }
  .mg-journal-head > span { color: rgba(150,170,225,.56); font: 600 7px/1 "JetBrains Mono", monospace; letter-spacing: .14em; }
  .mg-upload-btn { display: inline-flex; align-items: center; height: 24px; padding: 0 8px; border: 1px solid rgba(120,155,230,.2); border-radius: 6px; background: rgba(80,115,200,.1); color: #a9c3ff; font: 600 8px/1 "JetBrains Mono", monospace; cursor: pointer; }
  .mg-upload-btn:hover { background: rgba(80,115,200,.18); }
  .mg-upload-btn input { display: none; }
  .mg-journal { box-sizing: border-box; width: 100%; min-height: 86px; max-height: 180px; resize: vertical; padding: 8px 9px; border: 1px solid rgba(120,140,210,.12); border-radius: 7px; outline: 0; background: rgba(3,4,8,.52); color: rgba(225,228,242,.76); font: 400 10px/1.45 Inter, sans-serif; }
  .mg-journal:focus { border-color: rgba(120,155,230,.35); }
  .mg-image-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 6px; }
  .mg-image-grid figure { position: relative; min-width: 0; margin: 0; overflow: hidden; border: 1px solid rgba(120,140,210,.12); border-radius: 7px; background: #030408; }
  .mg-image-open { display: block; width: 100%; padding: 0; border: 0; background: transparent; cursor: zoom-in; }
  .mg-image-grid img { display: block; width: 100%; height: 88px; object-fit: contain; background: radial-gradient(circle at center, rgba(100,125,190,.09), transparent 70%); transition: transform 180ms ease, filter 180ms ease; }
  .mg-image-open:hover img { transform: scale(1.025); filter: brightness(1.08); }
  .mg-image-grid figcaption { padding: 5px 6px; overflow: hidden; color: rgba(190,196,220,.48); font: 500 7px/1 "JetBrains Mono", monospace; text-overflow: ellipsis; white-space: nowrap; }
  .mg-image-grid figure .mg-image-remove { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; padding: 0; border: 1px solid rgba(255,255,255,.12); border-radius: 5px; background: rgba(3,4,8,.76); color: rgba(230,232,242,.65); cursor: pointer; }
  .mg-image-grid figure .mg-image-remove:hover { color: #fff; background: rgba(160,50,65,.55); }
  .mg-image-empty { padding: 9px; border: 1px dashed rgba(120,140,210,.13); border-radius: 7px; color: rgba(150,158,190,.4); font-size: 8px; line-height: 1.45; text-align: center; }

  .mg-image-viewer { position: absolute; inset: 0; z-index: 80; display: grid; place-items: center; padding: clamp(16px, 4vw, 54px); background: rgba(1,2,5,.76); backdrop-filter: blur(18px) saturate(.9); animation: mg-viewer-in 180ms ease-out; }
  .mg-image-viewer__window { display: grid; grid-template-rows: auto minmax(0,1fr) auto; width: min(1120px, 94vw); height: min(780px, 86vh); overflow: hidden; border: 1px solid rgba(180,205,245,.24); border-radius: 14px; background: rgba(7,10,16,.96); box-shadow: 0 36px 110px rgba(0,0,0,.72), inset 0 1px rgba(255,255,255,.055); }
  .mg-image-viewer__window header { display: flex; align-items: center; justify-content: space-between; gap: 18px; min-width: 0; padding: 12px 14px; border-bottom: 1px solid rgba(180,205,245,.12); background: rgba(18,23,34,.82); }
  .mg-image-viewer__window header > div { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
  .mg-image-viewer__window header span { color: rgba(148,177,224,.66); font: 600 7px/1 "JetBrains Mono", monospace; letter-spacing: .17em; }
  .mg-image-viewer__window header strong { overflow: hidden; color: #edf2fb; font-size: 12px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .mg-image-viewer__window header button { width: 28px; height: 28px; border: 0; border-radius: 7px; background: transparent; color: rgba(220,226,240,.58); font-size: 20px; cursor: pointer; }
  .mg-image-viewer__window header button:hover { color: #fff; background: rgba(255,255,255,.07); }
  .mg-image-viewer__stage { display: grid; min-width: 0; min-height: 0; place-items: center; overflow: hidden; padding: 18px; background: radial-gradient(circle at 50% 42%, rgba(67,88,126,.15), transparent 58%), #020307; }
  .mg-image-viewer__stage img { display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; filter: drop-shadow(0 18px 50px rgba(0,0,0,.4)); }
  .mg-image-viewer__window footer { padding: 9px 14px; border-top: 1px solid rgba(180,205,245,.09); color: rgba(170,181,204,.48); font: 500 8px/1 "JetBrains Mono", monospace; }
  @keyframes mg-viewer-in { from { opacity: 0; } to { opacity: 1; } }

  /* Bottom */
  .mg-bottom { display: flex; flex-direction: column; gap: 0; }
  .mg-cmd-center { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px; background: rgba(6,6,8,0.88); border-top: 1px solid rgba(200,150,80,0.08); }
  .mg-cmd-btn { display: flex; align-items: center; gap: 5px; padding: 6px 14px; border: 1px solid rgba(200,150,80,0.1); border-radius: 8px; background: rgba(12,12,16,0.6); color: rgba(180,180,200,0.6); font-size: 9px; font-weight: 600; letter-spacing: 0.1em; cursor: pointer; transition: all 180ms; font-family: inherit; }
  .mg-cmd-btn:hover { background: rgba(200,150,80,0.12); border-color: rgba(200,150,80,0.25); color: rgba(224,228,255,0.8); }
  .mg-cmd-btn--active { background: rgba(200,150,80,0.18); border-color: rgba(200,150,80,0.35); color: #c89650; box-shadow: 0 0 10px rgba(200,150,80,0.12); }
  .mg-cmd-btn__icon { font-size: 12px; }

  .mg-nav-bar { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 16px; background: rgba(6,6,8,0.94); border-top: 1px solid rgba(200,150,80,0.08); }
  .mg-nav-tab { display: flex; align-items: center; gap: 5px; padding: 6px 16px; border: none; border-radius: 8px; background: transparent; color: rgba(180,180,200,0.5); font-size: 9px; font-weight: 600; letter-spacing: 0.12em; cursor: pointer; transition: all 180ms; font-family: inherit; }
  .mg-nav-tab:hover { background: rgba(200,150,80,0.06); color: rgba(224,228,255,0.7); }
  .mg-nav-tab--active { background: rgba(200,150,80,0.12); color: #c89650; box-shadow: 0 0 8px rgba(200,150,80,0.1); }
  .mg-nav-tab__icon { font-size: 12px; }

  @media (max-width: 1100px) {
    .mg-root { grid-template-columns: 1fr; }
    .mg-left, .mg-right { display: none; }
    .mg-canvas-wrap { grid-column: 1; }
  }
</style>
