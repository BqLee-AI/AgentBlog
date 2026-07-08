import { z } from 'zod'

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default(''),
})

const parsed = envSchema.parse(import.meta.env)

export const env = {
  apiBaseUrl: parsed.VITE_API_BASE_URL,
}
