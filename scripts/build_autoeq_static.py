#!/usr/bin/env python3
"""Build static AutoEq data from an AutoEq checkout.

Scans results/*/*/**/*.md, parses EQ files, generates compact JSON indexes
and per-profile detail files for a static GitHub Pages site.

Usage:
    python scripts/build_autoeq_static.py \
        --autoeq ./AutoEq-master \
        --out ./dist \
        --include-csv \
        --exclude-wav \
        --exclude-png
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import time
import unicodedata
from pathlib import Path
from urllib.parse import unquote

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FORMS = {"in-ear", "over-ear", "earbud"}

SIZE_LIMIT_MIB = 900

# Regex patterns for EQ file parsing
RE_PREAMP = re.compile(r"Preamp:\s*([+-]?\d+(?:\.\d+)?)\s*dB", re.IGNORECASE)
RE_FILTER = re.compile(
    r"Filter\s+\d+:\s+ON\s+"
    r"(LSC|HSC|PK|LS|HS|LP|HP)"
    r"\s+Fc\s+([\d.]+)\s+Hz\s+"
    r"Gain\s+([+-]?\d+(?:\.\d+)?)\s+dB\s+"
    r"Q\s+([\d.]+)",
    re.IGNORECASE,
)
RE_GRAPHIC_EQ = re.compile(r"GraphicEQ:\s*(.+)", re.IGNORECASE)

# Type code mapping for JSON output
FILTER_TYPE_MAP = {
    "LSC": "LowShelf",
    "HSC": "HighShelf",
    "PK": "Peaking",
    "LS": "LowShelf",
    "HS": "HighShelf",
    "LP": "LowPass",
    "HP": "HighPass",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def slugify(text: str) -> str:
    """Convert text to a URL-safe slug."""
    text = unicodedata.normalize("NFKD", text)
    text = text.lower()
    # Replace non-alphanumeric (excluding ascii) with hyphens
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text


def stable_id(name: str, source: str, form: str, rig: str) -> str:
    """Generate a stable profile ID: slugified-name--short-hash."""
    s = slugify(name)
    raw = "|".join([source, form, rig, name])
    h = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:8]
    return f"{s}--{h}"


def parse_form_rig(segment: str) -> tuple:
    """Extract (form, rig) from a path segment like '711 in-ear'.

    Returns (form, rig) where rig may be empty string.
    """
    lower = segment.lower()
    found_form = None
    for f in FORMS:
        # Match form as a word boundary token
        pattern = re.compile(r"\b" + re.escape(f) + r"\b", re.IGNORECASE)
        if pattern.search(lower):
            found_form = f
            break

    if found_form is None:
        # Fallback: treat whole segment as rig, form unknown
        return ("unknown", segment.strip())

    # Remove the form keyword to get rig
    rig = re.sub(r"\b" + re.escape(found_form) + r"\b", "", segment, flags=re.IGNORECASE).strip()
    # Clean up extra whitespace and trailing punctuation
    rig = re.sub(r"\s+", " ", rig).strip()
    return (found_form, rig)


def parse_eq_txt(filepath: Path) -> dict | None:
    """Parse a ParametricEQ.txt or FixedBandEQ.txt file.

    Returns {"preamp": float, "filters": [{"type": str, "fc": float, "gain": float, "q": float}]}
    or None if the file cannot be parsed.
    """
    if not filepath.is_file():
        return None
    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None

    preamp = 0.0
    filters = []

    for line in text.strip().splitlines():
        line = line.strip()
        m = RE_PREAMP.search(line)
        if m:
            preamp = float(m.group(1))
            continue
        m = RE_FILTER.search(line)
        if m:
            code = m.group(1).upper()
            filters.append({
                "type": FILTER_TYPE_MAP.get(code, code),
                "fc": float(m.group(2)),
                "gain": float(m.group(3)),
                "q": float(m.group(4)),
            })

    if not filters:
        return None

    return {"preamp": preamp, "filters": filters}


def parse_graphic_eq(filepath: Path) -> str | None:
    """Parse a GraphicEQ.txt file, return the raw GraphicEQ string or None."""
    if not filepath.is_file():
        return None
    try:
        text = filepath.read_text(encoding="utf-8", errors="replace").strip()
    except OSError:
        return None
    m = RE_GRAPHIC_EQ.search(text)
    if m:
        return m.group(1).strip()
    return None


def discover_profiles(results_dir: Path):
    """Yield (profile_dir, source, form, rig, name) for each profile."""
    if not results_dir.is_dir():
        return
    # Iterate: results/<source>/<form-rig>/<name>/
    for source_dir in sorted(results_dir.iterdir()):
        if not source_dir.is_dir():
            continue
        source = source_dir.name
        # Skip special files like README.md INDEX.md at results level
        if source.startswith("."):
            continue
        for form_rig_dir in sorted(source_dir.iterdir()):
            if not form_rig_dir.is_dir():
                continue
            form_rig = form_rig_dir.name
            form, rig = parse_form_rig(form_rig)
            for name_dir in sorted(form_rig_dir.iterdir()):
                if not name_dir.is_dir():
                    continue
                name = name_dir.name
                # Check for README.md as a marker of a valid profile
                readme = name_dir / "README.md"
                if not readme.exists():
                    continue
                yield (name_dir, source, form, rig, name)


def parse_recommended(readme_path: Path) -> set:
    """Parse results/README.md and return set of (source, form_rig, name) tuples."""
    recommended = set()
    if not readme_path.is_file():
        return recommended
    try:
        text = readme_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return recommended

    # Links look like: [name](./source/form-rig%20form/name)
    # Need to URL-decode and ensure it's a 3-part path
    for m in re.finditer(r"\[.*?\]\(\./([^)]+)\)", text):
        link = unquote(m.group(1))
        parts = link.split("/")
        if len(parts) == 3:
            source = parts[0]
            form_rig = parts[1]
            name = parts[2]
            recommended.add((source, form_rig, name))
    return recommended


def get_dir_size_mib(path: Path) -> float:
    """Calculate total size of a directory in MiB."""
    total = 0
    for root, _dirs, files in os.walk(path):
        for f in files:
            fp = os.path.join(root, f)
            try:
                total += os.path.getsize(fp)
            except OSError:
                pass
    return total / (1024 * 1024)


def copy_file(src: Path, dst: Path) -> None:
    """Copy a file, creating parent directories as needed."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


# ---------------------------------------------------------------------------
# Main build logic
# ---------------------------------------------------------------------------

def build(args: argparse.Namespace) -> None:
    autoeq = Path(args.autoeq).resolve()
    out = Path(args.out).resolve()
    include_csv = args.include_csv
    exclude_wav = args.exclude_wav
    exclude_png = args.exclude_png

    results_dir = autoeq / "results"
    readme_path = results_dir / "README.md"

    if not results_dir.is_dir():
        print(f"ERROR: results directory not found: {results_dir}", file=sys.stderr)
        sys.exit(1)

    # Get AutoEq commit SHA if available
    autoeq_commit = "unknown"
    git_dir = autoeq / ".git"
    if git_dir.exists():
        import subprocess
        try:
            autoeq_commit = subprocess.run(
                ["git", "-C", str(autoeq), "rev-parse", "HEAD"],
                capture_output=True, text=True, check=True,
            ).stdout.strip()[:12]
        except Exception:
            pass

    print(f"Scanning profiles in {results_dir} ...")
    recommended_set = parse_recommended(readme_path)
    print(f"  Found {len(recommended_set)} recommended entries in README.md")

    # Prepare output directories
    data_dir = out / "data"
    profiles_dir = data_dir / "profiles"
    raw_dir = data_dir / "raw"
    index_dir = data_dir / "index"

    for d in [profiles_dir, raw_dir, index_dir]:
        d.mkdir(parents=True, exist_ok=True)

    # Build profiles
    all_profiles = []
    recommended_profiles = []
    total = 0
    errors = 0

    for profile_dir, source, form, rig, name in discover_profiles(results_dir):
        total += 1
        pid = stable_id(name, source, form, rig)

        # Determine if recommended
        form_rig_segment = profile_dir.parent.name
        is_recommended = (source, form_rig_segment, name) in recommended_set

        # Parse EQ files
        name_prefix = None
        # Find the base filename prefix (name of the headphone, matching the directory name)
        for f in profile_dir.iterdir():
            if f.name.endswith(" ParametricEQ.txt"):
                name_prefix = f.name[: -len(" ParametricEQ.txt")]
                break
        if name_prefix is None:
            # Fallback: use directory name
            name_prefix = name

        parametric_path = profile_dir / f"{name_prefix} ParametricEQ.txt"
        fixed_band_path = profile_dir / f"{name_prefix} FixedBandEQ.txt"
        graphic_eq_path = profile_dir / f"{name_prefix} GraphicEQ.txt"
        csv_path = profile_dir / f"{name_prefix}.csv"
        png_path = profile_dir / f"{name_prefix}.png"

        parametric_eq = parse_eq_txt(parametric_path)
        fixed_band_eq = parse_eq_txt(fixed_band_path)
        graphic_eq_str = parse_graphic_eq(graphic_eq_path)

        # File availability flags
        has_parametric = parametric_path.is_file()
        has_fixed_band = fixed_band_path.is_file()
        has_graphic = graphic_eq_path.is_file()
        has_csv = csv_path.is_file()
        has_png = png_path.is_file()

        # Copy raw files
        profile_raw_dir = raw_dir / pid
        raw_files = {}

        if has_parametric:
            dst = profile_raw_dir / "ParametricEQ.txt"
            copy_file(parametric_path, dst)
            raw_files["parametric_eq"] = "data/raw/{}/ParametricEQ.txt".format(pid)

        if has_fixed_band:
            dst = profile_raw_dir / "FixedBandEQ.txt"
            copy_file(fixed_band_path, dst)
            raw_files["fixed_band_eq"] = "data/raw/{}/FixedBandEQ.txt".format(pid)

        if has_graphic:
            dst = profile_raw_dir / "GraphicEQ.txt"
            copy_file(graphic_eq_path, dst)
            raw_files["graphic_eq"] = "data/raw/{}/GraphicEQ.txt".format(pid)

        if include_csv and has_csv:
            dst = profile_raw_dir / "result.csv"
            copy_file(csv_path, dst)
            raw_files["csv"] = "data/raw/{}/result.csv".format(pid)

        if not exclude_png and has_png:
            dst = profile_raw_dir / "graph.png"
            copy_file(png_path, dst)
            raw_files["png"] = "data/raw/{}/graph.png".format(pid)

        # Build profile detail JSON
        profile_data = {
            "id": pid,
            "name": name,
            "source": source,
            "form": form,
            "rig": rig,
            "recommended": is_recommended,
            "files": raw_files,
        }
        if parametric_eq is not None:
            profile_data["parametric_eq"] = parametric_eq
        if fixed_band_eq is not None:
            profile_data["fixed_band_eq"] = fixed_band_eq
        if graphic_eq_str is not None:
            profile_data["graphic_eq"] = graphic_eq_str

        # Write per-profile JSON
        profile_json_path = profiles_dir / f"{pid}.json"
        try:
            profile_json_path.write_text(
                json.dumps(profile_data, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
        except OSError as e:
            print(f"  WARN: Cannot write {profile_json_path}: {e}", file=sys.stderr)
            errors += 1
            continue

        # Index entries
        index_entry = {
            "id": pid,
            "name": name,
            "source": source,
            "form": form,
            "rig": rig,
        }

        all_entry = dict(index_entry, recommended=is_recommended)
        all_profiles.append(all_entry)

        if is_recommended:
            recommended_profiles.append(index_entry)

        if total % 2000 == 0:
            print(f"  Processed {total} profiles ...")

    # Write index files
    print(f"Writing index files ...")
    recommended_json = json.dumps(recommended_profiles, ensure_ascii=False, separators=(",", ":"))
    (index_dir / "recommended.json").write_text(recommended_json, encoding="utf-8")

    all_json = json.dumps(all_profiles, ensure_ascii=False, separators=(",", ":"))
    (index_dir / "all.json").write_text(all_json, encoding="utf-8")

    # Write meta.json
    print(f"Writing meta.json ...")
    meta = {
        "sync_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "autoeq_commit": autoeq_commit,
        "total_profiles": total,
        "recommended_count": len(recommended_profiles),
        "build_config": {
            "include_csv": include_csv,
            "exclude_wav": exclude_wav,
            "exclude_png": exclude_png,
        },
    }
    (data_dir / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Size guard
    size_mib = get_dir_size_mib(out)
    print(f"\nOutput size: {size_mib:.1f} MiB ({total} profiles, {len(recommended_profiles)} recommended)")

    if size_mib > SIZE_LIMIT_MIB:
        print(f"ERROR: Output size {size_mib:.1f} MiB exceeds limit of {SIZE_LIMIT_MIB} MiB", file=sys.stderr)
        sys.exit(1)

    if errors > 0:
        print(f"Completed with {errors} errors.")
    else:
        print(f"Build completed successfully.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Build static AutoEq data for GitHub Pages deployment.",
    )
    parser.add_argument(
        "--autoeq",
        required=True,
        help="Path to the AutoEq checkout directory.",
    )
    parser.add_argument(
        "--out",
        required=True,
        help="Output directory for generated static files.",
    )
    parser.add_argument(
        "--include-csv",
        action="store_true",
        default=False,
        help="Copy CSV result files (adds ~280 MiB).",
    )
    parser.add_argument(
        "--exclude-wav",
        action="store_true",
        default=True,
        help="Exclude WAV convolution files (default: True).",
    )
    parser.add_argument(
        "--exclude-png",
        action="store_true",
        default=True,
        help="Exclude PNG graph images (default: True).",
    )
    args = parser.parse_args()
    build(args)


if __name__ == "__main__":
    main()
