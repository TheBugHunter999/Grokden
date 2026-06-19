<script lang="ts" module>
  export type CanvasNodeType = "agent" | "mission" | "file" | "note";
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
</script>

<script lang="ts">
  import { onMount, tick } from "svelte";
  import "../../static/grokden-canvas.css";

  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 4;
  const ZOOM_STEP = 0.12;
  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 96;
  const UNDO_LIMIT = 50;

  const NODE_PRESETS: Record<
    CanvasNodeType,
    { title: string; subtitle: string }
  > = {
    agent: { title: "Agent", subtitle: "Runs Grok tasks autonomously" },
    mission: { title: "Mission", subtitle: "Goal-oriented workflow" },
    file: { title: "File", subtitle: "Linked workspace artifact" },
    note: { title: "Note", subtitle: "Freeform context" },
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

  let undoStack = $state<CanvasSnapshot[]>([]);
  let redoStack = $state<CanvasSnapshot[]>([]);

  let nextId = $state(1);

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

  function deleteSelected() {
    if (!selectedIds.size) return;
    pushUndo();
    const removed = selectedIds;
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

  function isBackgroundTarget(target: EventTarget | null) {
    if (!(target instanceof Element) || !rootEl) return false;
    if (
      target.closest(
        ".grok-canvas__node, .grok-canvas__toolbar, .grok-canvas__zoom, .grok-canvas__minimap-toggle, .grok-canvas__empty-actions",
      )
    ) {
      return false;
    }
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

    if (shouldPan(e)) {
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
    updateViewportSize();
    resizeObserver = new ResizeObserver(() => updateViewportSize());
    if (rootEl) resizeObserver.observe(rootEl);
    void tick().then(() => rootEl?.focus({ preventScroll: true }));

    return () => resizeObserver?.disconnect();
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
          >
            <div class="grok-canvas__node-type">
              <span class="grok-canvas__node-type-dot grok-canvas__node-type-dot--{node.type}"></span>
              {node.type}
            </div>
            <h3 class="grok-canvas__node-title">{node.title}</h3>
            <p class="grok-canvas__node-sub">{node.subtitle}</p>
          </div>
        {/each}
      </div>

      {#if isMarqueeing && (marqueeRect.width > 2 || marqueeRect.height > 2)}
        <div
          class="grok-canvas__marquee"
          style:left="{marqueeRect.left}px"
          style:top="{marqueeRect.top}px"
          style:width="{marqueeRect.width}px"
          style:height="{marqueeRect.height}px"
        ></div>
      {/if}
    </div>
  </div>

  <div class="grok-canvas__vignette" aria-hidden="true"></div>

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

  <div class="grok-canvas__toolbar glass" role="toolbar" aria-label="Canvas tools">
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
    <div class="grok-canvas__minimap-stub" aria-hidden="true"></div>
  {/if}
</div>