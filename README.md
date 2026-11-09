# 墨匣 · dsh-novel-forge

从一句想法到一本能连载的长篇网文。DeepSeek Harness 插件。

它不是一个「一键生成全书」的按钮，而是一套**写作状态管理**：设定、大纲、正文、人物状态、伏笔账本全部落成工作区里可读可改的文件，模型每写一章之前只拿到这一章真正需要的上下文。

> 状态：M1 完成。9 个 host 工具 + 左侧「小说」面板（书架 / 章节 / 关系图 / 编辑 / 导出）可用，40 项单测通过；向量检索、docx/epub 导出在后续里程碑。

## 为什么不是直接让模型写

| 问题 | 这个插件的做法 |
|---|---|
| 模型没有记忆 | 每章开写前，从设定库、状态、伏笔账本**装配**上下文（`novel_context`） |
| 写着写着矛盾 | 状态只有一份权威文件，提交时校验并更新（`novel_write_commit`） |
| 伏笔收不回 | 伏笔有编号、埋设章、计划回收章，逾期自动提醒 |
| 越写越 AI 味 | 文风锚点 + 高危词表 + 句首重复检测 + 定向重写 |
| 一键跑飞 | 单轮批量上限、细纲前置、必须修/提醒两级检查 |

## 安装

插件没有构建步骤（`src/` 就是运行时），可以直接从 Git 仓库装：

```bash
# GitHub
dsh plugin --profile <profile> add github:EastChilde/dsh-novel-forge

# Gitee
dsh plugin --profile <profile> add git+https://gitee.com/EastChilde/dsh-novel-forge.git

# 本地目录（开发时）
dsh plugin --profile desktop add /path/to/dsh-novel-forge
```

装完重启 profile，或在该 profile 的插件管理器里禁用再启用一次。

宿主依赖：`tools`、`workingDirectory`、`webServer`、`sessions`。缺任何一个插件会停在 pending，而不是写错目录。

发布到 npm 后也可以直接 `add dsh-novel-forge`（包名需先在 npm 上可用）。

### 改完代码怎么生效

host 插件的模块由 loader 缓存，改 `src/*.js` 之后需要重新挂载：

1. 插件管理器里把 `include:novel-forge` 禁用再启用（本机已验证可行）；
2. 或重启应用。

改 `src/references/*.md` 不需要重载——`novel_guide` 每次调用都现读文件。

## 目录约定

一本书一个目录，默认在工作区的 `books/` 下：

```text
books/北境无神/
├── project.json              元信息
├── 00-创意.md                想法 → 提案 → 定位
├── 01-设定/                  世界观、规则、人物-XX.md、关系网、文风锚点
├── 02-大纲/                  全书大纲、卷纲-01.md、细纲-001.md
├── 03-正文/                  第001章-标题.md
├── 04-追踪/                  state.json（权威）+ 进度/伏笔/时间线/人物/摘要（派生）
├── 05-导出/
└── .novel/                   索引缓存与旧版存档（可删）
```

规则三条：

1. 正文可改，但走提交，旧版自动存档到 `.novel/archive/`。
2. `state.json` 是唯一权威，派生物随时可重建。
3. 全部是纯文本，可以直接 git 管理。

## 工具

| 工具 | 作用 | 什么时候用 |
|---|---|---|
| `novel_guide` | 取方法论：网文规则 / 结构模板 / 钩子库 / 去 AI 味 | 规划、自检时按需取 |
| `novel_init` | 建书，落目录骨架 | 用户决定开书 |
| `novel_status` | 进度、最近章节、未回收伏笔、下一章细纲是否就绪 | 用户问「写到哪了」，或裸调用 `/novel` |
| `novel_outline_put` | 写入/替换某章细纲（校验不过不写盘） | 写正文之前 |
| `novel_context` | 装配某章写作上下文 | 写正文之前 |
| `novel_write_commit` | 提交正文：落盘 + 更新状态 + 重建派生 + 跑检查 | 写完一章 |
| `novel_check` | 对已提交章节跑机械检查 | 改稿后复查 |
| `novel_export` | 合并已提交章节为 `05-导出/<书名>-合集.md` | 投稿、备份 |
| `novel_resume` | 冷启动恢复卡：上一章结尾、人物状态、下一章要害 | 新会话 / 隔天续写 |

### 推荐顺序

```text
novel_init → novel_guide(开书) → 提案确认
→ 写设定 / 细纲 → novel_outline_put
→ novel_context → 写正文 → novel_write_commit
→ （有必须修就改）→ novel_write_commit 同章覆盖
```

## 左侧「小说」入口

刷新页面后，左侧导航（「自动化任务」「插件」那一列）会多一个 **小说** 入口。

点开后在主区域显示**书架 + 单本详情**的两栏总览：

- 左栏书架：列出工作区里所有书（章数 / 字数），点击切换；底部「+ 新建小说」
- 详情：书名、题材/平台/模式、刷新
- 统计卡：已完成章数、累计字数、时间锚、下一章细纲状态
- 左栏：章节列表（标题 + 摘要 + 字数）
- 右栏：细纲、人物、设定、伏笔、未答问题
- 点任意一行，**在面板内直接打开阅读视图**（返回 / 编辑 / 保存）
- 正文用等宽行高排版，标题自动加粗，长文件内滚动
- **编辑**：阅读视图右上「编辑」→ 文本框 → 保存（⌘S / Ctrl+S 也能存），原子写回原文件
- **书架排序**：按最近更新（目录 mtime / project.updatedAt）降序
- **重命名**：改书名（project.json 的 title），不动目录名
- **删除**：移到 `books/.trash/<slug>-<时间戳>`，可手动捞回
- **导出**：`导出 MD` / `导出 TXT`
- **搜索**：章节列表标题旁的输入框按标题/摘要过滤
- **伏笔跳转**：点伏笔跳到计划回收章；没正文就看那一章细纲
- **关系图**：统计卡右上切换「列表 / 关系图」，中心是书，三支是人物 / 地点 / 势力，虚线是关系；可拖拽平移、滚轮/按钮缩放；点节点打开对应文件

实现方式与「自动化任务」相同：`main` 面板（`key: novel`）+ `sidebar.panellist` 入口（`id: novel`）。

工具侧同样支持多本：`novel_status` / `novel_write_commit` 等都接 `book` 参数，只有一本时可省略，多本时会明确报错并要求指定。

## 接口

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/novel/api/snapshot` | 全部书 + 每本书的章节/细纲/人物/伏笔 |
| POST | `/novel/api/book` | 新建一本书的骨架（`{cwd?, title, genre?, premise?}`） |
| POST | `/novel/api/export` | 生成合集 `{cwd?, slug, format?: 'md' \| 'txt'}` |
| POST | `/novel/api/rename` | 改书名 `{cwd?, slug, title}` |
| POST | `/novel/api/delete` | 移到回收站 `{cwd?, slug}` |
| GET | `/novel/api/file?path=` | 读取书目录内某个文件的文本（越界 403、缺失 404、>2MB 413） |
| PUT | `/novel/api/file` | 写回书目录内的文件 `{cwd?, path, text}`（越界 403）；保存正文时自动重算该章字数并同步 state |

工作区解析顺序：

1. 显式 `cwd`
2. 会话 id 对应的 cwd
3. 会话列表里最近一个有 cwd 的会话
4. 本进程最近一次小说工具调用用的工作区

## 写下一章

「小说」页右上角有 **✍ 写下一章**：点一下会打开/复用当前工作区的会话，并准备好「继续写下一章」，回车即开始。

为什么不是一键直接写：面板替换的是主区域，会话输入框在面板打开时并不在场，没有一条现成的通道能从面板往会话里投递消息。目前走的是宿主公开的「开一个会话并预置指令」接口，比绕私有 API 稳。

不点按钮，直接在对话里说「写第 3 章」也是一样的。

## 质量检查

`novel_write_commit` 每次都会跑，分两级：

**必须修**：字数超出目标 ±15%、正文为空、细纲缺标题。

**提醒**：AI 味词密度（默认 >8/千字）、对话占比（15%–55%）、句首三连重复、单段 >300 字、章末钩子缺失或与细纲声明偏离、伏笔逾期。

检查是**机械规则**，不做它判断不了的事。判定不了的一致性问题，靠状态文件与人工确认。

## 配置

在 `cordis.patch.yml` 的 `config` 里覆盖：

| 键 | 默认 | 说明 |
|---|---|---|
| `booksRoot` | `books` | 书目录（相对工作区或绝对路径） |
| `workspaceRoot` | 空 | 显式工作区根；留空按会话推断 |
| `defaultTargetWords` | 2500 | 单章默认字数 |
| `wordTolerance` | 0.15 | 字数允许偏差 |
| `aiFlavorWords` | `[]` | 自定义 AI 味词表；留空用内置表 |
| `aiDensityLimit` | 8 | 每千字允许的 AI 味词数 |
| `dialogueMin` / `dialogueMax` | 0.15 / 0.55 | 对话占比区间 |

## 开发

```bash
node --test "test/*.test.js"
```

单测只覆盖 `src/core`（纯逻辑，不依赖宿主），包括建书、细纲解析校验、质量检查、上下文装配、提交协议（含覆盖存档、跳章、坏补丁）。

## 路线图

- M1：工具闭环 —— 已落（init / status / guide / outline / context / write / check / export / resume）
- M2：`/novel` 斜杠命令、卷纲批量、日更、docx/epub 导出
- M3：侧边工作台、质量报告、拆书对标、分支试写
