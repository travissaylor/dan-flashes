import { z } from 'zod'
import { getComplexity } from './complexity'
import { patternElements } from './pattern-elements'

export { patternElements } from './pattern-elements'

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, 'Use a six-digit hex color')
  .transform((color) => color.toLowerCase())

export const patternLayerSchema = z
  .object({
    element: z.enum(patternElements),
    colors: z.tuple([hexColorSchema, hexColorSchema]),
    scale: z.number().finite().min(0.4).max(1.8),
    rotation: z.number().finite().min(-45).max(45),
    opacity: z.number().finite().min(0).max(1).optional(),
  })
  .strict()

export const patternDefinitionSchema = z
  .object({ layers: z.array(patternLayerSchema).min(1).max(6) })
  .strict()

export type PatternDefinition = z.infer<typeof patternDefinitionSchema>

export function validatePatternAndGetComplexity(input: unknown) {
  const pattern = patternDefinitionSchema.parse(input)
  return { pattern, complexity: getComplexity(pattern.layers) }
}
