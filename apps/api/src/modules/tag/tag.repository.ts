import { asc } from 'drizzle-orm'
import { db } from '@/db/client'
import { tags } from '@/db/schema'
import type { TagDTO } from '@agentblog/shared'

export const tagRepository = {
  async list(): Promise<TagDTO[]> {
    const rows = await db.select().from(tags).orderBy(asc(tags.createdAt), asc(tags.id))
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
    }))
  },
}
