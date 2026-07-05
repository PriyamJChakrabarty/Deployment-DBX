// Shared "Threat Scanner" design tokens for components that need raw values
// (inline styles, canvas/R3F props, etc). Mirrors the CSS custom properties
// declared in src/app/globals.css — keep both in sync.

export const COLORS = {
  background: "#0a0c10",
  surface: "#10141b",
  surface2: "#161b24",
  surfaceRaised: "#1b212c",
  border: "rgba(148, 163, 184, 0.12)",
  borderStrong: "rgba(148, 163, 184, 0.22)",

  foreground: "#eef2f6",
  foregroundMuted: "#94a3b3",
  foregroundSubtle: "#576270",

  brand: "#ff5d3a",
  brandStrong: "#ff7a52",
  brandDim: "rgba(255, 93, 58, 0.14)",
};

// The five bug-hunting categories, in product order. Hue family matches the
// app's existing taxonomy (Security=red, Performance=amber, Scalability=green,
// Ethics=cyan, Maintainability=violet) — consolidates constants that were
// previously duplicated across live-duel-client.js, group-raid-arena.js, and
// live-raid-client.js.
export const CATEGORIES = [
  { key: "Security", label: "Security", icon: "🔒", color: "#ff3b5c" },
  { key: "Performance", label: "Performance", icon: "⚡", color: "#ffb020" },
  { key: "Scalability", label: "Scalability", icon: "📈", color: "#2dd881" },
  { key: "Ethics", label: "Ethics", icon: "⚖️", color: "#22d3ee" },
  { key: "Maintainability", label: "Maintainability", icon: "🔧", color: "#b794f6" },
];

export const CATEGORY_COLORS = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.color])
);

export const RESULT_COLORS = {
  win: "#2dd881",
  loss: "#ff3b5c",
  draw: "#ffb020",
};
