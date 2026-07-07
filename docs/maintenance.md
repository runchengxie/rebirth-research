# 维护说明

## 日常开发流程

1. 修改 `src/` 源码或数据生成脚本。
2. 需要更新题库时，运行 `scripts/build_data.py`。
3. 运行本地验证命令。
4. 需要离线分享包时，运行 `scripts/package.ps1`。
5. 提交并推送到 `main`，GitHub Pages 会自动发布。

## 数据生成

默认命令：

```powershell
.\.venv\Scripts\python.exe scripts\build_data.py
```

默认年份为 2023、2024、2025。生成脚本会输出：

- 每年一个 JSON 文件。
- `data/game-data.js`，供数据校验和旧版兼容检查使用。
- `data/manifest.json`，供校验和打包脚本读取。

公开数据中的 `source` 字段只保留数据集名称、版本和价格字段，不写入本机路径。

## 验证脚本

`scripts/validate_data.py` 会检查：

- `manifest.json` 与年份 JSON 是否一致。
- 每个年份是否有 12 个月。
- 每个月是否有 4 个选项。
- 每个月是否只有 1 个正确答案。
- `perfectCapital` 是否能复算一致。
- `game-data.js` 是否与年份 JSON 内容一致。
- 公开数据里是否出现本机路径。

`scripts/validate_frontend.js` 会检查：

- `index.html` 是否是 Vite 入口。
- `package.json` 是否包含 Vite、React、TypeScript 和 PixiJS。
- `src/` 是否包含 React 应用、Pixi 舞台、玩法引擎、程序化背景音乐和数据入口。
- `assets/vn/` 下的场景背景和角色立绘是否存在。
- `assets/galgame-key-art.png` 是否存在。
- 内联脚本和 `game-data.js` 是否能通过基础语法检查。

前端质量检查包括：

- `npm run lint`：ESLint 检查 TypeScript 与 React。
- `npm run typecheck`：TypeScript 类型检查。
- `npm run test:run`：Vitest 单元测试。
- `npm run build`：Vite 生产构建。

## 音乐策略

当前背景音乐由浏览器音频接口生成，仓库不提交第三方音频文件，避免授权不清。后续如果替换为音频素材，只接受自制、CC0、公有领域或明确允许商用分发的循环音频，并在 README 中记录来源和授权。

## GitHub Pages

仓库通过 GitHub Pages 发布。`.github/workflows/pages.yml` 会在 `main` 分支构建 `dist/`，并上传 Pages 发布产物。

线上地址：

<https://runchengxie.github.io/rebirth-game/>

推送到 `main` 后，GitHub 会运行持续集成和 Pages 发布流程。持续集成成功后，再确认线上页面和 `dist/assets/` 静态资源返回 200。

## 离线分享包

运行：

```powershell
.\scripts\package.ps1
```

生成：

```text
dist/rebirth-game-share.zip
```

脚本会先运行 `npm run build`，再把 `dist/` 产物打包。解压后打开 `index.html` 即可游玩。
