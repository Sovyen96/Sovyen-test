// The roster of AI agents you can "recruit" into your workspace.
// Each entry mirrors the "Recruit Agent" grid from the reference design:
// a stylized avatar, a brand color, and the CLI command it launches.

export type Silhouette = "astronaut" | "robot" | "gem" | "ninja" | "hood" | "lobster";

export type AgentKind = {
  id: string;
  name: string;
  /** Short tagline shown in the recruit modal. */
  role: string;
  /** Brand-ish accent color used for the avatar + selection ring. */
  color: string;
  /** Secondary color for shading the avatar. */
  shade: string;
  /** Default shell command that boots this agent's CLI. */
  defaultCommand: string;
  /** Emoji used as a quick avatar glyph (kept dependency-free). */
  glyph: string;
  /** Drives the procedural accessory drawn on the scene character. */
  silhouette: Silhouette;
};

export const AGENT_KINDS: AgentKind[] = [
  {
    id: "claude",
    name: "Claude",
    role: "Anthropic · Claude Code",
    color: "#d97757",
    shade: "#a7502f",
    defaultCommand: "claude",
    glyph: "🤖",
    silhouette: "robot",
  },
  {
    id: "codex",
    name: "Codex",
    role: "OpenAI · Codex CLI",
    color: "#cdd3da",
    shade: "#8b929b",
    defaultCommand: "codex",
    glyph: "🧑‍🚀",
    silhouette: "astronaut",
  },
  {
    id: "gemini",
    name: "Gemini",
    role: "Google · Gemini CLI",
    color: "#9b8cf0",
    shade: "#6b5cc4",
    defaultCommand: "gemini",
    glyph: "💎",
    silhouette: "gem",
  },
  {
    id: "qwen",
    name: "Qwen",
    role: "Alibaba · Qwen Code",
    color: "#7c6cf0",
    shade: "#52459e",
    defaultCommand: "qwen",
    glyph: "🥷",
    silhouette: "ninja",
  },
  {
    id: "cursor",
    name: "Cursor",
    role: "Cursor · Agent CLI",
    color: "#e7e7e7",
    shade: "#9aa0a6",
    defaultCommand: "cursor-agent",
    glyph: "🗡️",
    silhouette: "hood",
  },
  {
    id: "molly",
    name: "Molly",
    role: "Custom · your own CLI",
    color: "#ef4444",
    shade: "#a01f1f",
    defaultCommand: "bash",
    glyph: "🦞",
    silhouette: "lobster",
  },
];

export function findKind(id: string): AgentKind | undefined {
  return AGENT_KINDS.find((k) => k.id === id);
}
