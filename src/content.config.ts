import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const metricSchema = z.object({
  label: z.string(),
  from: z.number(),
  to: z.number(),
  unit: z.string().default(''),
  delta: z.string(),
  direction: z.enum(['down-is-good', 'up-is-good']),
  verifiedBy: z.string().optional(),
});

const work = defineCollection({
  loader: glob({ base: './src/content/work', pattern: '**/*.mdx' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    period: z.string(),
    stack: z.array(z.string()),
    metrics: z.array(metricSchema).default([]),
    draft: z.boolean().default(true),
    order: z.number(),
  }),
});

export const collections = { work };
