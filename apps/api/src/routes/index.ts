/**
 * 路由聚合层（详见 docs/design/02 §五）
 *
 * 随各业务模块就位后逐步接入：
 *   api.route('/auth', auth)
 *   api.route('/users', users)
 *   api.route('/posts', posts)
 *   ...
 *
 * 当前为占位，待第一个业务模块（auth）实现后导出 api 并在 app.ts 接入。
 */
export {}
