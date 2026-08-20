import { z } from 'zod';

export const requestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(200).optional().default(''),
  role: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().max(5000).optional().default(''),
  website: z.string().max(200).optional().default(''),
});

export type CvRequest = z.infer<typeof requestSchema>;

export function validateRequest(
  body: unknown,
): { ok: true; data: CvRequest } | { ok: false; errors: string[] } {
  const parsed = requestSchema.safeParse(body);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  };
}
