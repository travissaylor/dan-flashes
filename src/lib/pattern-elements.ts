export const patternElementCategories = {
  geometric: ['stripe', 'chevron', 'zigzag', 'diamond', 'grid', 'checkerboard', 'polkadot', 'triangle', 'hexagon', 'wave', 'crosshatch', 'lattice'],
  textile: ['houndstooth', 'paisley', 'plaid', 'argyle', 'gingham', 'herringbone'],
} as const

export const patternElements = [
  ...patternElementCategories.geometric,
  ...patternElementCategories.textile,
] as const

export type PatternElement = (typeof patternElements)[number]
