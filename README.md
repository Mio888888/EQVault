# EQVault

基于 [AutoEq](https://github.com/jaakkopasanen/AutoEq) 的耳机 EQ 预设浏览与微调工具，部署在 GitHub Pages 上，无需后端服务即可搜索、预览、试听和下载 EQ 配置。

## 功能

- **搜索与筛选** -- 按型号名称搜索，按来源 / 佩戴方式 / 测量 rig 筛选；默认展示推荐预设，可切换至全部预设
- **频率响应图表** -- 按需加载 CSV 数据，使用 Recharts 绘制交互式响应曲线（原始 / 平滑 / 目标 / EQ / 均衡后）
- **在线试听** -- 解析 ParametricEQ / FixedBandEQ 为 Web Audio BiquadFilterNode 链，播放内置粉噪 / 扫频 / 测试音并实时切换 EQ 开关
- **手动微调** -- 编辑 preamp、频率、Q、增益等滤波器参数，实时试听调整效果
- **下载导出** -- 一键下载 ParametricEQ.txt、FixedBandEQ.txt、GraphicEQ.txt 或修改后的 Equalizer APO 预设

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **图表**: Recharts（对数频率轴）
- **音频**: Web Audio API（BiquadFilterNode）
- **搜索**: 浏览器端子串匹配
- **数据构建**: Python 3.8+ transformer
- **CI/CD**: GitHub Actions（定时同步 + 手动触发）
- **部署**: GitHub Pages

## 本地开发

### 前置条件

- Node.js 20+
- Python 3.8+（仅数据构建时需要）

### 安装与运行

```bash
cd web
npm install
npm run dev        # 启动开发服务器，默认 http://localhost:5173
```

### 构建前端

```bash
cd web
npm run build      # 产物输出到 web/dist/
```

## 数据构建

从 AutoEq 仓库生成静态数据文件：

```bash
python3 scripts/build_autoeq_static.py \
    --autoeq ./AutoEq-master \
    --out dist \
    --include-csv \
    --exclude-wav \
    --exclude-png
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `--autoeq <path>` | AutoEq 仓库路径 |
| `--out <path>` | 输出目录 |
| `--include-csv` | 包含 CSV 频率响应数据（图表预览所需） |
| `--exclude-wav` | 排除 WAV 卷积文件（默认排除） |
| `--exclude-png` | 排除 PNG 图表（默认排除） |

构建产物控制在 900 MiB 以内，超出时自动报错。

## 部署

项目通过 GitHub Actions 自动部署到 GitHub Pages：

- **定时同步**: 每日 UTC 2:17 自动拉取 AutoEq 上游并重新构建部署
- **手动触发**: 在 Actions 页面点击 "Run workflow" 即可
- **数据策略**: 首屏加载推荐预设索引，切换时加载全部预设；详情和 CSV 按需加载

## 项目结构

```
.
├── .github/workflows/deploy.yml   # GitHub Actions 构建与部署
├── scripts/
│   ├── build_autoeq_static.py     # 数据构建 transformer
│   └── validate_build.py          # 构建产物校验
├── web/                           # 前端 SPA
│   ├── src/
│   │   ├── components/            # UI 组件
│   │   ├── hooks/                 # 数据加载 hooks
│   │   ├── lib/                   # 工具函数（音频引擎、CSV 解析、EQ 格式化等）
│   │   └── data/                  # 开发用 mock 数据
│   ├── package.json
│   └── vite.config.ts
└── AutoEq-master/                 # AutoEq 本地仓库（数据源）
```

## 致谢

本项目基于 [jaakkopasanen/AutoEq](https://github.com/jaakkopasanen/AutoEq) 项目的预计算 EQ 预设数据构建。
