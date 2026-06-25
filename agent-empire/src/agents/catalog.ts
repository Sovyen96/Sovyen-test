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
  /**
   * Optional AI-generated portrait (PNG URL) shown in the recruit grid and the
   * config preview. Falls back to the procedural 3D thumbnail when absent or if
   * the image fails to load. These were generated with Higgsfield; to localize
   * them, download into `public/avatars/<id>.png` and point this at that path.
   */
  image?: string;
  /**
   * Optional textured GLB model (URL or /models/<id>.glb). When set, the scene
   * loads this real 3D model instead of the procedural chibi rig (with the rig
   * as a fallback if loading fails).
   */
  model?: string;
};

// Higgsfield CDN base for the generated portraits.
const HF = "https://d8j0ntlcm91z4.cloudfront.net/user_336dMRtiLiYw5EWi7ucJABZQ1pp";

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
    image: `${HF}/hf_20260625_193101_eb7508f8-3d14-47a4-9ec5-538d80fe31db.png`,
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
    image: `${HF}/hf_20260625_193111_5c664635-f16a-4368-a504-32fefde80171.png`,
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
    image: `${HF}/hf_20260625_193113_be847ce5-e2fd-4daa-9d98-b9793794bc4e.png`,
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
    image: `${HF}/hf_20260625_193116_e023e725-f0b7-4c5a-a486-9c65dbe27e24.png`,
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
    image: `${HF}/hf_20260625_193118_ac981358-c050-4db6-88d4-55d5fd0b01f1.png`,
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
    image: `${HF}/hf_20260625_193120_9e1782b7-0e45-4896-8272-74c2ea7edebf.png`,
  },
];

export function findKind(id: string): AgentKind | undefined {
  return AGENT_KINDS.find((k) => k.id === id);
}
