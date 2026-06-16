export type AgentRunStatus =
  | "idle"
  | "thinking"
  | "tool_running"
  | "awaiting_approval"
  | "done"
  | "error";

export type StepKind =
  | "assistant_message"
  | "thought"
  | "tool_call"
  | "permission"
  | "system";

export type StepStatus = "pending" | "running" | "success" | "error";

export type ToolKind = "read" | "write" | "execute" | "search" | "unknown";

export interface AgentStep {
  id: string;
  sessionId: string;
  kind: StepKind;
  status: StepStatus;
  title: string;
  detail?: string;
  toolKind?: ToolKind;
  files?: string[];
  startedAt: number;
  endedAt?: number;
}

export interface AgentSession {
  id: string;
  label: string;
  terminalId: number | null;
  status: AgentRunStatus;
  startedAt: number;
  updatedAt: number;
  currentTitle: string | null;
  steps: AgentStep[];
}