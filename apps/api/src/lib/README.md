# lib/ —— 纯函数工具

详见 docs/design/02 §二。不含业务逻辑，不访问数据库。

| 文件 | 职责 | 状态 |
|------|------|------|
| `response.ts` | `ok()` 统一成功响应 | ✅ 已建 |
| `errors.ts` | `HttpError` 类 + 错误码 | 待建（12） |
| `jwt.ts` | 签发/验证 JWT（用 `hono/jwt`，非 `hono/utils/jwt/jws`） | 待建（04） |
| `slug.ts` | slug 生成 | 待建（06） |
| `crypto.ts` | API Key 生成 + 不可逆存储 | 待建（07） |
| `hash.ts` | bcrypt 包装 | 待建（04） |
