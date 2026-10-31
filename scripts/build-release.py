#!/usr/bin/env python3
"""Build a deterministic, allowlisted macOS install ZIP using the standard library."""
import argparse
import hashlib
import json
import re
import stat
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
FILES = (
    'agent.cjs', 'manage.cjs', 'LICENSE', 'README.md', 'CHANGELOG.md', '先读我.txt',
    '安装.command', '查看状态.command', '卸载.command', 'scripts/mac-entry.sh',
    'macos/startup/bridge', 'macos/startup/controller.cjs', 'macos/startup/watch.cjs',
    'updater/core.cjs', 'updater/worker.cjs', 'updater/run.sh', 'assets/readme/codex-sidebar.png',
)


def build(output):
    version = json.loads((ROOT / 'package.json').read_text())['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?', version):
        raise ValueError('Invalid release version')
    for name, pattern in [('manage.cjs', r"const VERSION='([^']+)'"),
                          ('agent.cjs', r"var AGENT_VERSION = '([^']+)'")]:
        match = re.search(pattern, (ROOT / name).read_text())
        if not match or match[1] != version:
            raise ValueError(f'Version mismatch: {name}')
    contents = {}
    for name in FILES:
        source = ROOT / name
        if source.is_symlink() or not source.is_file():
            raise ValueError(f'Missing file or symlink: {name}')
        contents[name] = source.read_bytes()
    contents['SHA256SUMS.txt'] = ''.join(
        f'{hashlib.sha256(data).hexdigest()}  {name}\n'
        for name, data in sorted(contents.items())
    ).encode()
    stem = f'CodexMeter-macOS-{version}'
    output.mkdir(parents=True, exist_ok=True)
    archive = output / (stem + '.zip')
    with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as bundle:
        for name, data in sorted(contents.items()):
            info = ZipInfo(f'{stem}/{name}', date_time=(2026, 1, 1, 0, 0, 0))
            info.create_system = 3
            executable = name.endswith(('.command', '.sh')) or name == 'macos/startup/bridge'
            info.external_attr = (stat.S_IFREG | (0o755 if executable else 0o644)) << 16
            info.compress_type = ZIP_DEFLATED
            bundle.writestr(info, data)
    sums = output / 'SHA256SUMS.txt'
    sums.write_text(f'{hashlib.sha256(archive.read_bytes()).hexdigest()}  {archive.name}\n')
    return archive, sums


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    for artifact in build(args.output_dir.resolve()):
        print(artifact)
