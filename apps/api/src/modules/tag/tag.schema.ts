/**
 * tag 模块 schema re-export。
 * 标签不再独立创建（发文时自由输入，后端 findOrCreateMany 自动处理），
 * 故不再导出 createTagSchema。listPostsQuery 的 tag 字段（slug 筛选）在 shared。
 */
export {}
