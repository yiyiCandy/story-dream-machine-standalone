# Story Dream Machine

一个面向低年级小朋友的看图说话与故事创作小应用。

孩子可以围绕一张故事图片，依次完成：

1. 图画寻宝
2. AI 小记者采访
3. 我的大作
4. AI 故事魔法师润色

项目支持：

- 静态故事图片资源
- 服务端 Edge TTS 优先配音
- AI 故事润色
- 浏览器语音识别与录音
- 本地运行与独立部署

## 功能特点

- 4 步故事创作流程完整可用
- 支持“再讲一个”重新开始
- 支持 AI 润色失败时优雅回退
- 支持切换服务端 TTS / 浏览器 TTS
- 内置多张故事场景图

## 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Express
- OpenAI 兼容接口接入 DeepSeek / GLM / OpenAI
- Edge 在线 TTS

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

至少建议配置下面之一：

- `DEEPSEEK_API_KEY`
- `GLM_API_KEY`

如果你希望固定模型来源，也可以设置：

```bash
AI_PROVIDER="deepseek"
```

默认情况下：

- 文本润色会按可用 Key 自动选择模型
- TTS 优先走服务端 `edge-tts`

3. 启动开发环境

```bash
npm run dev
```

默认访问地址：

- [http://localhost:3000](http://localhost:3000)

如果本地 `3000` 已被占用，可以改端口启动：

```bash
PORT=3005 npm run dev
```

## 构建

```bash
npm run build
```

## Vercel 部署

这个项目现在已经按 Vercel 结构整理好了：

- 前端静态资源由 `dist/` 输出
- 服务端接口通过 `api/` 下的原生 Vercel Serverless Functions 提供
- `/api/tts`、`/api/ai/polish`、`/api/ai/image`、`/api/health` 都可以直接走 Vercel Serverless Functions

部署时建议在 Vercel 后台至少配置以下环境变量之一：

- `DEEPSEEK_API_KEY`
- `GLM_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

可选配置：

- `AI_PROVIDER`
- `TTS_PROVIDER`
- `EDGE_TTS_VOICE`
- `GLM_TEXT_MODEL`

说明：

- 默认情况下，TTS 会优先尝试服务端 Edge TTS
- 如果 AI Key 未配置，Step 4 润色会自动进入前端 fallback
- 项目根目录已包含 `vercel.json`，一般不需要额外改构建命令

## 目录说明

- `src/StoryDreamMachine`
  核心故事机组件与业务逻辑
- `src/App.tsx`
  独立项目入口壳
- `public/story-images`
  故事静态图片资源
- `server.ts`
  本地服务端，负责 AI 与 TTS 接口
- `api`
  Vercel Serverless Functions 入口
- `microsoftEdgeTts.ts`
  本地 Express 服务使用的 Edge TTS 能力封装

## 环境变量

常用配置：

- `AI_PROVIDER`
- `DEEPSEEK_API_KEY`
- `GLM_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `TTS_PROVIDER`
- `EDGE_TTS_VOICE`
- `GLM_TEXT_MODEL`
- `PORT`

完整示例请看：

- [`.env.example`](./.env.example)

## 说明

这个仓库现在是一个独立项目，可以单独开发、单独部署、单独上传 Git。

如果你需要查看它和 `Study Buddy` 之间的同步说明，我已经单独保存在：

- [`README.study-buddy-sync.md`](./README.study-buddy-sync.md)
