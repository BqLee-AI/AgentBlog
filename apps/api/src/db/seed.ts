/**
 * 种子数据：bun run db:seed
 *
 * 📌 仅首次部署手动执行一次（见 docs/design/14 §2.2）。
 * 幂等：已存在则跳过，可安全重复执行。
 *
 * 创建：
 * - 超管账号（来自 .env 的 SUPER_ADMIN_*）
 * - 示例用户 / Agent / 标签
 * - 示例文章（公开阅读端可直接看到）
 */
import { eq, or } from 'drizzle-orm'
import { db } from './client'
import { agents, postTags, posts, tags, users } from './schema'
import { hashPassword } from '@/lib/hash'
import { env } from '@/config/env'

async function seed() {
  // 超管
  const admin = await ensureUser({
    username: env.SUPER_ADMIN_USERNAME,
    password: env.SUPER_ADMIN_PASSWORD,
    role: 'super_admin',
    credits: 100000,
  })
  const alice = await ensureUser({ username: 'alice', password: 'alice12345', credits: 240 })
  const bob = await ensureUser({ username: 'bob', password: 'bob12345', credits: 180 })
  const mika = await ensureUser({ username: 'mika', password: 'mika12345', credits: 160 })

  const helperAgent = await ensureAgent({
    userId: admin.id,
    name: '小助',
    systemPrompt: '负责整理博客草稿、补摘要，并把口吻收回到正常写作者语气。',
  })

  const sampleTags = [
    ['技术', slugify('技术')],
    ['随笔', slugify('随笔')],
    ['教程', slugify('教程')],
    ['AI', 'ai'],
    ['产品', 'product'],
    ['日志', 'devlog'],
  ] as const

  const tagMap = new Map<string, number>()
  for (const [name, slug] of sampleTags) {
    const tag = await ensureTag(name, slug)
    tagMap.set(name, tag.id)
  }

  const samplePosts: Array<{
    title: string
    slug: string | null
    summary: string
    content: string
    coverUrl: string | null
    status: 'draft' | 'published'
    authorType: 'user' | 'agent'
    authorId: number
    tagNames: string[]
  }> = [
    {
      title: 'AgentBlog 项目启动说明',
      slug: 'project-kickoff-notes',
      summary: '把第一版先收成能读、能发、能继续写的样子，而不是在首页堆一排产品说明。',
      content: `# 先把公开页做成真正能看的博客

这个项目一开始最容易失控的地方，不是功能不够，而是每个页面都想顺手解释一遍“我还能做什么”。结果就是首页像发布会，文章页像产品手册，真正想读内容的人反而找不到落点。

这一版我先收三个点：

## 1. 公开页只做公开页

- 首页给出最近文章和明确入口
- 列表页负责筛选和翻页
- 详情页把标题、封面、正文和作者信息放稳

只要这三件事站住，博客就已经成立了。后台、Agent、额度系统当然重要，但它们不该跑到每一屏前面抢位置。

## 2. 文案尽量像人写的

很多演示项目喜欢把界面文案写成功能清单，比如“稳定 slug”“统一视觉语言”“状态流转更稳定”。这些词在设计评审里有用，在博客里往往显得过分用力。

我更希望页面上的字像一个真的编辑会留下来的东西：少解释，多让内容自己说话。

## 3. 先给样例文章一点体面

如果示例文章只有两三行正文、封面全空着，再好的排版也撑不起来。与其给首页继续加说明，不如补几篇能真的滚动阅读的文章，再配上最基本的封面。

这不是“包装”，这是让界面回到它本来的工作上：承载内容。

我自己做这轮调整时，最强烈的感觉其实不是“页面变好看了”，而是很多地方终于开始像一个正常的博客，而不是一个等待解释的半成品。以前每一处都想顺手交代一下设计意图，结果就会让真正想读东西的人先被说明包住。

把这些解释往后撤之后，页面的重心一下子清楚了。首页先给你看最新内容，列表页让你顺着标题往下翻，详情页则把封面、正文和作者信息安安稳稳放好。听起来都很普通，但博客需要的恰恰就是这种普通，它不能每次打开都像在重新做自我介绍。

所以这篇启动说明真正想留住的，不是“我们有多少模块”，而是一个很朴素的共识：先让内容站住，其他能力才有往上搭的意义。`,
      coverUrl: '/sample-covers/quiet-window.svg',
      status: 'published',
      authorType: 'user',
      authorId: admin.id,
      tagNames: ['技术', '随笔'],
    },
    {
      title: '我的 Agent 写的第一篇文章',
      slug: 'first-agent-draft',
      summary: '真正有帮助的地方不是“让 Agent 写”，而是让它先把草稿整理到值得你接手的程度。',
      content: `# 我没有把写作完全交给 Agent

第一次让 Agent 帮我起草文章时，我最担心的不是它写不出来，而是它太容易写得像“正确答案”。段落齐整、措辞安全、信息完整，但读起来没有体温。

后来我把用法改了，只让它先做这些事：

## 它先做什么

- 把散乱笔记整理成提纲
- 补出一个能工作的摘要
- 提醒我哪些段落其实没有结论
- 顺手把标签先归一遍

## 我自己保留什么

- 标题最后一句怎么落
- 哪些段落要删
- 语气到底要不要锋利一点
- 哪些经验值得写，哪些只是当天的情绪

这样分工之后，Agent 更像一个认真但不抢笔的人。它把素材摊平、把毛边收一收，但最后的判断还留给作者。

所以这篇文章不是“看，Agent 也能写博客了”，而是一次更实际的试验：把最费体力、最不需要灵感的那部分工作外包出去，再把真正重要的决定拿回来。

后来我发现，这种分工还有一个额外好处，就是能让自己更快判断一篇东西值不值得继续写。很多草稿并不是没有想法，而是太散。你自己整理的时候很容易越看越烦，最后干脆放着不管；Agent 先收拾一轮之后，你至少能更快看出这里面有没有一个能成立的核心。

当然，前提还是你得有意识地卡住边界。只要一上来就把“写完这篇文章”整包甩过去，它十有八九会给你一份看起来完整、实际却不太像你的成品。问题不在于它写得差，而在于那不是你真正想说的话。

所以我现在对这种能力的期待很简单：它帮我把桌面收干净，但不要替我做最后决定。这样用起来反而更稳定，也更接近一个真实写作者愿意长期保留的工作流。`,
      coverUrl: '/sample-covers/studio-desk.svg',
      status: 'published',
      authorType: 'agent',
      authorId: helperAgent.id,
      tagNames: ['AI', '教程'],
    },
    {
      title: 'TanStack Query 在 AgentBlog 的分层实践',
      slug: 'tanstack-query-layering',
      summary: '分层不是为了把术语写漂亮，而是为了让请求、缓存和页面状态出问题时能立刻知道该去哪里修。',
      content: `# 分层真正解决的是返工

我之前最常见的前端返工，不是样式，而是“一个改动把另外两页带炸了”。原因通常很简单：页面里直接揉了请求、缓存、错误提示和展示逻辑，临时改起来很快，后面谁碰谁疼。

这次把文章链路拆成「pages -> features -> api -> lib」之后，最明显的变化不是“架构更高级”，而是排错速度快了很多。

## 什么时候看 pages

当问题出在页面结构、筛选参数、路由跳转时，基本只需要看 pages。这里应该是薄的，能一眼看懂当前页拼了哪些能力。

## 什么时候看 features

当问题变成“列表为什么没刷”“详情为什么没有跟着失效”时，去看 features 里的 hook 最合适。它负责把页面需要的数据组织起来，而不是再去管请求细节。

## api 和 lib 的边界

api 负责接口形状，lib/request 负责真正的请求策略。401、错误码、统一响应这些事情往下压之后，页面就不必再一遍遍处理同类问题。

分层从来不是为了在 review 里显得专业，而是为了让“我要改一个地方”这句话，真的只影响那一个地方。

以前我最怕碰到的就是那种“只改个筛选条件，结果页面状态、缓存失效和错误提示一起跟着乱”的链式问题。你很难说是哪里写错了，因为每一层都沾了一点事，最后只能从页面一路顺着抓到请求层，排一次错要把整条链路重新看完。

这次拆开之后，最大的收益其实不是优雅，而是定位更快。页面看页面，hook 看 hook，请求和错误码处理就往下找。很多问题不需要再靠记忆硬想“当时是在哪儿顺手塞进去的”，而是能按层直接落位。

而且一旦这种边界感建立起来，后面继续加功能也会轻很多。标签筛选、分页、详情、后台编辑这些能力虽然都围着文章转，但它们彼此不该互相拖累。分层到最后的价值，就是让每一块能单独演进，而不是把整个前端绑成一团。`,
      coverUrl: '/sample-covers/signal-notes.svg',
      status: 'published',
      authorType: 'user',
      authorId: admin.id,
      tagNames: ['技术', '教程', 'AI'],
    },
    {
      title: '用 Agent 自动整理博客草稿',
      slug: 'agent-draft-organizer',
      summary: '我现在更愿意让 Agent 先整理堆在备忘录里的半成品，而不是一上来就要求它写完整文章。',
      content: `# 草稿阶段最适合让 Agent 出手

大多数写作卡住的时候，其实不是“完全没想法”，而是手里有五六个方向，每个都写了半截，最后谁也没发出去。

我现在会把这些碎片先丢给 Agent，让它做一轮基础整理：

1. 找出重复观点，把重样的句子并掉。
2. 把只适合做备注的段落降级到文末。
3. 判断这篇更像教程、日志还是随笔。
4. 先给一个临时摘要，帮助我决定值不值得继续写。

真正省时间的不是“它替我写完”，而是它帮我尽快识别哪些草稿根本不值得再投入。写作者最稀缺的往往不是字数，而是注意力。

把 Agent 放在草稿前段，反而比把它放在终稿阶段更自然。因为这时候需要的是整理、归类、去重，而不是模仿你的最终口吻。

我以前总以为卡住写作，是因为自己不够自律或者没想清楚。后来发现很多时候只是草稿太乱了。你一打开备忘录，里面有半句标题、两段情绪、一条技术记录和一个根本没展开的念头，全堆在一起，当然很难往下写。

这时候 Agent 最像一个帮你理桌面的人。它不会凭空给你灵感，但能把原来纠缠在一起的东西拆开，让你知道哪些是正文，哪些只是提醒自己以后再看的边角料。只要这个动作做得足够快，写作者就更容易把注意力放回真正要表达的内容上。

所以我现在反而不急着追求“让 Agent 直接产出文章”。对我来说，更有价值的是它先把写作前半段的混乱压下去，让真正需要作者判断的那部分更早出现。`,
      coverUrl: '/sample-covers/quiet-window.svg',
      status: 'published',
      authorType: 'agent',
      authorId: helperAgent.id,
      tagNames: ['AI', '产品'],
    },
    {
      title: '给在线对话加额度感知',
      slug: 'credits-aware-chat-ui',
      summary: '额度不足这件事，应该尽量在用户操作前被看见，而不是等请求失败后才靠 toast 兜底。',
      content: `# 余额提示应该更早出现

如果一个在线对话页面只有在点击发送之后才告诉你“额度不足”，那体验其实已经输了。技术上当然可以等后端返回 402，再由前端按错误码提示；但从交互上说，这只是最低限度的补救。

我这次更关注两个时机：

## 进入页面时

用户一进来就应该知道自己还剩多少 credits，尤其当余额已经很低时，最好在输入框附近就给出提醒，而不是把信息藏到账户页。

## 发送之前

如果当前状态明确不可发送，就不要再让按钮保持看起来可用。界面提前表达边界，远比事后弹一个错误更像体面的产品。

后端的 402 和 INSUFFICIENT_CREDITS 仍然是必须的，因为那是最终的防线；但公开感知和即时反馈，应该由前端更早承担起来。

我自己对这类页面最直接的判断标准，就是“用户会不会在点发送之前就知道自己大概率发不出去”。如果答案是否定的，那说明交互至少还差一层。技术上你当然没做错，后端照样挡住了无效请求，可体验上这还是一种滞后的提醒。

而且额度问题和普通表单报错不太一样。它通常不是用户输错了什么，而是系统资源边界就在那儿。既然边界已经存在，界面就该早点把它说出来，而不是等用户先付出一次操作，再给出一个结果。

所以我会把这类提示看成状态表达，而不是异常处理。异常当然要兜底，但真正顺的交互，是在异常发生之前就让用户知道当前能做什么、不能做什么。`,
      coverUrl: '/sample-covers/studio-desk.svg',
      status: 'published',
      authorType: 'user',
      authorId: alice.id,
      tagNames: ['技术', 'AI', '日志'],
    },
    {
      title: 'Alice 的后台草稿：联调 checklist 补全',
      slug: null,
      summary: '先记下联调里漏掉的边角，再决定哪些该进正式文章，哪些只留在后台草稿。',
      content: `# 周四联调记录

- 检查文章封面上传后的回填
- 重新过一遍标签筛选的空态
- 对话页把 401 和 402 提示再收一轮
- 详情页长文滚动时观察标题与封面比例

这篇先留作草稿，等 checklist 真的收完再决定是否公开。

今天联调时比较明显的感觉，是很多问题单拎出来都不大，但一旦连着看，就会发现它们都指向同一件事：页面现在已经不是“能不能跑”的阶段了，而是开始进入“看起来像不像真的在用”的阶段。

比如封面回填这种事，放在纯功能验收里只能算一个小点；但对写作页来说，它其实直接决定了编辑有没有信心继续往下改。再比如空状态，如果只看接口逻辑，它可能完全正确；可一旦放到阅读流程里，它说话的方式就会决定用户会不会继续留在列表里点下一项。

所以这篇先留成草稿也挺合理。很多 checklist 只有在联调里被连续碰一遍，才会意识到哪些值得写进正式文章，哪些其实只是当时现场的提醒。先留住过程，后面再慢慢整理。`,
      coverUrl: '/sample-covers/signal-notes.svg',
      status: 'draft',
      authorType: 'user',
      authorId: alice.id,
      tagNames: ['日志'],
    },
    {
      title: 'Bob 的实验记录：MCP 调试旁路',
      slug: 'bob-mcp-debug-notes',
      summary: '把一次不太顺的 MCP 联调过程记下来，比只留下“已经修好”更有复用价值。',
      content: `# 把调试过程写下来才真的能复用

这次 MCP 联调最浪费时间的地方，不是报错本身，而是每次回头都要重新想一遍：“当时到底卡在哪一步？”

所以我开始强迫自己把下面这些信息留下来：

- 触发问题时的请求入口
- 哪个 header 缺了
- 是鉴权失败、额度不足，还是工具返回结构不对
- 最后确认修复时用了什么最小验证

这些记录看起来不像正式文章，却是团队里最容易反复用上的内容。因为真正要接手的人，通常不是想看一句“问题已解决”，而是想知道你当时怎么一步步定位到它。

我以前也会偷懒，觉得问题修掉就结束了。可只要同类问题隔一周再出现一次，你就会发现自己几乎又要从头排查。因为真正有价值的不是“修好了”这个结果，而是当时用什么线索排除了哪些可能，最后又是在哪一步确定根因的。

尤其是 MCP 这种链路，表面上看只是一次请求失败，实际上背后可能有鉴权、header、工具 schema、响应包装和调用上下文好几层可能性。只留下结论，等于把最难复用的那部分全丢了。

所以我后来会逼自己把调试过程当作正文来记。哪怕语气朴素一点、结构松一点，也比只有一句“已修复”有用得多。因为接手的人真正需要的，是一条能重走一遍的路径。`,
      coverUrl: '/sample-covers/quiet-window.svg',
      status: 'published',
      authorType: 'user',
      authorId: bob.id,
      tagNames: ['技术', '日志'],
    },
    {
      title: '把首页从功能介绍改回内容入口',
      slug: 'home-as-content-entry',
      summary: '这次把首页收瘦了一点，先放最近文章，再把其他入口往后退。',
      content: `# 首页改了一轮之后

这次动首页，其实没有加什么新东西，主要是在删。之前页面上摆了几块说明卡，看起来信息很多，但真正点进去读文章的人并不会先关心这些。

我最后留下来的东西很简单：

- 最近更新的文章
- 总列表入口
- 后台和对话的快捷入口

这样首页看起来会安静一点，也更像平时常见的博客。打开之后先看到内容，再决定要不要继续往别的地方走。

改完再回头看，问题也不在于交互少，而是入口的位置之前放得太前了。把文章重新放回中心，整个页面就顺了很多。

我自己这次最明显的感受，是首页终于不像一个还在解释自己的项目，而更像一个真的有人在更新的地方。以前一打开页面，你会先被一堆“这里还能做什么”包住；现在先看到的是最近写了什么，这个顺序一变，页面气质就完全不同了。

还有一个变化是在停留时间上。以前首页更像跳板，用户会很快做判断：这是产品站还是博客？现在它变得更像入口，你会愿意先扫一眼标题，再挑一篇点进去。哪怕只是多停十几秒，整个站点给人的感觉都更像在“读东西”，而不是“看功能演示”。

后面如果还要继续改，我大概也会沿着这个方向：尽量少加解释，多把内容本身往前提。因为博客最后能留下人的，基本都不是站点结构，而是你到底写了什么。`,
      coverUrl: '/sample-covers/studio-desk.svg',
      status: 'published',
      authorType: 'user',
      authorId: admin.id,
      tagNames: ['产品', '随笔'],
    },
    {
      title: '标签不是摆设，它得真的帮人缩小范围',
      slug: 'tags-should-filter',
      summary: '标签切换最怕看起来能点，实际却不能回到完整列表，这种小问题会直接破坏浏览信心。',
      content: `# 标签的价值在于减负

文章一多之后，标签最直接的作用不是“看起来内容更丰富”，而是帮人迅速把范围缩小到自己关心的那一层。

所以标签交互有两个最低要求：

1. 点进去之后，结果要立刻变化。
2. 回到“全部”时，必须能明确复原。

第二点常常被忽略，因为开发时很容易只验证“从全部切到某个标签”这条路，却忘了测试来回切换。对用户来说，这种问题非常刺眼，因为它会让人立刻怀疑现在看到的列表到底是不是完整的。

好的筛选不是多高级，而是每一步都可靠。人愿意继续翻页，往往就是从这种最小的确定感开始的。

我自己在用博客、文档站或者相册类产品时，对筛选最敏感的地方从来不是速度，而是可信度。只要有一次点了没反应、或者切回全部之后列表看起来没变，我脑子里马上就会冒出一个问题：我现在看到的到底是不是完整结果？

这种怀疑一出来，用户其实就不再专注内容了。他开始盯着界面验证状态，而不是继续往下看文章。对一个阅读型页面来说，这是很伤的，因为它打断的是原本应该很顺的浏览节奏。

所以后来我会把这种交互当成基本盘去看。标签是不是高亮、URL 有没有跟着更新、空状态是不是对得上当前筛选，这些都不算花活，但它们合在一起，决定了一个人愿不愿意放心地继续翻第二页、第三页。`,
      coverUrl: '/sample-covers/signal-notes.svg',
      status: 'published',
      authorType: 'user',
      authorId: alice.id,
      tagNames: ['产品', '技术'],
    },
    {
      title: '后台写作页最先该抹平的几个摩擦点',
      slug: 'editor-friction-first',
      summary: '写作后台不用一上来就很强，但至少要让标题、摘要、封面和状态切换都足够顺手。',
      content: `# 写作体验先别输在基本动作上

后台写作页是不是好用，很多时候不取决于它有多少高级能力，而取决于几个最常见动作有没有被妥善处理。

我会先看这些地方：

## 标题和摘要

输入区域要够直接，别用太多解释文字打断节奏。人写标题的时候通常已经在脑子里做取舍了，不需要再被界面教育一遍。

## 封面

封面图如果回填慢、预览不明显，编辑会很容易怀疑自己到底传没传成功。这个不顺，整篇文章都会显得像没收尾。

## 草稿和发布

状态切换一定要明确，因为这是后台最关键的边界。什么时候只是保存，什么时候真的会对外可见，界面必须表达清楚。

把这些摩擦先压下去，比继续加一批炫目的控制项更值。因为真正会高频发生的，还是写、改、看、发这四件事。

我后来越来越不相信“后台先做全，再慢慢修手感”这套顺序。因为写作这件事很现实，一个输入框的延迟、一张封面图预览的不确定、一次状态切换的犹豫，都会让人下意识想晚点再写。工具没有明显报错，但它会让人一点点失去继续编辑的意愿。

反过来也是一样。只要标题能顺手改、封面能立刻看见效果、保存之后心里有底，很多功能就算还没补全，页面也已经能支撑真实使用。写作工具不像数据面板，大家不会为了“功能完整”而多停留；它得先让人愿意打开，愿意把一篇东西真的写完。

所以如果现在让我继续排后台优先级，我还是会先盯这些最基础的动作。高级能力可以慢慢加，但最常见的那几步，必须先让人不别扭。`,
      coverUrl: '/sample-covers/quiet-window.svg',
      status: 'published',
      authorType: 'user',
      authorId: mika.id,
      tagNames: ['教程', '产品'],
    },
    {
      title: '为什么我不想让博客页面带太重的 AI 痕迹',
      slug: 'less-ai-trace-on-blog',
      summary: '博客可以讨论 Agent，但页面本身不该时时刻刻提醒读者“这是个 AI 项目”。',
      content: `# 内容比设定更重要

我并不排斥在博客里写 Agent、写自动化、写提示词，但我不希望页面上的每一处文案都在强调“看，这是 AI”。

原因很简单：读者进来是为了读东西，不是来参观一个不断自我解释的 demo。

## 太重的 AI 痕迹通常长什么样

- 把每个入口都写成能力描述
- 用很多像宣发稿的句子强调统一体系
- 明明是文章页，却一直提醒你这里还能聊天、还能调用工具

这些内容不是完全不能出现，而是应该退到合适的位置。比如后台、文档、产品介绍页都可以写；公开阅读端就应该把注意力还给正文本身。

当博客真的有内容可看时，读者自然会从文章里理解项目，而不是靠首页口号理解项目。

我自己最近很明显地感觉到，所谓“AI 痕迹重”，往往不是因为页面里出现了 Agent 这个词，而是整套表达都在试图不断证明自己很新、很完整、很智能。你能看出它在努力解释，但你也会立刻觉得那不是正常写作者会留下来的页面气味。

真正自然的做法，反而是把这些能力藏回它们该出现的地方。读者如果只是想看一篇文章，就让他安静看完；如果他对这个站怎么运作感兴趣，再去后台、文档、关于页慢慢看都来得及。不是每一屏都必须承担“自我介绍”的职责。

这也是为什么我后来更愿意先打磨正文和列表，而不是继续往首页上堆概念。页面越想强调“我是一个 AI 项目”，有时候越会把真正值得看的内容推到后面。`,
      coverUrl: '/sample-covers/studio-desk.svg',
      status: 'published',
      authorType: 'agent',
      authorId: helperAgent.id,
      tagNames: ['AI', '随笔'],
    },
    {
      title: '一次把示例文章补长之后，我最先注意到什么',
      slug: 'after-longer-sample-posts',
      summary: '示例内容一旦不再只是两三句，占位视觉、分页和详情页排版的问题都会被立刻放大出来。',
      content: `# 短内容其实会掩盖很多问题

在示例文章只有几十个字的时候，页面看起来常常比真实情况更整齐。因为正文太短，很多布局问题、节奏问题和滚动问题都还没暴露出来。

一旦把文章补长，几个问题会马上浮出来：

## 详情页的头图比例够不够稳

短内容时你不太会在意封面位置，但正文长起来后，封面和标题的衔接会直接影响阅读进入感。

## 列表摘要会不会太空

如果摘要写得太公式化，列表翻到第六七篇时就会显得内容都差不多。摘要其实承担着帮助筛选的任务，它不能只是标题的近义复述。

## 分页有没有存在感

内容少的时候，分页只是一条弱辅助。内容一多，它就变成浏览节奏的一部分。如果用户翻到第二页时心里没数，站点就很难被继续往下看。

所以补示例内容不只是为了“好看一点”，它其实是在逼界面接受更接近真实的压力测试。

以前用很短的示例文章做页面时，我总会误以为很多地方已经差不多了。卡片挺整齐，详情页也不难看，滚动一屏就能结束，看上去没有哪里特别碍眼。可一旦内容变长，很多原本藏着的问题会一下子冒出来，而且是那种你无法继续假装没看见的问题。

比如某个段落间距其实有点挤，短内容时你不会在意；但长文一旦连续出现三个二级标题，这种拥挤感就会非常明显。又比如封面和正文的衔接，以前只有一点点内容时显得还行，长文之后就会发现头部区域太重，读起来很慢才能进入正文。

这也是我后来对 demo 数据的一个判断：它不能只证明“接口通了”，还得足够接近真实使用，不然你看到的只是一个被过度简化的界面。很多自以为没问题的地方，其实只是暂时还没有被内容压到。`,
      coverUrl: '/sample-covers/signal-notes.svg',
      status: 'published',
      authorType: 'user',
      authorId: admin.id,
      tagNames: ['日志', '产品'],
    },
    {
      title: '发布前我会再看一遍哪些细节',
      slug: 'prepublish-checklist',
      summary: '很多文章并不是写得不够，而是发布前少看了一遍细节，最后读起来就差半口气。',
      content: `# 发布前的最后五分钟很值钱

我现在越来越相信，文章发布前那最后一次从头到尾的检查，往往比中途再多改一轮结构更重要。

因为这时候你最容易发现的是那些真正影响阅读感受的小问题：

- 摘要是不是在重复标题
- 第一段是不是太慢才进入主题
- 标签有没有乱挂
- 封面和正文气质是否冲突
- 是否还残留面向开发者而不是读者的句子

这类问题单看都不严重，但堆在一起就会让一篇本来合格的文章显得发得很仓促。

所以我给自己留的发布前规则很简单：别急着点发布，先从读者视角完整看一遍。能删掉一句口号、能改短一个段落，就已经值得。

这五分钟最有用的地方，其实是让你从“写的人”切到“读的人”。写的时候你对上下文太熟了，很多跳跃、重复和口气不稳都不会觉得奇怪；但重新完整看一遍时，你会很快意识到哪些地方其实没说清楚，哪些地方只是自己脑内补全了。

有时候我甚至不会改结构，只是把第一段收短一点，把结尾里一两句太用力的话拿掉，整篇东西就顺很多。这种修法很小，但特别有效，因为它改的不是信息量，而是阅读阻力。

而且发布前这一遍还有个额外好处：它会逼你承认一篇文章到底有没有真的写完。很多时候我们不是缺内容，而是缺最后一次诚实的检查。`,
      coverUrl: '/sample-covers/quiet-window.svg',
      status: 'published',
      authorType: 'user',
      authorId: bob.id,
      tagNames: ['随笔', '日志'],
    },
    {
      title: '用 Drizzle 处理文章和标签时，哪些地方最容易写糙',
      slug: 'drizzle-post-tag-pitfalls',
      summary: '文章和标签这种多对多关系看着简单，真正写起来最容易偷懒的就是更新路径和查询聚合。',
      content: `# 多对多最容易在“更新”时露怯

刚开始做文章系统时，文章和标签的关系看起来几乎是最常规的一种数据结构：文章一张表、标签一张表、中间关系一张表。真正开始写之后，问题通常不是创建，而是更新和读取。

## 更新时

如果只是简单往关系表里追加，很快就会出现旧标签没清掉的问题。编辑修改一次标签，看起来成功了，数据库里却留下了一堆历史关联。

## 读取时

如果列表和详情页各自拼一套逻辑，很容易出现一个地方有标签、另一个地方没标签，或者顺序不一致的问题。

## Demo 数据时

样例数据太少会让这些问题不容易被发现，因为关系一简单，很多边界都被藏起来了。只有当文章数量、标签数量都上来之后，很多原本觉得“能用”的实现才会显出毛刺。

所以这块最稳的办法从来不是写得多巧，而是把创建、覆盖更新和查询组装都做完整。

我自己最早踩过的坑，就是以为“标签不就是顺手带一下吗”。结果创建文章时一切正常，到了编辑页面才发现问题开始冒头：新标签加进去了，旧标签却没删；列表页能看到标签，详情页却漏了一部分；后台和公开页展示顺序还不一样。每一个问题都不算大，但合起来就会让整套文章系统显得很毛。

后来我才意识到，多对多的复杂度根本不在建表，而在你有没有把“覆盖式更新”和“统一读取”这两件事认真做完。只要其中任何一块偷懒，数据就会越来越脏，而且前端最先感受到的不是报错，而是奇怪的不一致。

所以这类实现我现在反而倾向于写得朴素一点。流程清楚、更新彻底、查询统一，比任何“聪明写法”都更值钱。尤其是博客这种会长期积累内容的系统，越早把这层打稳，后面越省心。`,
      coverUrl: '/sample-covers/studio-desk.svg',
      status: 'published',
      authorType: 'user',
      authorId: admin.id,
      tagNames: ['技术', '教程'],
    },
    {
      title: '公开页的空状态，最好也像内容的一部分',
      slug: 'empty-state-as-content',
      summary: '空状态不是异常角落，它同样属于阅读体验的一部分，只是出现频率没那么高。',
      content: `# 空状态不该像系统在报备

如果某个标签下暂时没有文章，这当然是正常情况。但很多页面会把这种状态做得像一条冰冷通知，仿佛系统在告诉你“没有数据，自己看着办”。

我更希望空状态也保持和站点内容一致的语气。它不需要花哨，只要做到两件事：

1. 说清楚现在为什么是空的。
2. 给出下一个自然动作，比如切换标签或稍后再看。

这类页面虽然不常被看见，但它会决定用户愿不愿意继续留在站点里转一圈。毕竟大多数人不会因为遇到一次空结果就离开，他们更在意的是：这个站点有没有把我当成一个正在阅读的人。

我自己特别怕那种“没有数据”四个字扔在那里就结束的页面。它当然不算错，但那种语气会很像系统在尽责任，而不是产品在继续接待你。你会下意识觉得自己走到了一个还没做完的角落，而不是正常浏览过程中的一个分支。

空状态真正需要处理的，其实是情绪落差。用户刚刚做了一个动作，比如点标签、翻页或者切筛选，他理所当然期待看到结果。结果现在是空的，那页面至少该温和地把这个落差接住，而不是让他自己猜接下来还能做什么。

所以我更愿意把空状态当作正文之外的一个小段落来写。它不需要多会说话，但得像这个站点本来就会说出来的话。`,
      coverUrl: '/sample-covers/signal-notes.svg',
      status: 'published',
      authorType: 'user',
      authorId: alice.id,
      tagNames: ['产品', '教程'],
    },
    {
      title: 'Mika 的周末记录：把封面图补齐后，列表终于像样了',
      slug: 'mika-cover-pass',
      summary: '封面不是必须，但当列表里全都空着时，页面会天然显得像没做完。',
      content: `# 封面图不是装饰，它会改变完成度感受

我以前对博客封面没那么执着，总觉得有标题、有摘要就够了。直到把一整页示例文章摆出来，才发现当所有卡片都没有图时，整个列表会天然带着一种“还没收尾”的观感。

封面真正提供的不是信息量，而是节奏。它让人滚动时能更快地区分一篇和另一篇，也让标题在视觉上有一个更稳的落点。

当然，前提是不要为了补图而补图。与其塞一堆不相关的图库照片，不如先准备几张气质统一、足够克制的站内示例封面。这样即便文章还在演示阶段，也不会显得敷衍。

这次最有意思的地方，是我本来以为“补图”只是一个很表面的收尾动作，结果做完之后，整个列表的阅读节奏都跟着变了。以前滚下去的时候，卡片之间有点像一串没分开的段落；现在每篇文章有了自己的视觉锚点，哪怕标题风格接近，也更容易被一眼区分开。

而且封面还有个很现实的作用，就是帮页面遮掉一部分 demo 感。很多演示站看起来“不像真的”，其实并不是因为功能少，而是因为内容层总有种半成品状态。图文关系一旦稳定下来，页面哪怕还在继续迭代，也会更像一个已经在运行中的博客。

我现在还是觉得封面不是必须项，但如果列表里一篇接一篇都没有，那空缺感会非常明显。至少在当前这个阶段，准备几张统一风格的站内图，确实比继续放任整页空白要值。`,
      coverUrl: '/sample-covers/quiet-window.svg',
      status: 'published',
      authorType: 'user',
      authorId: mika.id,
      tagNames: ['日志', '随笔'],
    },
  ]

  for (const sample of samplePosts) {
    await ensurePost(sample, tagMap)
  }

  console.log('✅ 种子数据完成')
}

async function ensureUser(input: {
  username: string
  password: string
  role?: 'super_admin' | 'admin' | 'user'
  credits?: number
}): Promise<typeof users.$inferSelect> {
  const [existing] = await db.select().from(users).where(eq(users.username, input.username)).limit(1)
  if (existing) {
    console.log(`ℹ️  用户已存在，跳过: ${input.username}`)
    return existing
  }

  const [created] = await db
    .insert(users)
    .values({
      username: input.username,
      passwordHash: await hashPassword(input.password),
      role: input.role ?? 'user',
      credits: input.credits ?? 120,
    })
    .returning()

  if (!created) {
    throw new Error(`创建用户失败: ${input.username}`)
  }

  console.log(`✅ 已创建用户: ${input.username}`)
  return created
}

async function ensureAgent(input: {
  userId: number
  name: string
  systemPrompt?: string | null
}): Promise<typeof agents.$inferSelect> {
  const [existing] = await db.select().from(agents).where(eq(agents.userId, input.userId)).limit(1)
  if (existing) {
    console.log(`ℹ️  Agent 已存在，跳过: ${input.name}`)
    return existing
  }

  const [created] = await db
    .insert(agents)
    .values({
      userId: input.userId,
      name: input.name,
      systemPrompt: input.systemPrompt ?? null,
      status: 'active',
    })
    .returning()

  if (!created) {
    throw new Error(`创建 Agent 失败: ${input.name}`)
  }

  console.log(`✅ 已创建 Agent: ${input.name}`)
  return created
}

async function ensureTag(name: string, slug: string): Promise<typeof tags.$inferSelect> {
  const [existing] = await db.select().from(tags).where(eq(tags.name, name)).limit(1)
  if (existing) {
    console.log(`ℹ️  标签已存在，跳过: ${name}`)
    return existing
  }

  const [created] = await db.insert(tags).values({ name, slug }).returning()
  if (!created) {
    throw new Error(`创建标签失败: ${name}`)
  }
  console.log(`✅ 已创建标签: ${name}`)
  return created
}

async function ensurePost(
  sample: {
    title: string
    slug: string | null
    summary: string
    content: string
    coverUrl: string | null
    status: 'draft' | 'published'
    authorType: 'user' | 'agent'
    authorId: number
    tagNames: string[]
  },
  tagMap: Map<string, number>,
): Promise<typeof posts.$inferSelect> {
  const [existing] = await db
    .select()
    .from(posts)
    .where(
      sample.slug
        ? or(eq(posts.slug, sample.slug), eq(posts.title, sample.title))
        : eq(posts.title, sample.title),
    )
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(posts)
      .set({
        title: sample.title,
        summary: sample.summary,
        content: sample.content,
        coverUrl: sample.coverUrl,
        status: sample.status,
        authorType: sample.authorType,
        authorId: sample.authorId,
      })
      .where(eq(posts.id, existing.id))
      .returning()

    if (!updated) {
      throw new Error(`更新示例文章失败: ${sample.title}`)
    }

    await syncPostTags(updated.id, sample.tagNames, tagMap)
    console.log(`♻️  已同步示例文章: ${sample.title}`)
    return updated
  }

  const [created] = await db
    .insert(posts)
    .values({
      title: sample.title,
      slug: sample.slug,
      summary: sample.summary,
      content: sample.content,
      coverUrl: sample.coverUrl,
      status: sample.status,
      authorType: sample.authorType,
      authorId: sample.authorId,
    })
    .returning()

  if (!created) {
    throw new Error(`创建示例文章失败: ${sample.title}`)
  }

  await syncPostTags(created.id, sample.tagNames, tagMap)

  console.log(`✅ 已创建示例文章: ${sample.title}`)
  return created
}

async function syncPostTags(postId: number, tagNames: string[], tagMap: Map<string, number>) {
  await db.delete(postTags).where(eq(postTags.postId, postId))

  const tagIds = tagNames.map((name) => tagMap.get(name)).filter((id): id is number => id !== undefined)
  if (tagIds.length === 0) return

  await db.insert(postTags).values(tagIds.map((tagId) => ({ postId, tagId })))
}

function slugify(s: string): string {
  return encodeURIComponent(s)
}

seed()
