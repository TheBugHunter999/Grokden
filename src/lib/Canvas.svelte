<script lang="ts" module>
  export type CanvasNodeType = "agent" | "mission" | "file" | "note" | "terminal";
  export type CanvasTool = "select" | "pan" | "connect";

  export type CanvasNode = {
    id: string;
    type: CanvasNodeType;
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    subtitle: string;
  };

  export type CanvasEdge = {
    id: string;
    fromId: string;
    toId: string;
  };

  export type CanvasSnapshot = {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  };

  export type CanvasAgentLaunchSpec = {
    id: string;
    role: string;
    model: string;
    cwd: string;
    goal: string;
    prompt: string;
    worktreeIsolation: boolean;
    upstreamRoles: string[];
  };

  export type CanvasPreparedAgent = CanvasAgentLaunchSpec & {
    worktreePath?: string | null;
    branch?: string | null;
  };
</script>

<script lang="ts">
  import { onMount, tick } from "svelte";
  import { open } from "@tauri-apps/plugin-dialog";
  import { grokModels, type AppSettings } from "$lib/editor-utils";
  import { buildGrokLaunchCommand } from "$lib/settings-runtime";
  import Terminal from "$lib/Terminal.svelte";

  let {
    defaultCwd = null,
    settings,
    onLaunchAgents = undefined,
  }: {
    defaultCwd?: string | null;
    settings: AppSettings;
    onLaunchAgents?: (specs: CanvasAgentLaunchSpec[]) => CanvasPreparedAgent[] | void | Promise<CanvasPreparedAgent[] | void>;
  } = $props();

  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 4;
  const ZOOM_STEP = 0.12;
  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 96;
  const UNDO_LIMIT = 50;
  const CANVAS_STORAGE_KEY = "Grokden.canvas.orchestration.v2";

  const NODE_PRESETS: Record<
    CanvasNodeType,
    { title: string; subtitle: string }
  > = {
    agent: { title: "Agent", subtitle: "Runs Grok tasks autonomously" },
    mission: { title: "Mission", subtitle: "Goal-oriented workflow" },
    file: { title: "File", subtitle: "Linked workspace artifact" },
    note: { title: "Note", subtitle: "Freeform context" },
    terminal: { title: "Terminal", subtitle: "Live Grok agent" },
  };

  const EMPTY_PRESETS: { label: string; nodes: CanvasNodeType[] }[] = [
    { label: "Agent swarm", nodes: ["agent", "agent", "mission"] },
    { label: "Mission plan", nodes: ["mission", "agent", "note"] },
    { label: "File map", nodes: ["file", "file", "note"] },
  ];

  let rootEl = $state<HTMLDivElement | undefined>();
  let viewportW = $state(800);
  let viewportH = $state(600);

  let panX = $state(0);
  let panY = $state(0);
  let zoom = $state(1);
  let zoomAnimating = $state(false);

  let nodes = $state<CanvasNode[]>([]);
  let edges = $state<CanvasEdge[]>([]);
  let selectedIds = $state<Set<string>>(new Set());

  let tool = $state<CanvasTool>("select");
  let showMinimap = $state(false);
  let minimapCanvas = $state<HTMLCanvasElement | undefined>();
  const MINIMAP_W = 200;
  const MINIMAP_H = 130;
  const MINIMAP_PAD = 40;

  let spaceHeld = $state(false);
  let isPanning = $state(false);
  let panStart = $state({ x: 0, y: 0, panX: 0, panY: 0 });

  let isMarqueeing = $state(false);
  let marqueeStart = $state({ x: 0, y: 0 });
  let marqueeEnd = $state({ x: 0, y: 0 });

  let draggingNodeId = $state<string | null>(null);
  let dragNodeStart = $state({
    x: 0,
    y: 0,
    nodeX: 0,
    nodeY: 0,
    selectedPositions: new Map<string, { x: number; y: number }>(),
  });

  let connectFromId = $state<string | null>(null);
  let connectPreview = $state<{ x: number; y: number } | null>(null);

  // Context menu state
  let contextMenu = $state<{ x: number; y: number; nodeId: string } | null>(null);
  let contextEditField = $state<"title" | "subtitle" | null>(null);

  let undoStack = $state<CanvasSnapshot[]>([]);
  let redoStack = $state<CanvasSnapshot[]>([]);

  let nextId = $state(1);
  let showAgentLauncher = $state(true);
  let launchingAgents = $state(false);
  let launcherNotice = $state("");
  let workspaceDir = $state("");
  let sharedGoal = $state("Ship a reviewed, production-ready implementation");
  let sharedPrompt = $state("Coordinate through concise handoffs. Keep changes scoped, tested, and easy to review.");
  let isolateWorktrees = $state(false);
  type LiveTerminalStatus = "starting" | "running" | "error";
  type LiveTerminalAgent = CanvasPreparedAgent & {
    nodeId: string;
    injectToken: number;
    status: LiveTerminalStatus;
    error: string;
  };
  let liveTerminalAgents = $state<LiveTerminalAgent[]>([]);
  let canvasHydrated = false;
  let canvasPersistTimer: ReturnType<typeof setTimeout> | undefined;
  let agentDrafts = $state([
    { id: "role-planner", role: "Planner", model: "grok-composer-2.5-fast", cwd: "", prompt: "Break the goal into an executable plan and identify risks before implementation." },
    { id: "role-builder", role: "Builder", model: "grok-build", cwd: "", prompt: "Implement the approved plan, run focused checks, and document meaningful decisions." },
    { id: "role-reviewer", role: "Reviewer", model: "grok-composer-2.5-fast", cwd: "", prompt: "Review the diff, test edge cases, and return actionable findings. Never mark your own review as done." },
  ]);

  const zoomPercent = $derived(Math.round(zoom * 100));
  const isEmpty = $derived(nodes.length === 0);
  const worldTransform = $derived(`translate(${panX}px, ${panY}px) scale(${zoom})`);

  const marqueeRect = $derived.by(() => {
    const left = Math.min(marqueeStart.x, marqueeEnd.x);
    const top = Math.min(marqueeStart.y, marqueeEnd.y);
    const width = Math.abs(marqueeEnd.x - marqueeStart.x);
    const height = Math.abs(marqueeEnd.y - marqueeStart.y);
    return { left, top, width, height };
  });

  function createId(prefix: string) {
    const id = `${prefix}-${nextId}`;
    nextId += 1;
    return id;
  }

  function scheduleCanvasPersist() {
    if (!canvasHydrated) return;
    clearTimeout(canvasPersistTimer);
    canvasPersistTimer = setTimeout(() => {
      try {
        localStorage.setItem(CANVAS_STORAGE_KEY, JSON.stringify({
          nodes: nodes.filter((node) => node.type !== "terminal"),
          edges: edges.filter((edge) => {
            const from = nodes.find((node) => node.id === edge.fromId);
            const to = nodes.find((node) => node.id === edge.toId);
            return from?.type !== "terminal" && to?.type !== "terminal";
          }),
          agentDrafts,
          workspaceDir,
          sharedGoal,
          sharedPrompt,
          isolateWorktrees,
        }));
      } catch (error) {
        console.warn("Failed to persist canvas orchestration", error);
      }
    }, 180);
  }

  function restoreCanvas() {
    try {
      const stored = localStorage.getItem(CANVAS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as {
        nodes?: CanvasNode[];
        edges?: CanvasEdge[];
        agentDrafts?: typeof agentDrafts;
        workspaceDir?: string;
        sharedGoal?: string;
        sharedPrompt?: string;
        isolateWorktrees?: boolean;
      };
      if (Array.isArray(parsed.nodes)) nodes = parsed.nodes;
      if (Array.isArray(parsed.edges)) edges = parsed.edges;
      if (Array.isArray(parsed.agentDrafts) && parsed.agentDrafts.length) agentDrafts = parsed.agentDrafts;
      if (typeof parsed.workspaceDir === "string") workspaceDir = parsed.workspaceDir;
      if (typeof parsed.sharedGoal === "string") sharedGoal = parsed.sharedGoal;
      if (typeof parsed.sharedPrompt === "string") sharedPrompt = parsed.sharedPrompt;
      if (typeof parsed.isolateWorktrees === "boolean") isolateWorktrees = parsed.isolateWorktrees;
      const ids = [...nodes.map((node) => node.id), ...edges.map((edge) => edge.id)];
      nextId = Math.max(1, ...ids.map((id) => Number(id.match(/-(\d+)$/)?.[1] ?? 0) + 1));
    } catch (error) {
      console.warn("Failed to restore canvas orchestration", error);
    }
  }

  function cloneSnapshot(): CanvasSnapshot {
    return {
      nodes: nodes.map((n) => ({ ...n })),
      edges: edges.map((e) => ({ ...e })),
    };
  }

  function restoreSnapshot(snapshot: CanvasSnapshot) {
    nodes = snapshot.nodes.map((n) => ({ ...n }));
    edges = snapshot.edges.map((e) => ({ ...e }));
    selectedIds = new Set(
      [...selectedIds].filter((id) => nodes.some((n) => n.id === id)),
    );
  }

  function pushUndo() {
    undoStack = [...undoStack.slice(-(UNDO_LIMIT - 1)), cloneSnapshot()];
    redoStack = [];
  }

  function undo() {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    redoStack = [...redoStack, cloneSnapshot()];
    restoreSnapshot(prev);
  }

  function screenToWorld(sx: number, sy: number) {
    return {
      x: (sx - panX) / zoom,
      y: (sy - panY) / zoom,
    };
  }

  function getViewportCenterWorld() {
    return screenToWorld(viewportW / 2, viewportH / 2);
  }

  function nodeAnchor(node: CanvasNode, side: "right" | "left" | "center" = "center") {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    if (side === "right") return { x: node.x + node.width, y: cy };
    if (side === "left") return { x: node.x, y: cy };
    return { x: cx, y: cy };
  }

  function bezierPath(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) {
    const dx = Math.abs(to.x - from.x);
    const curvature = Math.max(48, dx * 0.45);
    return `M ${from.x} ${from.y} C ${from.x + curvature} ${from.y}, ${to.x - curvature} ${to.y}, ${to.x} ${to.y}`;
  }

  function edgePath(edge: CanvasEdge) {
    const from = nodes.find((n) => n.id === edge.fromId);
    const to = nodes.find((n) => n.id === edge.toId);
    if (!from || !to) return "";
    return bezierPath(nodeAnchor(from, "right"), nodeAnchor(to, "left"));
  }

  function previewEdgePath() {
    if (!connectFromId || !connectPreview) return "";
    const from = nodes.find((n) => n.id === connectFromId);
    if (!from) return "";
    return bezierPath(nodeAnchor(from, "right"), connectPreview);
  }

  function rectsIntersect(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function nodeBounds(node: CanvasNode) {
    return { x: node.x, y: node.y, width: node.width, height: node.height };
  }

  function setSelection(ids: Iterable<string>, replace = true) {
    const next = replace ? new Set<string>() : new Set(selectedIds);
    for (const id of ids) next.add(id);
    selectedIds = next;
  }

  function clearSelection() {
    selectedIds = new Set();
  }

  function toggleSelection(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }

  function selectNodesInMarquee(additive: boolean) {
    const worldRect = {
      x: (marqueeRect.left - panX) / zoom,
      y: (marqueeRect.top - panY) / zoom,
      width: marqueeRect.width / zoom,
      height: marqueeRect.height / zoom,
    };
    const hits = nodes
      .filter((n) => rectsIntersect(nodeBounds(n), worldRect))
      .map((n) => n.id);
    setSelection(hits, !additive);
  }

  function addNode(type: CanvasNodeType, x?: number, y?: number) {
    const preset = NODE_PRESETS[type];
    const center = getViewportCenterWorld();
    const node: CanvasNode = {
      id: createId("node"),
      type,
      x: x ?? center.x - NODE_WIDTH / 2,
      y: y ?? center.y - NODE_HEIGHT / 2,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      title: preset.title,
      subtitle: preset.subtitle,
    };
    pushUndo();
    nodes = [...nodes, node];
    selectedIds = new Set([node.id]);
    tool = "select";
    return node;
  }

  function addPresetLayout(types: CanvasNodeType[]) {
    pushUndo();
    const center = getViewportCenterWorld();
    const gapX = 240;
    const startX = center.x - ((types.length - 1) * gapX) / 2 - NODE_WIDTH / 2;
    const newNodes = types.map((type, i) => {
      const preset = NODE_PRESETS[type];
      return {
        id: createId("node"),
        type,
        x: startX + i * gapX,
        y: center.y - NODE_HEIGHT / 2,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        title: preset.title,
        subtitle: preset.subtitle,
      } satisfies CanvasNode;
    });
    nodes = [...nodes, ...newNodes];
    selectedIds = new Set(newNodes.map((n) => n.id));
    tool = "select";
  }

  function slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "agent";
  }

  function addRoleDraft(role = `Agent ${agentDrafts.length + 1}`) {
    if (agentDrafts.length >= 8) return;
    agentDrafts = [
      ...agentDrafts,
      {
        id: `role-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role,
        model: "grok-build",
        cwd: "",
        prompt: "",
      },
    ];
  }

  function updateRoleDraft(id: string, field: "role" | "model" | "cwd" | "prompt", value: string) {
    agentDrafts = agentDrafts.map((draft) => draft.id === id ? { ...draft, [field]: value } : draft);
  }

  function removeRoleDraft(id: string) {
    if (agentDrafts.length <= 1) return;
    agentDrafts = agentDrafts.filter((draft) => draft.id !== id);
  }

  async function browseWorkspaceDirectory() {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: "Choose agent workspace",
        defaultPath: workspaceDir || undefined,
      });
      if (typeof result === "string") workspaceDir = result;
    } catch (error) {
      launcherNotice = `Could not open the folder picker: ${String(error)}`;
    }
  }

  function addTerminalLayout(specs: CanvasPreparedAgent[]) {
    pushUndo();
    const center = getViewportCenterWorld();
    const terminalWidth = 430;
    const terminalHeight = 286;
    const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(specs.length))));
    const rows = Math.ceil(specs.length / columns);
    const gapX = 38;
    const gapY = 42;
    const totalWidth = columns * terminalWidth + (columns - 1) * gapX;
    const totalHeight = rows * terminalHeight + (rows - 1) * gapY;
    const startX = center.x - totalWidth / 2;
    const startY = center.y - totalHeight / 2;
    const created = specs.map((spec, index) => ({
      id: createId("terminal"),
      type: "terminal" as const,
      x: startX + (index % columns) * (terminalWidth + gapX),
      y: startY + Math.floor(index / columns) * (terminalHeight + gapY),
      width: terminalWidth,
      height: terminalHeight,
      title: spec.role,
      subtitle: `${grokModels.find((model) => model.id === spec.model)?.label ?? spec.model}${spec.worktreeIsolation ? " · isolated" : ""}`,
    }));
    const createdEdges = created.slice(1).map((node, index) => ({
      id: createId("edge"),
      fromId: created[index].id,
      toId: node.id,
    }));
    nodes = [...nodes, ...created];
    edges = [...edges, ...createdEdges];
    liveTerminalAgents = [
      ...liveTerminalAgents,
      ...specs.map((spec, index) => ({
        ...spec,
        nodeId: created[index].id,
        injectToken: 1,
        status: "starting" as const,
        error: "",
      })),
    ];
    selectedIds = new Set(created.map((node) => node.id));
  }

  function liveTerminalForNode(nodeId: string) {
    return liveTerminalAgents.find((agent) => agent.nodeId === nodeId) ?? null;
  }

  function terminalLaunchCommand(agent: LiveTerminalAgent) {
    return buildGrokLaunchCommand({ ...settings, grokModel: agent.model });
  }

  function terminalPrompt(agent: LiveTerminalAgent) {
    return [
      `ROLE\nYou are the ${agent.role} in a connected Grokden canvas workspace.`,
      agent.goal ? `GOAL\n${agent.goal}` : "",
      agent.prompt ? `STARTING CONTEXT\n${agent.prompt}` : "",
      agent.upstreamRoles.length
        ? `ORCHESTRATION\nYour upstream collaborators are: ${agent.upstreamRoles.join(", ")}. Read their handoffs and leave a concise handoff for the next connected agent.`
        : "",
      agent.worktreeIsolation
        ? `ISOLATION\nWork only in ${agent.branch ?? "your isolated branch"}. Keep the diff scoped and finish with a short change summary.`
        : "",
    ].filter(Boolean).join("\n\n");
  }

  function setLiveTerminalStatus(nodeId: string, status: LiveTerminalStatus, error = "") {
    liveTerminalAgents = liveTerminalAgents.map((agent) =>
      agent.nodeId === nodeId ? { ...agent, status, error } : agent,
    );
  }

  function relaunchLiveTerminal(nodeId: string) {
    liveTerminalAgents = liveTerminalAgents.map((agent) =>
      agent.nodeId === nodeId
        ? { ...agent, injectToken: agent.injectToken + 1, status: "starting" as const, error: "" }
        : agent,
    );
  }

  function removeLiveTerminal(nodeId: string) {
    pushUndo();
    liveTerminalAgents = liveTerminalAgents.filter((agent) => agent.nodeId !== nodeId);
    nodes = nodes.filter((node) => node.id !== nodeId);
    edges = edges.filter((edge) => edge.fromId !== nodeId && edge.toId !== nodeId);
    selectedIds = new Set([...selectedIds].filter((id) => id !== nodeId));
  }

  async function launchAgentWorkspace() {
    const cwd = workspaceDir.trim();
    const validDrafts = agentDrafts.filter((draft) => draft.role.trim());
    if (!cwd) {
      launcherNotice = "Choose a working directory before launch.";
      return;
    }
    if (!validDrafts.length) {
      launcherNotice = "Add at least one named role.";
      return;
    }
    const specs: CanvasAgentLaunchSpec[] = validDrafts.map((draft, index) => ({
      id: `${slugify(draft.role)}-${Date.now()}-${index + 1}`,
      role: draft.role.trim(),
      model: draft.model,
      cwd: draft.cwd.trim() || cwd,
      goal: sharedGoal.trim(),
      prompt: [sharedPrompt.trim(), draft.prompt.trim()].filter(Boolean).join("\n\n"),
      worktreeIsolation: isolateWorktrees,
      upstreamRoles: validDrafts.slice(0, index).map((item) => item.role.trim()),
    }));
    launcherNotice = isolateWorktrees ? "Preparing isolated branches…" : "Launching connected terminals…";
    launchingAgents = true;
    try {
      const result = await onLaunchAgents?.(specs);
      const prepared = Array.isArray(result) ? result : specs;
      addTerminalLayout(prepared);
      launcherNotice = `${prepared.length} live terminal${prepared.length === 1 ? "" : "s"} launched on Canvas.`;
      showAgentLauncher = false;
    } catch (error) {
      launcherNotice = `Launch failed: ${String(error)}`;
    } finally {
      launchingAgents = false;
    }
  }

  function deleteSelected() {
    if (!selectedIds.size) return;
    pushUndo();
    const removed = selectedIds;
    liveTerminalAgents = liveTerminalAgents.filter((agent) => !removed.has(agent.nodeId));
    nodes = nodes.filter((n) => !removed.has(n.id));
    edges = edges.filter((e) => !removed.has(e.fromId) && !removed.has(e.toId));
    selectedIds = new Set();
    if (connectFromId && removed.has(connectFromId)) connectFromId = null;
  }

  function addEdge(fromId: string, toId: string) {
    if (fromId === toId) return;
    if (edges.some((e) => e.fromId === fromId && e.toId === toId)) return;
    pushUndo();
    edges = [...edges, { id: createId("edge"), fromId, toId }];
  }

  function setZoomAt(nextZoom: number, anchorX: number, anchorY: number, animate = true) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    const ratio = clamped / zoom;
    panX = anchorX - (anchorX - panX) * ratio;
    panY = anchorY - (anchorY - panY) * ratio;
    zoom = clamped;
    if (animate) {
      zoomAnimating = true;
      window.setTimeout(() => {
        zoomAnimating = false;
      }, 120);
    }
  }

  function zoomBy(delta: number, anchorX = viewportW / 2, anchorY = viewportH / 2) {
    setZoomAt(zoom + delta, anchorX, anchorY, true);
  }

  function fitToView() {
    if (!nodes.length) {
      setZoomAt(1, viewportW / 2, viewportH / 2, true);
      panX = 0;
      panY = 0;
      return;
    }
    const padding = 80;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    const bw = maxX - minX;
    const bh = maxY - minY;
    const scale = Math.min(
      (viewportW - padding * 2) / bw,
      (viewportH - padding * 2) / bh,
      MAX_ZOOM,
    );
    const nextZoom = Math.max(MIN_ZOOM, scale);
    zoomAnimating = true;
    zoom = nextZoom;
    panX = (viewportW - bw * nextZoom) / 2 - minX * nextZoom;
    panY = (viewportH - bh * nextZoom) / 2 - minY * nextZoom;
    window.setTimeout(() => {
      zoomAnimating = false;
    }, 120);
  }

  function resetZoomOneToOne() {
    const cx = viewportW / 2;
    const cy = viewportH / 2;
    setZoomAt(1, cx, cy, true);
  }

  function shouldPan(e: PointerEvent | MouseEvent) {
    if (tool === "pan" && e.button === 0) return true;
    if (spaceHeld && e.button === 0) return true;
    return e.button === 1;
  }

  function isChromeTarget(target: EventTarget | null) {
    if (!(target instanceof Element) || !rootEl) return false;
    return !!target.closest(
      ".grok-canvas__node, .grok-canvas__toolbar, .grok-canvas__zoom, .grok-canvas__minimap-toggle, .grok-canvas__empty-actions, .grok-canvas__agent-launcher, .grok-canvas__launch-button",
    );
  }

  function isBackgroundTarget(target: EventTarget | null) {
    if (isChromeTarget(target)) return false;
    if (!(target instanceof Element)) return false;
    return target === rootEl || !!target.closest(".grok-canvas__surface, .grok-canvas__grid");
  }

  function localPoint(e: PointerEvent | MouseEvent) {
    const rect = rootEl?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: PointerEvent) {
    rootEl?.focus({ preventScroll: true });
    const pt = localPoint(e);

    if (shouldPan(e) && !isChromeTarget(e.target)) {
      isPanning = true;
      panStart = { x: pt.x, y: pt.y, panX, panY };
      e.preventDefault();
      return;
    }

    if (tool === "select" && e.button === 0 && isBackgroundTarget(e.target)) {
      isMarqueeing = true;
      marqueeStart = pt;
      marqueeEnd = pt;
      if (!e.shiftKey) clearSelection();
    }
  }

  function onPointerMove(e: PointerEvent) {
    const pt = localPoint(e);

    if (isPanning) {
      panX = panStart.panX + (pt.x - panStart.x);
      panY = panStart.panY + (pt.y - panStart.y);
      return;
    }

    if (isMarqueeing) {
      marqueeEnd = pt;
      return;
    }

    if (draggingNodeId) {
      const dx = (pt.x - dragNodeStart.x) / zoom;
      const dy = (pt.y - dragNodeStart.y) / zoom;
      nodes = nodes.map((n) => {
        const start = dragNodeStart.selectedPositions.get(n.id);
        if (!start) return n;
        return { ...n, x: start.x + dx, y: start.y + dy };
      });
      return;
    }

    if (tool === "connect" && connectFromId) {
      connectPreview = screenToWorld(pt.x, pt.y);
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (isMarqueeing) {
      if (marqueeRect.width > 4 || marqueeRect.height > 4) {
        selectNodesInMarquee(e.shiftKey);
      } else if (!e.shiftKey) {
        clearSelection();
      }
    }

    if (draggingNodeId) {
      const orig = dragNodeStart.selectedPositions.get(draggingNodeId);
      const current = nodes.find((n) => n.id === draggingNodeId);
      if (
        orig &&
        current &&
        Math.abs(orig.x - current.x) < 0.5 &&
        Math.abs(orig.y - current.y) < 0.5
      ) {
        undo();
      }
      draggingNodeId = null;
    }

    isPanning = false;
    isMarqueeing = false;
    connectPreview = null;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const pt = localPoint(e);
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoomAt(zoom + delta * zoom, pt.x, pt.y, true);
  }

  function onNodePointerDown(e: PointerEvent, node: CanvasNode) {
    e.stopPropagation();
    rootEl?.focus({ preventScroll: true });

    if (tool === "connect") {
      if (!connectFromId) {
        connectFromId = node.id;
      } else if (connectFromId !== node.id) {
        addEdge(connectFromId, node.id);
        connectFromId = null;
      }
      return;
    }

    if (tool !== "select" || e.button !== 0) return;

    if (e.shiftKey) toggleSelection(node.id);
    else if (!selectedIds.has(node.id)) setSelection([node.id]);

    pushUndo();
    draggingNodeId = node.id;
    const pt = localPoint(e);
    const positions = new Map<string, { x: number; y: number }>();
    for (const id of selectedIds) {
      const n = nodes.find((item) => item.id === id);
      if (n) positions.set(id, { x: n.x, y: n.y });
    }
    dragNodeStart = {
      x: pt.x,
      y: pt.y,
      nodeX: node.x,
      nodeY: node.y,
      selectedPositions: positions,
    };
  }

  // ── Context menu ───────────────────────────────────────────────────
  function onNodeContextMenu(e: MouseEvent, node: CanvasNode) {
    e.preventDefault();
    e.stopPropagation();
    const pt = localPoint(e);
    contextMenu = { x: pt.x, y: pt.y, nodeId: node.id };
    contextEditField = null;
  }

  function closeContextMenu() {
    contextMenu = null;
    contextEditField = null;
  }

  function contextDeleteNode() {
    if (!contextMenu) return;
    pushUndo();
    liveTerminalAgents = liveTerminalAgents.filter((agent) => agent.nodeId !== contextMenu!.nodeId);
    nodes = nodes.filter(n => n.id !== contextMenu!.nodeId);
    edges = edges.filter(e => e.fromId !== contextMenu!.nodeId && e.toId !== contextMenu!.nodeId);
    selectedIds = new Set([...selectedIds].filter(id => id !== contextMenu!.nodeId));
    closeContextMenu();
  }

  function contextDuplicateNode() {
    if (!contextMenu) return;
    const orig = nodes.find(n => n.id === contextMenu!.nodeId);
    if (!orig) return;
    addNode(orig.type, orig.x + 40, orig.y + 40);
    closeContextMenu();
  }

  function contextUpdateField(field: "title" | "subtitle", value: string) {
    if (!contextMenu) return;
    pushUndo();
    nodes = nodes.map(n => n.id === contextMenu!.nodeId ? { ...n, [field]: value } : n);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = e.key.toLowerCase();

    if (e.code === "Space" && !spaceHeld) {
      spaceHeld = true;
      e.preventDefault();
    }

    if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }

    if (key === "delete" || key === "backspace") {
      e.preventDefault();
      deleteSelected();
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (key === "v") tool = "select";
    if (key === "h") tool = "pan";
    if (key === "c") tool = "connect";
    if (key === "n") addNode("agent");

    if (key === "escape") {
      connectFromId = null;
      connectPreview = null;
      draggingNodeId = null;
      isMarqueeing = false;
      isPanning = false;
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "Space") spaceHeld = false;
  }

  function updateViewportSize() {
    if (!rootEl) return;
    viewportW = rootEl.clientWidth;
    viewportH = rootEl.clientHeight;
  }

  let resizeObserver: ResizeObserver | undefined;

  onMount(() => {
    restoreCanvas();
    updateViewportSize();
    resizeObserver = new ResizeObserver(() => updateViewportSize());
    if (rootEl) resizeObserver.observe(rootEl);
    void tick().then(() => rootEl?.focus({ preventScroll: true }));

    if (!workspaceDir && defaultCwd) workspaceDir = defaultCwd;
    canvasHydrated = true;

    return () => {
      clearTimeout(canvasPersistTimer);
      resizeObserver?.disconnect();
    };
  });

  $effect(() => {
    void nodes;
    void edges;
    void agentDrafts;
    void workspaceDir;
    void sharedGoal;
    void sharedPrompt;
    void isolateWorktrees;
    scheduleCanvasPersist();
  });

  // ── Live Minimap ─────────────────────────────────────────────────────
  function getMinimapBounds() {
    if (!nodes.length) return { minX: -500, minY: -300, maxX: 500, maxY: 300, scaleX: 1, scaleY: 1, scale: 1 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    minX -= MINIMAP_PAD; minY -= MINIMAP_PAD;
    maxX += MINIMAP_PAD; maxY += MINIMAP_PAD;
    // Include viewport bounds
    const vpTL = screenToWorld(0, 0);
    const vpBR = screenToWorld(viewportW, viewportH);
    minX = Math.min(minX, vpTL.x); minY = Math.min(minY, vpTL.y);
    maxX = Math.max(maxX, vpBR.x); maxY = Math.max(maxY, vpBR.y);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(MINIMAP_W / rangeX, MINIMAP_H / rangeY);
    return { minX, minY, maxX, maxY, scaleX: scale, scaleY: scale, scale };
  }

  function worldToMinimap(wx: number, wy: number, bounds: ReturnType<typeof getMinimapBounds>) {
    return {
      x: (wx - bounds.minX) * bounds.scale,
      y: (wy - bounds.minY) * bounds.scale,
    };
  }

  function renderMinimap() {
    const mc = minimapCanvas;
    if (!mc) return;
    const ctx = mc.getContext("2d");
    if (!ctx) return;
    const w = mc.width, h = mc.height;
    ctx.clearRect(0, 0, w, h);
    // Background
    ctx.fillStyle = "rgba(6,6,10,0.85)";
    ctx.fillRect(0, 0, w, h);
    const bounds = getMinimapBounds();
    const ox = (w - (bounds.maxX - bounds.minX) * bounds.scale) / 2;
    const oy = (h - (bounds.maxY - bounds.minY) * bounds.scale) / 2;
    const toMini = (wx: number, wy: number) => {
      const p = worldToMinimap(wx, wy, bounds);
      return { x: p.x + ox, y: p.y + oy };
    };
    // Edges
    ctx.strokeStyle = "rgba(200,150,80,0.3)";
    ctx.lineWidth = 1;
    for (const edge of edges) {
      const from = nodes.find(n => n.id === edge.fromId);
      const to = nodes.find(n => n.id === edge.toId);
      if (!from || !to) continue;
      const p1 = toMini(from.x + from.width / 2, from.y + from.height / 2);
      const p2 = toMini(to.x + to.width / 2, to.y + to.height / 2);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    // Nodes (with glow)
    for (const node of nodes) {
      const p = toMini(node.x, node.y);
      const nw = Math.max(4, node.width * bounds.scale);
      const nh = Math.max(3, node.height * bounds.scale);
      const isSelected = selectedIds.has(node.id);
      // Glow
      if (isSelected) {
        ctx.shadowColor = "#c89650";
        ctx.shadowBlur = 6;
      }
      ctx.fillStyle = isSelected ? "rgba(200,150,80,0.7)" : "rgba(255,255,255,0.25)";
      ctx.fillRect(p.x, p.y, nw, nh);
      ctx.shadowBlur = 0;
      // Border
      ctx.strokeStyle = isSelected ? "rgba(200,150,80,0.9)" : "rgba(255,255,255,0.15)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(p.x, p.y, nw, nh);
    }
    // Viewport rectangle
    const vpTL = toMini((-panX) / zoom, (-panY) / zoom);
    const vpBR = toMini((viewportW - panX) / zoom, (viewportH - panY) / zoom);
    ctx.strokeStyle = "rgba(200,150,80,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(vpTL.x, vpTL.y, vpBR.x - vpTL.x, vpBR.y - vpTL.y);
    ctx.fillStyle = "rgba(200,150,80,0.04)";
    ctx.fillRect(vpTL.x, vpTL.y, vpBR.x - vpTL.x, vpBR.y - vpTL.y);
  }

  function onMinimapClick(e: MouseEvent) {
    const mc = minimapCanvas;
    if (!mc || !nodes.length) return;
    const rect = mc.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const bounds = getMinimapBounds();
    const w = mc.width, h = mc.height;
    const ox = (w - (bounds.maxX - bounds.minX) * bounds.scale) / 2;
    const oy = (h - (bounds.maxY - bounds.minY) * bounds.scale) / 2;
    const worldX = (mx - ox) / bounds.scale + bounds.minX;
    const worldY = (my - oy) / bounds.scale + bounds.minY;
    panX = viewportW / 2 - worldX * zoom;
    panY = viewportH / 2 - worldY * zoom;
  }

  // Re-render minimap whenever nodes/edges/pan/zoom change
  $effect(() => {
    if (!showMinimap) return;
    // Touch reactive dependencies
    void nodes.length; void edges.length; void panX; void panY; void zoom;
    void selectedIds.size; void viewportW; void viewportH;
    requestAnimationFrame(renderMinimap);
  });

  const canvasClass = $derived(
    [
      "grok-canvas",
      `grok-canvas--tool-${tool}`,
      isPanning ? "grok-canvas--panning" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
</script>

<svelte:window
  onkeydown={onKeyDown}
  onkeyup={onKeyUp}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
/>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={rootEl}
  class={canvasClass}
  tabindex="0"
  role="application"
  aria-label="Grokden canvas"
  onpointerdown={onPointerDown}
  onwheel={onWheel}
  oncontextmenu={(e) => { if (!contextMenu) e.preventDefault(); closeContextMenu(); }}
>
  <div
    class="grok-canvas__world {zoomAnimating ? 'grok-canvas__world--animate' : ''}"
    style:transform={worldTransform}
  >
    <div class="grok-canvas__grid" aria-hidden="true"></div>

    <div class="grok-canvas__surface">
      <svg class="grok-canvas__edges" aria-hidden="true">
        {#each edges as edge (edge.id)}
          <path class="grok-canvas__edge" d={edgePath(edge)} />
        {/each}
        {#if connectFromId && connectPreview}
          <path class="grok-canvas__edge grok-canvas__edge--preview" d={previewEdgePath()} />
        {/if}
      </svg>

      <div class="grok-canvas__nodes">
        {#each nodes as node (node.id)}
          {#if node.type === "terminal"}
            {@const agent = liveTerminalForNode(node.id)}
            {#if agent}
              <div
                class="grok-canvas__node grok-canvas__terminal-node"
                role="group"
                aria-label={`${agent.role} terminal`}
                class:grok-canvas__node--selected={selectedIds.has(node.id)}
                class:grok-canvas__node--dragging={draggingNodeId === node.id}
                class:grok-canvas__terminal-node--error={agent.status === "error"}
                style:left="{node.x}px"
                style:top="{node.y}px"
                style:width="{node.width}px"
                style:height="{node.height}px"
                oncontextmenu={(e) => onNodeContextMenu(e, node)}
              >
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <header class="grok-canvas__terminal-head" onpointerdown={(e) => onNodePointerDown(e, node)}>
                  <span class="grok-canvas__traffic" aria-hidden="true"><i></i><i></i><i></i></span>
                  <span class="grok-canvas__terminal-glyph" aria-hidden="true">›_</span>
                  <strong>{agent.role}</strong>
                  <span class="grok-canvas__terminal-model">{grokModels.find((model) => model.id === agent.model)?.label ?? agent.model}</span>
                  {#if agent.worktreeIsolation}<span class="grok-canvas__terminal-isolated">isolated</span>{/if}
                  <span class="grok-canvas__terminal-status grok-canvas__terminal-status--{agent.status}">
                    {agent.status === "starting" ? "STARTING" : agent.status === "running" ? "LIVE" : "ERROR"}
                  </span>
                  <button type="button" title="Relaunch agent" aria-label="Relaunch agent" onclick={(event) => { event.stopPropagation(); relaunchLiveTerminal(node.id); }}>↻</button>
                  <button type="button" title="Close terminal" aria-label="Close terminal" onclick={(event) => { event.stopPropagation(); removeLiveTerminal(node.id); }}>×</button>
                </header>
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="grok-canvas__terminal-body" onpointerdown={(event) => event.stopPropagation()}>
                  <Terminal
                    {settings}
                    cwd={agent.worktreePath || agent.cwd}
                    sessionActive={true}
                    visible={true}
                    compact={true}
                    enableHelper={false}
                    restartBeforeInject={true}
                    injectToken={agent.injectToken}
                    injectCommand={terminalLaunchCommand(agent)}
                    injectPrompt={terminalPrompt(agent)}
                    onReady={() => setLiveTerminalStatus(node.id, "running")}
                    onError={(message) => setLiveTerminalStatus(node.id, "error", message)}
                  />
                </div>
                <footer class="grok-canvas__terminal-foot" title={agent.error || agent.worktreePath || agent.cwd}>
                  <span>{agent.status === "error" ? agent.error : agent.worktreePath || agent.cwd}</span>
                  <span>{agent.branch ?? `${node.width} × ${node.height}`}</span>
                </footer>
              </div>
            {/if}
          {:else}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="grok-canvas__node"
              class:grok-canvas__node--selected={selectedIds.has(node.id)}
              class:grok-canvas__node--dragging={draggingNodeId === node.id}
              style:left="{node.x}px"
              style:top="{node.y}px"
              style:width="{node.width}px"
              style:min-height="{node.height}px"
              onpointerdown={(e) => onNodePointerDown(e, node)}
              oncontextmenu={(e) => onNodeContextMenu(e, node)}
            >
              <div class="grok-canvas__node-type">
                <span class="grok-canvas__node-type-dot grok-canvas__node-type-dot--{node.type}"></span>
                {node.type}
              </div>
              <h3 class="grok-canvas__node-title">{node.title}</h3>
              <p class="grok-canvas__node-sub">{node.subtitle}</p>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </div>

  <!-- Marquee rendered in screen-space (outside world transform) to fix offset -->
  {#if isMarqueeing && (marqueeRect.width > 2 || marqueeRect.height > 2)}
    <div
      class="grok-canvas__marquee"
      style:left="{marqueeRect.left}px"
      style:top="{marqueeRect.top}px"
      style:width="{marqueeRect.width}px"
      style:height="{marqueeRect.height}px"
    ></div>
  {/if}

  <div class="grok-canvas__vignette" aria-hidden="true"></div>

  {#if !showAgentLauncher}
    <button
      type="button"
      class="grok-canvas__launch-button"
      onclick={() => (showAgentLauncher = true)}
    >
      <span>+</span> Launch agents
    </button>
  {/if}

  {#if showAgentLauncher}
    <section class="grok-canvas__agent-launcher" aria-label="Launch connected agents">
      <header class="grok-canvas__launcher-head">
        <div>
          <span class="grok-canvas__launcher-kicker">ORCHESTRATION</span>
          <h2>Launch connected agents</h2>
        </div>
        <button type="button" class="grok-canvas__launcher-close" aria-label="Close agent launcher" onclick={() => (showAgentLauncher = false)}>×</button>
      </header>

      <div class="grok-canvas__launcher-scroll">
        <label class="grok-canvas__field">
          <span>Working directory</span>
          <div class="grok-canvas__path-field">
            <input type="text" bind:value={workspaceDir} placeholder="Choose a folder" spellcheck="false" />
            <button type="button" onclick={browseWorkspaceDirectory}>Browse</button>
          </div>
        </label>

        <label class="grok-canvas__field">
          <span>Shared goal</span>
          <input type="text" bind:value={sharedGoal} placeholder="What should this team accomplish?" />
        </label>

        <label class="grok-canvas__field">
          <span>Starting context</span>
          <textarea rows="2" bind:value={sharedPrompt} placeholder="Context sent to every terminal"></textarea>
        </label>

        <div class="grok-canvas__roles-head">
          <div>
            <span>Agent roles</span>
            <small>Connected top to bottom as a handoff chain</small>
          </div>
          <span class="grok-canvas__role-count">{agentDrafts.length}/8</span>
        </div>

        <div class="grok-canvas__role-list">
          {#each agentDrafts as draft, index (draft.id)}
            <article class="grok-canvas__role-card">
              <div class="grok-canvas__role-index">{String(index + 1).padStart(2, "0")}</div>
              <div class="grok-canvas__role-main">
                <div class="grok-canvas__role-line">
                  <input
                    class="grok-canvas__role-name"
                    type="text"
                    value={draft.role}
                    aria-label="Agent role"
                    oninput={(event) => updateRoleDraft(draft.id, "role", event.currentTarget.value)}
                  />
                  <select
                    value={draft.model}
                    aria-label="Agent model"
                    onchange={(event) => updateRoleDraft(draft.id, "model", event.currentTarget.value)}
                  >
                    {#each grokModels as model}
                      <option value={model.id}>{model.label}</option>
                    {/each}
                  </select>
                  <button
                    type="button"
                    class="grok-canvas__role-remove"
                    aria-label="Remove role"
                    disabled={agentDrafts.length <= 1}
                    onclick={() => removeRoleDraft(draft.id)}
                  >×</button>
                </div>
                <textarea
                  rows="2"
                  value={draft.prompt}
                  aria-label="Role-specific starting prompt"
                  placeholder="Specific instructions for this role"
                  oninput={(event) => updateRoleDraft(draft.id, "prompt", event.currentTarget.value)}
                ></textarea>
                <input
                  class="grok-canvas__role-cwd"
                  type="text"
                  value={draft.cwd}
                  aria-label="Role-specific working directory"
                  placeholder="Optional directory override"
                  spellcheck="false"
                  oninput={(event) => updateRoleDraft(draft.id, "cwd", event.currentTarget.value)}
                />
                {#if index > 0}
                  <span class="grok-canvas__handoff">↳ receives context from {agentDrafts[index - 1].role || `Agent ${index}`}</span>
                {/if}
              </div>
            </article>
          {/each}
        </div>

        <div class="grok-canvas__role-adds">
          <button type="button" onclick={() => addRoleDraft()}>+ Add role</button>
          <button type="button" onclick={() => addRoleDraft("Researcher")}>Researcher</button>
          <button type="button" onclick={() => addRoleDraft("QA")}>QA</button>
        </div>

        <label class="grok-canvas__isolation">
          <span>
            <strong>Git worktree isolation</strong>
            <small>Give every agent its own branch and checkout</small>
          </span>
          <input type="checkbox" bind:checked={isolateWorktrees} />
          <i aria-hidden="true"></i>
        </label>
      </div>

      <footer class="grok-canvas__launcher-foot">
        <span class:grok-canvas__launcher-notice--error={launcherNotice.startsWith("Launch failed")}>{launcherNotice || "Ready to spawn"}</span>
        <button type="button" class="grok-canvas__launch-primary" disabled={launchingAgents} onclick={launchAgentWorkspace}>
          {launchingAgents ? "Launching…" : `Launch ${agentDrafts.length} terminal${agentDrafts.length === 1 ? "" : "s"}`}
        </button>
      </footer>
    </section>
  {/if}

  {#if isEmpty}
    <div class="grok-canvas__empty">
      <p class="grok-canvas__empty-prompt">Map agents, missions, and files on an infinite canvas</p>
      <div class="grok-canvas__empty-actions">
        <button type="button" class="grok-canvas__pill" onclick={() => addNode("agent")}>
          + Add node
        </button>
        {#each EMPTY_PRESETS as preset (preset.label)}
          <button
            type="button"
            class="grok-canvas__chip"
            onclick={() => addPresetLayout(preset.nodes)}
          >
            {preset.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="grok-canvas__toolbar" role="toolbar" aria-label="Canvas tools">
    <button
      type="button"
      class="grok-canvas__tool-btn"
      class:grok-canvas__tool-btn--active={tool === "select"}
      title="Select (V)"
      onclick={() => (tool = "select")}
    >
      Select <span class="grok-canvas__tool-kbd">V</span>
    </button>
    <button
      type="button"
      class="grok-canvas__tool-btn"
      class:grok-canvas__tool-btn--active={tool === "pan"}
      title="Pan (H)"
      onclick={() => (tool = "pan")}
    >
      Pan <span class="grok-canvas__tool-kbd">H</span>
    </button>
    <button
      type="button"
      class="grok-canvas__tool-btn"
      class:grok-canvas__tool-btn--active={tool === "connect"}
      title="Connect (C)"
      onclick={() => {
        tool = "connect";
        connectFromId = null;
      }}
    >
      Connect <span class="grok-canvas__tool-kbd">C</span>
    </button>
    <span class="grok-canvas__tool-divider" aria-hidden="true"></span>
    <button type="button" class="grok-canvas__tool-btn" title="Add node (N)" onclick={() => addNode("agent")}>
      Add node <span class="grok-canvas__tool-kbd">N</span>
    </button>
    <button type="button" class="grok-canvas__tool-btn" title="Open agent launcher" onclick={() => (showAgentLauncher = !showAgentLauncher)}>
      Agents
    </button>
    <span class="grok-canvas__tool-divider" aria-hidden="true"></span>
    <button type="button" class="grok-canvas__tool-btn" title="Fit to view" onclick={fitToView}>
      Fit
    </button>
    <button type="button" class="grok-canvas__tool-btn" title="Zoom 1:1" onclick={resetZoomOneToOne}>
      1:1
    </button>
  </div>

  <div class="grok-canvas__zoom" aria-label="Zoom controls">
    <button
      type="button"
      class="grok-canvas__zoom-btn"
      title="Zoom out"
      onclick={() => zoomBy(-ZOOM_STEP)}
    >
      −
    </button>
    <span class="grok-canvas__zoom-label">{zoomPercent}%</span>
    <button
      type="button"
      class="grok-canvas__zoom-btn"
      title="Zoom in"
      onclick={() => zoomBy(ZOOM_STEP)}
    >
      +
    </button>
  </div>

  <button
    type="button"
    class="grok-canvas__minimap-toggle"
    class:grok-canvas__minimap-toggle--on={showMinimap}
    aria-pressed={showMinimap}
    onclick={() => (showMinimap = !showMinimap)}
  >
    Minimap
  </button>

  {#if showMinimap}
    <div class="grok-canvas__minimap" aria-label="Canvas minimap">
      <canvas
        bind:this={minimapCanvas}
        width={MINIMAP_W}
        height={MINIMAP_H}
        class="grok-canvas__minimap-canvas"
        onclick={onMinimapClick}
      ></canvas>
    </div>
  {/if}

  {#if contextMenu}
    {@const ctxNode = nodes.find(n => n.id === contextMenu!.nodeId)}
    {#if ctxNode}
      <div
        class="grok-canvas__ctx-menu"
        role="menu"
        tabindex="-1"
        style:left="{contextMenu.x}px"
        style:top="{contextMenu.y}px"
        oncontextmenu={(e) => e.preventDefault()}
      >
        <div class="grok-canvas__ctx-header">
          <span class="grok-canvas__ctx-node-type">{ctxNode.type}</span>
          <button class="grok-canvas__ctx-close" onclick={closeContextMenu}>&times;</button>
        </div>
        {#if contextEditField}
          <div class="grok-canvas__ctx-edit">
            <input
              type="text"
              value={ctxNode[contextEditField]}
              oninput={(e) => contextUpdateField(contextEditField!, (e.target as HTMLInputElement).value)}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') contextEditField = null; }}
              placeholder={contextEditField === 'title' ? 'Node title...' : 'Description...'}
            />
          </div>
        {:else}
          <button class="grok-canvas__ctx-item" onclick={() => { contextEditField = 'title'; }}>
            Edit title
          </button>
          <button class="grok-canvas__ctx-item" onclick={() => { contextEditField = 'subtitle'; }}>
            Edit description
          </button>
          <div class="grok-canvas__ctx-divider"></div>
          <button class="grok-canvas__ctx-item" onclick={contextDuplicateNode}>
            Duplicate
          </button>
          <button class="grok-canvas__ctx-item" onclick={() => { setSelection([ctxNode.id]); closeContextMenu(); }}>
            Select
          </button>
          <div class="grok-canvas__ctx-divider"></div>
          <button class="grok-canvas__ctx-item grok-canvas__ctx-item--danger" onclick={contextDeleteNode}>
            Delete
          </button>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .grok-canvas__launch-button {
    position: absolute;
    top: 14px;
    left: 14px;
    z-index: 6;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 13px;
    border: 1px solid var(--grok-border);
    border-radius: var(--grok-radius-pill);
    background: color-mix(in srgb, var(--grok-surface) 90%, transparent);
    color: var(--grok-text);
    box-shadow: var(--grok-shadow-md);
    backdrop-filter: blur(18px) saturate(1.2);
    font: 600 11px/1 var(--grok-font);
    cursor: pointer;
  }
  .grok-canvas__launch-button span { color: var(--grok-accent); font-size: 16px; }
  .grok-canvas__launch-button:hover { background: var(--grok-hover); border-color: var(--grok-border-strong); }

  .grok-canvas__agent-launcher {
    position: absolute;
    top: 14px;
    left: 14px;
    bottom: 68px;
    z-index: 30;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    width: min(430px, calc(100% - 28px));
    overflow: hidden;
    border: 1px solid var(--grok-border-strong);
    border-radius: 14px;
    background: color-mix(in srgb, var(--grok-surface) 94%, transparent);
    color: var(--grok-text);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
    backdrop-filter: blur(26px) saturate(1.25);
    user-select: text;
  }
  .grok-canvas__launcher-head,
  .grok-canvas__launcher-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 13px 14px;
    border-bottom: 1px solid var(--grok-border);
    background: color-mix(in srgb, var(--grok-surface-2) 66%, transparent);
  }
  .grok-canvas__launcher-head h2 { margin: 3px 0 0; font-size: 14px; font-weight: 600; letter-spacing: -0.02em; }
  .grok-canvas__launcher-kicker { color: var(--grok-accent); font: 600 8px/1 "JetBrains Mono", monospace; letter-spacing: 0.17em; }
  .grok-canvas__launcher-close,
  .grok-canvas__role-remove { border: 0; background: transparent; color: var(--grok-muted); cursor: pointer; }
  .grok-canvas__launcher-close { width: 28px; height: 28px; border-radius: 7px; font-size: 18px; }
  .grok-canvas__launcher-close:hover,
  .grok-canvas__role-remove:hover:not(:disabled) { background: var(--grok-hover); color: var(--grok-text); }
  .grok-canvas__launcher-scroll { overflow: auto; padding: 14px; scrollbar-width: thin; scrollbar-color: var(--grok-border-strong) transparent; }
  .grok-canvas__field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .grok-canvas__field > span,
  .grok-canvas__roles-head > div > span { color: var(--grok-muted); font-size: 10px; font-weight: 600; }
  .grok-canvas__field input,
  .grok-canvas__field textarea,
  .grok-canvas__role-card input,
  .grok-canvas__role-card select,
  .grok-canvas__role-card textarea {
    box-sizing: border-box;
    width: 100%;
    border: 1px solid var(--grok-border);
    border-radius: 8px;
    background: var(--grok-surface-2);
    color: var(--grok-text);
    outline: none;
    font: 500 11px/1.35 var(--grok-font);
  }
  .grok-canvas__field input { height: 34px; padding: 0 10px; }
  .grok-canvas__field textarea,
  .grok-canvas__role-card textarea { resize: vertical; min-height: 48px; padding: 8px 10px; }
  .grok-canvas__field input:focus,
  .grok-canvas__field textarea:focus,
  .grok-canvas__role-card input:focus,
  .grok-canvas__role-card select:focus,
  .grok-canvas__role-card textarea:focus { border-color: color-mix(in srgb, var(--grok-accent) 48%, var(--grok-border)); }
  .grok-canvas__path-field { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; }
  .grok-canvas__path-field button,
  .grok-canvas__role-adds button {
    border: 1px solid var(--grok-border);
    border-radius: 8px;
    background: var(--grok-surface-2);
    color: var(--grok-muted);
    font: 600 10px/1 var(--grok-font);
    cursor: pointer;
  }
  .grok-canvas__path-field button { padding: 0 11px; }
  .grok-canvas__path-field button:hover,
  .grok-canvas__role-adds button:hover { color: var(--grok-text); background: var(--grok-hover); }
  .grok-canvas__roles-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin: 17px 0 8px; }
  .grok-canvas__roles-head > div { display: flex; flex-direction: column; gap: 3px; }
  .grok-canvas__roles-head small,
  .grok-canvas__isolation small { color: var(--grok-muted); font-size: 9px; font-weight: 400; }
  .grok-canvas__role-count { color: var(--grok-muted); font: 500 9px/1 "JetBrains Mono", monospace; }
  .grok-canvas__role-list { display: flex; flex-direction: column; gap: 7px; }
  .grok-canvas__role-card { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 8px; padding: 9px; border: 1px solid var(--grok-border); border-radius: 10px; background: color-mix(in srgb, var(--grok-surface-2) 78%, transparent); }
  .grok-canvas__role-index { padding-top: 7px; color: var(--grok-accent); font: 600 9px/1 "JetBrains Mono", monospace; }
  .grok-canvas__role-main { display: flex; min-width: 0; flex-direction: column; gap: 7px; }
  .grok-canvas__role-line { display: grid; grid-template-columns: minmax(80px, 0.85fr) minmax(130px, 1.15fr) 22px; gap: 6px; }
  .grok-canvas__role-card input,
  .grok-canvas__role-card select { height: 30px; padding: 0 8px; }
  .grok-canvas__role-card select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--grok-muted) 50%), linear-gradient(135deg, var(--grok-muted) 50%, transparent 50%); background-position: calc(100% - 12px) 12px, calc(100% - 8px) 12px; background-size: 4px 4px, 4px 4px; background-repeat: no-repeat; }
  .grok-canvas__role-remove { width: 22px; height: 30px; border-radius: 6px; font-size: 15px; }
  .grok-canvas__role-remove:disabled { opacity: 0.25; cursor: default; }
  .grok-canvas__handoff { color: color-mix(in srgb, var(--grok-accent) 64%, var(--grok-muted)); font: 500 8px/1.2 "JetBrains Mono", monospace; }
  .grok-canvas__role-adds { display: flex; gap: 6px; margin-top: 8px; }
  .grok-canvas__role-adds button { height: 29px; padding: 0 10px; }
  .grok-canvas__isolation { position: relative; display: flex; align-items: center; gap: 12px; margin-top: 14px; padding: 11px 12px; border: 1px solid var(--grok-border); border-radius: 10px; background: var(--grok-surface-2); cursor: pointer; }
  .grok-canvas__isolation > span { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
  .grok-canvas__isolation strong { font-size: 10px; font-weight: 600; }
  .grok-canvas__isolation input { position: absolute; opacity: 0; pointer-events: none; }
  .grok-canvas__isolation i { position: relative; width: 30px; height: 17px; border: 1px solid var(--grok-border-strong); border-radius: 99px; background: var(--grok-bg); }
  .grok-canvas__isolation i::after { content: ""; position: absolute; top: 2px; left: 2px; width: 11px; height: 11px; border-radius: 50%; background: var(--grok-muted); transition: 140ms ease; }
  .grok-canvas__isolation input:checked + i { border-color: var(--grok-accent); background: var(--grok-accent-soft); }
  .grok-canvas__isolation input:checked + i::after { transform: translateX(13px); background: var(--grok-accent); }
  .grok-canvas__launcher-foot { border-top: 1px solid var(--grok-border); border-bottom: 0; }
  .grok-canvas__launcher-foot > span { min-width: 0; overflow: hidden; color: var(--grok-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
  .grok-canvas__launcher-notice--error { color: var(--grok-danger) !important; }
  .grok-canvas__launch-primary { height: 32px; padding: 0 13px; border: 1px solid color-mix(in srgb, var(--grok-accent) 48%, var(--grok-border)); border-radius: 8px; background: var(--grok-accent-soft); color: var(--grok-text); font: 600 10px/1 var(--grok-font); cursor: pointer; white-space: nowrap; }
  .grok-canvas__launch-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--grok-accent) 22%, transparent); }
  .grok-canvas__launch-primary:disabled { opacity: 0.55; cursor: wait; }

  .grok-canvas__terminal-node {
    box-sizing: border-box;
    display: grid;
    grid-template-rows: 36px minmax(0, 1fr) 25px;
    min-height: 0 !important;
    padding: 0 !important;
    overflow: hidden;
    border-color: color-mix(in srgb, var(--grok-accent) 44%, var(--grok-border));
    border-radius: 12px;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--grok-surface-2) 92%, transparent), color-mix(in srgb, var(--grok-editor) 97%, transparent));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.045),
      0 18px 48px rgba(0, 0, 0, 0.35),
      0 0 0 1px color-mix(in srgb, var(--grok-accent) 7%, transparent);
    cursor: default;
    backdrop-filter: blur(18px) saturate(1.12);
  }
  .grok-canvas__terminal-node:hover {
    border-color: color-mix(in srgb, var(--grok-accent) 66%, var(--grok-border-strong));
  }
  .grok-canvas__terminal-node--error { border-color: color-mix(in srgb, var(--grok-danger) 58%, var(--grok-border)); }
  .grok-canvas__terminal-head {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    padding: 0 9px 0 11px;
    border-bottom: 1px solid var(--grok-border);
    background: color-mix(in srgb, var(--grok-surface-3) 58%, transparent);
    cursor: grab;
    user-select: none;
    font: 600 10px/1 "JetBrains Mono", var(--grok-font-mono), monospace;
  }
  .grok-canvas__node--dragging .grok-canvas__terminal-head { cursor: grabbing; }
  .grok-canvas__traffic { display: inline-flex; gap: 4px; margin-right: 2px; }
  .grok-canvas__traffic i { width: 7px; height: 7px; border-radius: 50%; background: #ff605c; box-shadow: 0 0 8px color-mix(in srgb, #ff605c 28%, transparent); }
  .grok-canvas__traffic i:nth-child(2) { background: #ffbd44; box-shadow: 0 0 8px color-mix(in srgb, #ffbd44 25%, transparent); }
  .grok-canvas__traffic i:nth-child(3) { background: #00ca4e; box-shadow: 0 0 8px color-mix(in srgb, #00ca4e 25%, transparent); }
  .grok-canvas__terminal-glyph { color: var(--grok-accent); font-weight: 700; }
  .grok-canvas__terminal-head strong { min-width: 0; overflow: hidden; color: var(--grok-text-secondary); text-overflow: ellipsis; white-space: nowrap; }
  .grok-canvas__terminal-model,
  .grok-canvas__terminal-isolated {
    max-width: 118px;
    overflow: hidden;
    padding: 3px 6px;
    border: 1px solid var(--grok-border);
    border-radius: 999px;
    color: var(--grok-text-muted);
    background: color-mix(in srgb, var(--grok-surface) 74%, transparent);
    font-size: 8px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .grok-canvas__terminal-isolated { color: var(--grok-accent); }
  .grok-canvas__terminal-status { margin-left: auto; font-size: 8px; letter-spacing: 0.08em; }
  .grok-canvas__terminal-status--starting { color: var(--grok-warn); }
  .grok-canvas__terminal-status--running { color: var(--grok-success); }
  .grok-canvas__terminal-status--error { color: var(--grok-danger); }
  .grok-canvas__terminal-head button {
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--grok-text-muted);
    cursor: pointer;
    font: 500 13px/1 var(--grok-font);
  }
  .grok-canvas__terminal-head button:hover { color: var(--grok-text); background: var(--grok-hover); }
  .grok-canvas__terminal-body { display: flex; min-width: 0; min-height: 0; overflow: hidden; background: color-mix(in srgb, var(--grok-editor) 96%, transparent); }
  .grok-canvas__terminal-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    min-width: 0;
    padding: 0 11px;
    border-top: 1px solid var(--grok-border-muted);
    color: var(--grok-text-muted);
    background: color-mix(in srgb, var(--grok-surface) 72%, transparent);
    font: 500 8px/1 "JetBrains Mono", var(--grok-font-mono), monospace;
  }
  .grok-canvas__terminal-foot span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .grok-canvas__terminal-foot span:first-child { flex: 1; }

  @media (max-width: 700px) {
    .grok-canvas__agent-launcher { right: 14px; width: auto; }
    .grok-canvas__role-line { grid-template-columns: 1fr 22px; }
    .grok-canvas__role-line select { grid-column: 1; grid-row: 2; }
    .grok-canvas__role-remove { grid-column: 2; grid-row: 1 / 3; height: 100%; }
  }
</style>
