# EQVault

基于 [AutoEq](https://github.com/jaakkopasanen/AutoEq) 的耳机 EQ 预设浏览与微调工具，部署在 GitHub Pages 上，无需后端服务即可搜索、预览、试听和下载 EQ 配置。

EQVault is a headphone EQ preset browser and fine-tuning tool built on top of [AutoEq](https://github.com/jaakkopasanen/AutoEq). It is deployed on GitHub Pages and can search, preview, audition, fine-tune, and download EQ configurations without a backend service.

## 功能 / Features

- **搜索与筛选 / Search and filters** -- 按型号名称搜索，按来源 / 佩戴方式 / 测量 rig 筛选；默认展示推荐预设，可切换至全部预设。Search by model name, filter by source / wearing style / measurement rig, show recommended presets by default, and switch to all presets when needed.
- **频率响应图表 / Frequency response charts** -- 按需加载 CSV 数据，使用 Recharts 绘制交互式响应曲线（原始 / 平滑 / 目标 / EQ / 均衡后）。Load CSV data on demand and render interactive response curves with Recharts, including raw, smoothed, target, EQ, and equalized responses.
- **在线试听 / Audio audition** -- 解析 ParametricEQ / FixedBandEQ 为 Web Audio BiquadFilterNode 链，播放内置粉噪 / 扫频 / 测试音并实时切换 EQ 开关。Parse ParametricEQ / FixedBandEQ into Web Audio BiquadFilterNode chains, play built-in pink noise / sweeps / test tones, and toggle EQ in real time.
- **手动微调 / Manual fine-tuning** -- 编辑 preamp、频率、Q、增益等滤波器参数，实时试听调整效果。Edit filter parameters such as preamp, frequency, Q, and gain, then audition the changes instantly.
- **下载导出 / Download and export** -- 一键下载 ParametricEQ.txt、FixedBandEQ.txt、GraphicEQ.txt 或修改后的 Equalizer APO 预设。Download ParametricEQ.txt, FixedBandEQ.txt, GraphicEQ.txt, or the modified Equalizer APO preset with one click.

## 技术栈 / Tech Stack

- **前端 / Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **图表 / Charts**: Recharts（对数频率轴 / logarithmic frequency axis）
- **音频 / Audio**: Web Audio API（BiquadFilterNode）
- **搜索 / Search**: 浏览器端子串匹配 / browser-side substring matching
- **数据构建 / Data build**: Python 3.8+ transformer
- **CI/CD**: GitHub Actions（定时同步 + 手动触发 / scheduled sync + manual dispatch）
- **部署 / Deployment**: GitHub Pages

## 本地开发 / Local Development

### 前置条件 / Prerequisites

- Node.js 20+
- Python 3.8+（仅数据构建时需要 / only required for data builds）

### 安装与运行 / Install and Run

```bash
cd web
npm install
npm run dev        # 启动开发服务器，默认 http://localhost:5173 / start the dev server, default http://localhost:5173
```

### 构建前端 / Build the Frontend

```bash
cd web
npm run build      # 产物输出到 web/dist/ / outputs to web/dist/
```

## 数据构建 / Data Build

从 AutoEq 仓库生成静态数据文件。

Generate static data files from the AutoEq repository.

```bash
python3 scripts/build_autoeq_static.py \
    --autoeq ./AutoEq-master \
    --out dist \
    --include-csv \
    --exclude-wav \
    --exclude-png
```

### 参数说明 / Parameters

| 参数 / Parameter | 说明 / Description |
|------|------|
| `--autoeq <path>` | AutoEq 仓库路径 / Path to the AutoEq repository |
| `--out <path>` | 输出目录 / Output directory |
| `--include-csv` | 包含 CSV 频率响应数据（图表预览所需）/ Include CSV frequency response data required by chart previews |
| `--exclude-wav` | 排除 WAV 卷积文件（默认排除）/ Exclude WAV convolution files, excluded by default |
| `--exclude-png` | 排除 PNG 图表（默认排除）/ Exclude PNG charts, excluded by default |

构建产物控制在 900 MiB 以内，超出时自动报错。

The build output is capped at 900 MiB and fails automatically if it exceeds the limit.

## 部署 / Deployment

项目通过 GitHub Actions 自动部署到 GitHub Pages。

The project is automatically deployed to GitHub Pages through GitHub Actions.

- **定时同步 / Scheduled sync**: 每日 UTC 2:17 自动拉取 AutoEq 上游并重新构建部署。Pulls the AutoEq upstream and rebuilds the deployment every day at 02:17 UTC.
- **手动触发 / Manual dispatch**: 在 Actions 页面点击 "Run workflow" 即可。Click "Run workflow" on the Actions page.
- **数据策略 / Data strategy**: 首屏加载推荐预设索引，切换时加载全部预设；详情和 CSV 按需加载。The first screen loads the recommended preset index, all presets are loaded only after switching, and details plus CSV files are loaded on demand.

## 项目结构 / Project Structure

```
.
├── .github/workflows/deploy.yml   # GitHub Actions 构建与部署 / build and deployment
├── scripts/
│   ├── build_autoeq_static.py     # 数据构建 transformer / data build transformer
│   └── validate_build.py          # 构建产物校验 / build output validation
├── web/                           # 前端 SPA / frontend SPA
│   ├── src/
│   │   ├── components/            # UI 组件 / UI components
│   │   ├── hooks/                 # 数据加载 hooks / data loading hooks
│   │   ├── lib/                   # 工具函数（音频引擎、CSV 解析、EQ 格式化等）/ utilities: audio engine, CSV parsing, EQ formatting, etc.
│   │   └── data/                  # 开发用 mock 数据 / development mock data
│   ├── package.json
│   └── vite.config.ts
└── AutoEq-master/                 # AutoEq 本地仓库（数据源）/ local AutoEq repository used as the data source
```

## 鸣谢 / Acknowledgements

- 感谢 [Linux.do](https://linux.do) 社区提供交流、灵感与反馈。Thanks to the [Linux.do](https://linux.do) community for discussion, inspiration, and feedback.
- 感谢 [jaakkopasanen/AutoEq](https://github.com/jaakkopasanen/AutoEq) 提供预计算 EQ 预设数据与开放生态，本项目基于其数据构建。Thanks to [jaakkopasanen/AutoEq](https://github.com/jaakkopasanen/AutoEq) for the precomputed EQ preset data and open ecosystem that this project builds upon.
