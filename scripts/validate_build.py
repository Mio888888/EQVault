#!/usr/bin/env python3
"""Validate the output of build_autoeq_static.py.

Checks that the dist/ directory has the expected structure and that
all generated files are valid.

Usage:
    python3 scripts/validate_build.py [--dist ./dist]

Exit code 0 if all checks pass, 1 otherwise.
"""

import argparse
import json
import sys
from pathlib import Path


def ok(msg: str) -> None:
    print(f"  [PASS] {msg}")


def fail(msg: str) -> None:
    print(f"  [FAIL] {msg}", file=sys.stderr)


def check_dir(path: Path, name: str) -> bool:
    """Check that a directory exists."""
    if path.is_dir():
        ok(f"{name}/ exists")
        return True
    fail(f"{name}/ does not exist")
    return False


def check_file(path: Path, name: str) -> bool:
    """Check that a file exists."""
    if path.is_file():
        ok(f"{name} exists")
        return True
    fail(f"{name} does not exist")
    return False


def check_json(path: Path, name: str) -> bool:
    """Check that a file is valid JSON."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        ok(f"{name} is valid JSON")
        return True
    except (json.JSONDecodeError, OSError) as e:
        fail(f"{name} is not valid JSON: {e}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate AutoEq build output.")
    parser.add_argument(
        "--dist",
        default="./dist",
        help="Path to the dist/ directory (default: ./dist)",
    )
    args = parser.parse_args()

    dist = Path(args.dist).resolve()
    data_dir = dist / "data"
    errors = 0

    print(f"Validating build output in {dist} ...\n")

    # --- 1. Directory structure ---
    print("1. Directory structure")
    for subdir in ["data", "data/index", "data/profiles", "data/raw"]:
        if not check_dir(dist / subdir, subdir):
            errors += 1
    print()

    # --- 2. meta.json ---
    print("2. meta.json")
    meta_path = data_dir / "meta.json"
    if check_file(meta_path, "meta.json") and check_json(meta_path, "meta.json"):
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        for field in ["sync_time", "autoeq_commit", "total_profiles", "recommended_count"]:
            if field in meta:
                ok(f"meta.json has '{field}'")
            else:
                fail(f"meta.json missing '{field}'")
                errors += 1
        if isinstance(meta.get("total_profiles"), int) and meta["total_profiles"] > 0:
            ok(f"total_profiles is positive: {meta['total_profiles']}")
        else:
            fail(f"total_profiles is invalid: {meta.get('total_profiles')}")
            errors += 1
    else:
        errors += 1
    print()

    # --- 3. Index files ---
    print("3. Index files")
    for name in ["recommended.json", "all.json"]:
        path = data_dir / "index" / name
        if check_file(path, f"index/{name}") and check_json(path, f"index/{name}"):
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, list):
                ok(f"index/{name} is an array with {len(data)} entries")
                if len(data) > 0:
                    entry = data[0]
                    for field in ["id", "name", "source", "form", "rig"]:
                        if field in entry:
                            ok(f"  first entry has '{field}'")
                        else:
                            fail(f"  first entry missing '{field}'")
                            errors += 1
                    if name == "all.json" and "recommended" in entry:
                        ok("  first entry has 'recommended' (all.json)")
                    elif name == "all.json":
                        fail("  first entry missing 'recommended' (all.json)")
                        errors += 1
            else:
                fail(f"index/{name} is not an array")
                errors += 1
        else:
            errors += 1
    print()

    # --- 4. Profile files ---
    print("4. Profile files")
    profiles_dir = data_dir / "profiles"
    profile_files = list(profiles_dir.glob("*.json"))
    if len(profile_files) > 0:
        ok(f"Found {len(profile_files)} profile JSON files")
        # Check a sample profile
        sample_path = profile_files[0]
        sample_name = sample_path.name
        if check_json(sample_path, f"profiles/{sample_name}"):
            sample = json.loads(sample_path.read_text(encoding="utf-8"))
            for field in ["id", "name", "source", "form", "rig", "recommended", "files"]:
                if field in sample:
                    ok(f"  sample profile has '{field}'")
                else:
                    fail(f"  sample profile missing '{field}'")
                    errors += 1
            # Check EQ data
            has_eq = False
            for eq_field in ["parametric_eq", "fixed_band_eq"]:
                if eq_field in sample:
                    eq = sample[eq_field]
                    if isinstance(eq, dict) and "preamp" in eq and "filters" in eq:
                        ok(f"  sample profile has valid '{eq_field}' ({len(eq['filters'])} filters)")
                        has_eq = True
                    else:
                        fail(f"  sample profile '{eq_field}' has invalid structure")
                        errors += 1
            if "graphic_eq" in sample and isinstance(sample["graphic_eq"], str):
                ok(f"  sample profile has valid 'graphic_eq'")
                has_eq = True
            if not has_eq:
                fail("  sample profile has no EQ data")
                errors += 1
    else:
        fail("No profile JSON files found")
        errors += 1
    print()

    # --- 5. Size check ---
    print("5. Size check")
    total_size = 0
    for f in dist.rglob("*"):
        if f.is_file():
            total_size += f.stat().st_size
    size_mib = total_size / (1024 * 1024)
    if size_mib <= 900:
        ok(f"Total size: {size_mib:.1f} MiB (within 900 MiB budget)")
    else:
        fail(f"Total size: {size_mib:.1f} MiB (exceeds 900 MiB budget)")
        errors += 1
    print()

    # --- Summary ---
    if errors == 0:
        print("All checks passed!")
        return 0
    else:
        print(f"FAILED: {errors} check(s) failed.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
