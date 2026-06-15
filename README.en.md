# EQVault

> 🌐 [简体中文](./README.zh.md) · English

A headphone EQ preset browser and fine-tuning tool built on top of [AutoEq](https://github.com/jaakkopasanen/AutoEq). Deployed on GitHub Pages, it lets you search, preview, audition, fine-tune, and download EQ configurations with no backend service.

![EQVault](https://img.shields.io/badge/EQ-AutoEq-E65C00) ![License](https://img.shields.io/badge/license-MIT-E65C00) ![Platform](https://img.shields.io/badge/platform-GitHub%20Pages-F7F4EB)

## ✨ Features

- **Search and filters** — Search by model name, filter by source / wearing style / measurement rig, show recommended presets by default, and switch to all presets with one click.
- **Frequency response charts** — Load CSV data on demand and render interactive logarithmic response curves with Recharts (raw / smoothed / target / EQ / equalized), with per-curve toggles.
- **Audio audition** — Parse ParametricEQ / FixedBandEQ into a Web Audio `BiquadFilterNode` chain, play built-in pink noise / white noise / frequency sweep test signals, and toggle EQ in real time for A/B comparison.
- **Custom audio audition** — Upload your own audio file (mp3 / wav / ogg / m4a, etc.) and audition through the EQ chain with your real music. The uploaded audio persists across detail-page tabs.
- **Manual fine-tuning** — Edit filter parameters such as preamp, frequency, Q, and gain, audition the changes instantly, and export the modified preset.
- **Download and export** — Download `ParametricEQ.txt`, `FixedBandEQ.txt`, `GraphicEQ.txt`, `result.csv`, or the modified Equalizer APO preset with one click.

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **UI design**: PaperFlow design language (warm cream / orange palette, Inter + JetBrains Mono fonts)
- **Charts**: Recharts (logarithmic frequency axis)
- **Audio**: Web Audio API (`BiquadFilterNode`, `AudioBufferSourceNode`)
- **Search**: Browser-side substring matching
- **Data build**: Python 3.8+ transformer
- **CI/CD**: GitHub Actions (scheduled sync + manual dispatch)
- **Deployment**: GitHub Pages

## 🚀 Local Development

### Prerequisites

- Node.js 20+
- Python 3.8+ (only required for data builds)

### Install and Run

```bash
cd web
npm install
npm run dev        # start the dev server, default http://localhost:5173
```

> ⚠️ If your shell has `NODE_ENV=production` set, `npm install` will skip devDependencies. Use `npm install --include=dev` to install the full dependency set.

### Build the Frontend

```bash
cd web
npm run build      # outputs to web/dist/
```

## 📦 Data Build

Generate static data files from the AutoEq repository.

```bash
python3 scripts/build_autoeq_static.py \
    --autoeq ./AutoEq-master \
    --out dist \
    --include-csv \
    --exclude-wav \
    --exclude-png
```

### Parameters

| Parameter | Description |
|------|------|
| `--autoeq <path>` | Path to the AutoEq repository |
| `--out <path>` | Output directory |
| `--include-csv` | Include CSV frequency response data (required by chart previews) |
| `--exclude-wav` | Exclude WAV convolution files (excluded by default) |
| `--exclude-png` | Exclude PNG charts (excluded by default) |

The build output is capped at 900 MiB and fails automatically if it exceeds the limit.

## 🌍 Deployment

The project is automatically deployed to GitHub Pages through GitHub Actions.

- **Scheduled sync**: Pulls the AutoEq upstream and rebuilds the deployment every day at 02:17 UTC.
- **Manual dispatch**: Click "Run workflow" on the Actions page.
- **Data strategy**: The first screen loads the recommended preset index, all presets are loaded only after switching, and details plus CSV files are loaded on demand.

## 📁 Project Structure

```
.
├── .github/workflows/deploy.yml   # GitHub Actions build and deployment
├── scripts/
│   ├── build_autoeq_static.py     # data build transformer
│   └── validate_build.py          # build output validation
├── web/                           # frontend SPA
│   ├── src/
│   │   ├── components/            # UI components
│   │   ├── hooks/                 # data loading hooks
│   │   ├── lib/                   # utilities (audio engine, CSV parsing, EQ formatting, etc.)
│   │   └── data/                  # development mock data
│   ├── public/data/               # build-generated static EQ data
│   ├── package.json
│   └── vite.config.ts
└── AutoEq-master/                 # local AutoEq repository (data source)
```

## 🙏 Acknowledgements

- Thanks to the [Linux.do](https://linux.do) community for discussion, inspiration, and feedback.
- Thanks to [jaakkopasanen/AutoEq](https://github.com/jaakkopasanen/AutoEq) for the precomputed EQ preset data and open ecosystem that this project builds upon.

## 📄 License

This project is open-sourced under the MIT License. EQ preset data is sourced from AutoEq under its respective licenses.
