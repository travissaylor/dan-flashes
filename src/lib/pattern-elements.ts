export const patternElementCategories = {
  geometric: ['stripe', 'chevron', 'zigzag', 'diamond', 'grid'],
  textile: ['houndstooth', 'paisley', 'plaid'],
} as const

export const patternElements = [
  ...patternElementCategories.geometric,
  ...patternElementCategories.textile,
] as const

export type PatternElement = (typeof patternElements)[number]
