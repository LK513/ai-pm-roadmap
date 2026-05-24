# AI-PM 转型路线图

> 1 年从消金后台 PM 转型 AI PM。

📊 **看板**:https://lk513.github.io/ai-pm-roadmap/

## 这是什么

一个零代码 PM 的个人学习看板。所有数据在 `data.json`,**Claude 是唯一写入入口**。

## 怎么用

### 1. 看进度(任何设备 / 任何时候)

直接打开 https://lk513.github.io/ai-pm-roadmap/ ,手机/iPad/电脑都能看,不用本地服务。

### 2. 写反馈(碎片化想法 → GitHub Issues)

通勤、地铁、半夜想到的灵感,**不用等回家**:
- 打开 GitHub 手机 app(iOS / Android 商店搜 GitHub)
- 进 `LK513/ai-pm-roadmap` repo → Issues → New Issue
- 选模板:`💭 反思` / `💡 灵感` / `📚 资源` / `🚧 卡壳`
- 写完提交,30 秒搞定

或者在看板上直接点"快速反馈"按钮区,会跳转预填模板。

### 3. 写数据(结构化更新 → Claude 操作)

回家打开 Claude Code,在 `D:\AI-PM` 目录下说话即可:

| 你说 | Claude 做 |
|---|---|
| "扫一下 issues" | 跑 `gh issue list` 读 open issues,整理进 `data.json`,关闭 issues |
| "更新前沿动态" | WebSearch 抓 3 条最新 AI 资讯,写 `frontier.items` |
| "标记任务 #2 完成" | 改 `data.json` 对应字段 |
| "Stage 2 进度调到 50%" | 改 `progress.phases[1].progress` |
| "按当前阶段给我布置 4 个任务" | 读 progress.currentStage,append 到 `tasks.items` |
| "加一条反思: ..." | append 到 `reflections` |

每次改完,Claude 自动 `git commit + push`。GitHub Pages 会在 1-2 分钟内重新部署。

## 数据结构

`data.json` 有 6 个顶层字段:
- `meta` — 用户名、日期范围、3 个月检查点
- `northStar` — 北极星目标
- `progress` — 4 阶段路线 + 进度
- `tasks` — 阶段任务清单(`items[]` 含 `stage` 字段;完成后写 `completedAt`)
- `frontier` — AI 前沿动态(每日更新)
- `reflections` — 近期反思(取最近 3 条展示)

## 本地预览

```bash
cd D:\AI-PM
python -m http.server 8765
# 浏览器访问 http://localhost:8765/
```

## 3 个月检查点(2026-08-23)

到这天必须诚实问自己 3 个问题:

1. 过去 90 天打开看板的频率 ≥ 每周 1 次?(< 1 次 → 这系统对你没用,砍掉)
2. Issues 总数 ≥ 30 条?(< 30 → 你没把它当主要反馈通道,砍掉)
3. data.json 真实变化的字段 ≥ 30 处?(< 30 → 数据是死的,砍掉)

3 个全 ✓ → 继续做 Q3 PRD 模板库。
有任意一个 ✗ → 迁飞书文档,本地系统直接归档。**不要因为"已经建好了"硬撑。**

## License

MIT
