# Story Dream Machine Standalone

从 `Study Buddy` 语文学科中抽离出来的独立版 `故事造梦机`。

目标有两个：

1. 这个项目自己可以独立开发、独立上传 Git、独立运行。
2. 后续在这里做的核心玩法优化，可以比较顺地再合回 `Study Buddy`。

## 目录约定

核心玩法集中在：

- `src/StoryDreamMachine`

这一整块目录尽量保持稳定，因为它对应的是 `Study Buddy` 里的故事机核心实现。以后如果要把优化同步回去，优先同步这块目录。

独立项目壳层主要是：

- `src/App.tsx`
- `src/index.css`
- `server.ts`
- `vite.config.ts`

这些文件是为了让故事机能单独运行，和 `Study Buddy` 的耦合已经尽量拆薄了。

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 准备环境变量

```bash
cp .env.example .env
```

然后把需要的 Key 填进去。当前支持：

- `DEEPSEEK_API_KEY`
- `GLM_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

TTS 默认优先走服务端 `edge-tts`。

3. 启动开发环境

```bash
npm run dev
```

默认地址：

- [http://localhost:3000](http://localhost:3000)

如果 `3000` 被占用，可以：

```bash
PORT=3005 npm run dev
```

## 构建

```bash
npm run build
```

## 回合到 Study Buddy 的建议

为了后续更容易合回 `Study Buddy`，建议这样开发：

- 优先改 `src/StoryDreamMachine` 里的核心文件。
- 尽量不要随意拆散文件名和目录结构。
- 独立壳层相关改动，尽量只放在 `src/App.tsx` 或 `server.ts`。
- 提交时按主题分开，比如 “Step3 UI”, “TTS”, “DeepSeek polish”, “Step4 fallback”。

这样以后把核心改动同步回 `Study Buddy` 时，范围会很清楚。
