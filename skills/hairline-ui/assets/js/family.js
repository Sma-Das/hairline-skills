// Identity comes from stable keys, never the current filter or sorted position.
export const FAMILY_TONES = {
  dark: {
    coral: ["#df9477", "#f0b99f", "#b98a74"],
    silver: ["#c5cbd3", "#f1f3f5", "#939daa"],
    emerald: ["#44c79b", "#82d8b9", "#32aa86"],
    sky: ["#64b4f4", "#a3d2f7", "#639aca"],
    violet: ["#af9deb", "#d0bff6", "#9987cc"],
    neutral: ["#aaa39d", "#c3bdb7", "#928c86"],
  },
  light: {
    coral: ["#ae5235", "#a95b3d", "#91452e"],
    silver: ["#586878", "#303840", "#697788"],
    emerald: ["#087953", "#278465", "#006847"],
    sky: ["#166cb1", "#3b739e", "#135c97"],
    violet: ["#7050ad", "#796195", "#5e428f"],
    neutral: ["#625d57", "#736a62", "#514b45"],
  },
};

export function familyColor(key, family, { theme = "dark", tone, tones = FAMILY_TONES } = {}) {
  const palette = tones[theme === "light" ? "light" : "dark"];
  const list = Object.hasOwn(palette, family) ? palette[family] : palette.neutral;
  if (!Array.isArray(list) || !list.length) throw new TypeError("A family needs at least one color and a neutral fallback.");
  let hash = 2166136261;
  for (const char of String(key)) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  const index = Number.isInteger(tone) ? ((tone % list.length) + list.length) % list.length : (hash >>> 0) % list.length;
  return list[index];
}
