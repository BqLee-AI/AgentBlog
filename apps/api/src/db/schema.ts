/**
 * Drizzle Schema —— 7 张表（对齐需求 §6《AgentBlog 数据库设计》）
 *
 * 设计要点：
 * - casing: 'snake_case' 在 client.ts 与 drizzle.config.ts 两处都配，
 *   故此处字段名只写 camelCase，列名自动转换（avatarUrl → avatar_url）。
 * - 多态作者归属：post.authorType + authorId，不加外键，service 层保证一致性。
 * - api_key 不可逆存储：存 keyHash（SHA-256），不存明文。
 * - timestamp 用 integer + mode:'timestamp'，TS 侧为 Date 对象。
 *
 * 详见 docs/design/03。
 */
import { sqliteTable, text, integer, index, primaryKey, unique } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/** 通用时间戳：整数 unix 秒存储，TS 侧 Date */
const timestamps = {
  createdAt: integer({ mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer({ mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}

// ---------- user 用户表 ----------
export const users = sqliteTable(
  'user',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    username: text().notNull().unique(),
    passwordHash: text().notNull(),
    role: text({ enum: ['super_admin', 'admin', 'user'] })
      .notNull()
      .default('user'),
    credits: integer().notNull().default(0),
    avatarUrl: text(),
    status: text({ enum: ['active', 'disabled'] })
      .notNull()
      .default('active'),
    ...timestamps,
  },
  (t) => ({
    // 登录按 username 查（unique 已自动建索引）
    statusIdx: index('idx_user_status').on(t.status),
  }),
)

// ---------- agent Agent 表 ----------
export const agents = sqliteTable(
  'agent',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    avatarUrl: text(),
    systemPrompt: text(),
    status: text({ enum: ['active', 'disabled'] })
      .notNull()
      .default('active'),
    ...timestamps,
  },
  (t) => ({
    // 每用户 ≤1 Agent：DB UNIQUE 约束兜底（防并发双写）+ service 层查存在性双保险
    userUnique: unique('uq_agent_user').on(t.userId),
    userIdx: index('idx_agent_user').on(t.userId),
  }),
)

// ---------- api_key API 密钥表 ----------
export const apiKeys = sqliteTable(
  'api_key',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    agentId: integer()
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    // 不可逆存储：存 SHA-256 哈希（unique 自动建索引，鉴权时按 hash 查）
    keyHash: text().notNull().unique(),
    // 前缀用于展示识别（如 sk_live_abcd），不泄露完整 key
    keyPrefix: text().notNull(),
    name: text(),
    status: text({ enum: ['active', 'revoked'] })
      .notNull()
      .default('active'),
    ...timestamps,
  },
  (t) => ({
    agentIdx: index('idx_apikey_agent').on(t.agentId),
  }),
)

// ---------- post 文章表 ----------
export const posts = sqliteTable(
  'post',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    // 发布时生成，永久不可变（应用层禁止 update slug）
    slug: text().unique(),
    summary: text(),
    content: text().notNull(),
    coverUrl: text(),
    status: text({ enum: ['draft', 'published'] })
      .notNull()
      .default('draft'),
    // 多态作者：authorType 区分，authorId 指向 user 或 agent（不加外键）
    authorType: text({ enum: ['user', 'agent'] }).notNull(),
    authorId: integer().notNull(),
    ...timestamps,
  },
  (t) => ({
    // 列表按作者过滤（多态：type + id 联合）
    authorIdx: index('idx_post_author').on(t.authorType, t.authorId),
    // 列表按状态过滤（阅读页只看 published）
    statusIdx: index('idx_post_status').on(t.status),
  }),
)

// ---------- tag 标签表 ----------
export const tags = sqliteTable('tag', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  slug: text().notNull().unique(),
  ...timestamps,
})

// ---------- post_tag 文章-标签关联（多对多） ----------
export const postTags = sqliteTable(
  'post_tag',
  {
    postId: integer()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: integer()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.tagId] }),
  }),
)

// ---------- credit_log 额度流水表 ----------
export const creditLogs = sqliteTable(
  'credit_log',
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    delta: integer().notNull(), // 正数=充值，负数=消耗
    // 与 @agentblog/shared 的 CreditLogType 对齐
    type: text({ enum: ['recharge', 'mcp_call', 'agent_token'] }).notNull(),
    reason: text().notNull(),
    createdAt: integer({ mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    // 按用户取流水（外键不自动建索引）
    userIdx: index('idx_creditlog_user').on(t.userId),
  }),
)
