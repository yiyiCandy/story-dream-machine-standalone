# Study Buddy Sync Notes

这份文档是给项目维护者看的，不是对外 README。

## 背景

`Story Dream Machine` 最初从 `Study Buddy` 的语文学科中抽离而来。

这个独立仓库的目标有两个：

1. 自己可以独立开发、独立运行、独立上传 Git
2. 后续核心玩法优化后，可以较顺地再合回 `Study Buddy`

## 建议同步边界

优先保持稳定、方便回合的目录：

- `src/StoryDreamMachine`

这一整块目录对应的是 `Study Buddy` 里的故事机核心实现。

独立项目壳层主要是：

- `src/App.tsx`
- `src/index.css`
- `server.ts`
- `vite.config.ts`

这些文件主要用于独立运行，不一定要原样回到 `Study Buddy`。

## 建议开发方式

- 优先改 `src/StoryDreamMachine` 里的核心文件
- 尽量不要频繁更改核心目录层级
- 独立壳层改动尽量局限在入口和样式
- 提交按主题拆开

推荐提交粒度示例：

- `Step3 UI polish`
- `Speech recognition fixes`
- `DeepSeek polish flow`
- `TTS behavior alignment`
- `Step4 fallback improvements`

## 以后合回 Study Buddy 时

优先同步：

- `src/StoryDreamMachine/StoryDreamMachine.tsx`
- `src/StoryDreamMachine/Step1TreasureHunt.tsx`
- `src/StoryDreamMachine/Step2AIReporter.tsx`
- `src/StoryDreamMachine/Step3MyMasterpiece.tsx`
- `src/StoryDreamMachine/Step4StoryMagician.tsx`
- `src/StoryDreamMachine/constants.ts`
- `src/StoryDreamMachine/lib/*`
- `src/StoryDreamMachine/services/*`
- `src/StoryDreamMachine/types.ts`

再根据需要做 `Study Buddy` 的适配层处理，比如：

- 关卡完成回调
- 学科地图入口
- 练习页包装
- 与主项目样式系统的衔接
