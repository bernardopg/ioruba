#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = REPO_ROOT / "docs" / "config.yaml"


def read_config() -> dict:
    with CONFIG_PATH.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def gh_api(args: list[str], payload: dict, dry_run: bool) -> None:
    command = ["gh", "api", *args]
    if dry_run:
        print("$", " ".join(command))
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return

    subprocess.run(
        command,
        input=json.dumps(payload),
        text=True,
        check=True,
    )


def sync_repository_metadata(config: dict, dry_run: bool) -> None:
    repository = config["repository"]
    owner = repository["owner"]
    name = repository["name"]

    gh_api(
        ["-X", "PATCH", f"repos/{owner}/{name}", "--input", "-"],
        {
            "description": repository["description"],
            "homepage": repository["homepage"],
        },
        dry_run,
    )

    gh_api(
        [
            "-X",
            "PUT",
            f"repos/{owner}/{name}/topics",
            "--input",
            "-",
            "-H",
            "Accept: application/vnd.github+json",
        ],
        {"names": repository["topics"]},
        dry_run,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync repository metadata from docs/config.yaml")
    parser.add_argument("--dry-run", action="store_true", help="Print API calls without executing them")
    args = parser.parse_args()
    config = read_config()
    sync_repository_metadata(config, args.dry_run)


if __name__ == "__main__":
    main()
