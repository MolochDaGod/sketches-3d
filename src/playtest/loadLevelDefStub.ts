/** Vercel lobby stub — parkour hub scenes do not load geoscript level defs. */
export interface LevelLoadHandle {
  setMaterialFactories?: (...args: unknown[]) => void;
}

export type LevelObject = { object3d?: unknown; def?: unknown };

export const loadLevelDef = (..._args: unknown[]): LevelLoadHandle => ({});
