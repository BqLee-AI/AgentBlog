# AgentBlog 后端 Docker 镜像（详见 docs/design/14 §四）
#
# monorepo 结构：构建上下文为仓库根，需 COPY apps/api + packages/shared + 根 lockfile。
# Bun 直接跑源码，无需 build 步骤。
#
# 🔴 CMD 自动 migrate（幂等），不含 seed（seed 仅首次手动，14 §2.2）。
# base 镜像 pin 到与开发环境一致的 bun 1.3.11（泛 tag 如 1.3 会解析到 1.3.14，
# 其 lockfile 解析更严格，与 1.3.11 生成的 bun.lock 不兼容，触发 "lockfile had changes"）
FROM oven/bun:1.3.11 AS base
WORKDIR /app

# ── 依赖层（利用缓存：先 copy 清单文件）──
# monorepo 需根 package.json + bun.lock + 各 workspace 的 package.json
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# 装全部依赖（含 devDependencies 供 migrate/seed 脚本用；体积可接受，v1 不做多阶段）。
# 不用 --frozen-lockfile：bun lockfile 含平台相关 hash，Windows 开发机生成的 bun.lock
# 在 Linux 容器内会被判为 "had changes"。普通 install 在容器内按需解析，跨平台可用。
RUN bun install

# ── 代码层 ──
COPY packages/shared ./packages/shared
COPY apps/api/src ./apps/api/src
COPY apps/api/drizzle ./apps/api/drizzle
COPY apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY packages/shared/tsconfig.json ./packages/shared/tsconfig.json

WORKDIR /app/apps/api

# ── 数据卷：SQLite + 上传文件 ──
VOLUME ["/app/apps/api/data"]
ENV DATABASE_URL=/app/apps/api/data/app.db
ENV UPLOAD_DIR=/app/apps/api/data/uploads

EXPOSE 3000

# 🔴 启动：先 migrate（幂等）再启动。不含 seed。
# seed 仅首次部署手动：docker compose exec api bun run db:seed
CMD ["sh", "-c", "bun run db:migrate && bun run src/index.ts"]
