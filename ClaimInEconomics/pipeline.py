from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
def run_step(name, script, args=None):
    print("\n" + "=" * 60)
    print(f"Running: {name}")
    print("=" * 60)
    cmd = [sys.executable, str(ROOT / script)]
    if args:
        cmd.extend(args)
    result = subprocess.run(cmd, cwd=ROOT)
    if result.returncode != 0:
        raise RuntimeError(f"Pipeline failed at: {name}")


def main():
    steps = [
        {
            "name": "prepare raw data",
            "script": "scripts/deal_with.py",
            "args": [
                "--config",
                "config.yaml",
            ],
        },
        {
            "name": "prepare stage0 input",
            "script": "scripts/stage0_1.py",
        },
        {
            "name": "run stage0",
            "script": "scripts/run_stage0.py",
            "args": [
                "--config",
                "config.yaml",
                "--execute",
            ],
        },
        {
            "name": "prepare stage1 input",
            "script": "scripts/stage0_2.py",
        },
        {
            "name": "prepare deleted stage1 input",
            "script": "scripts/deal_delete.py",
            "args": [
                "--config",
                "config.yaml",
            ],
        },
        {
            "name": "run stage1",
            "script": "scripts/run_stage1.py",
            "args": [
                "--config",
                "config.yaml",
                "--execute",
            ],
        },
        {
            "name": "post-process stage1 output",
            "script": "scripts/stage0_34.py",
        },
        {
            "name": "map results",
            "script": "scripts/map.py",
        },
    ]

    for step in steps:
        run_step(
            step["name"],
            step["script"],
            step.get("args"),
        )
    print("\nPipeline finished successfully.")


if __name__ == "__main__":
    main()