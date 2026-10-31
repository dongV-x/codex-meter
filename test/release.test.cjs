'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

test('双击入口在含空格的解压目录中可正确传递操作，优先使用已提供的运行时',()=>{
  const root=path.resolve(__dirname,'..');
  fs.mkdirSync(path.join(root,'dist'),{recursive:true});
  const temp=fs.mkdtempSync(path.join(root,'dist','entry test '));
  try {
    fs.mkdirSync(path.join(temp,'scripts'));
    fs.copyFileSync(path.join(root,'scripts/mac-entry.sh'),path.join(temp,'scripts/mac-entry.sh'));
    const runtime=path.join(temp,'node runtime');
    fs.writeFileSync(runtime,'#!/bin/bash\nif [ "$1" = "-e" ]; then exit 0; fi\nprintf "%s\\n" "$PWD" "$@"\n',{mode:0o755});
    for(const [name,action] of [['安装.command','install'],['查看状态.command','status'],['卸载.command','uninstall']]) {
      const entry=path.join(temp,name);
      fs.copyFileSync(path.join(root,name),entry);
      const result=spawnSync('/bin/bash',[entry],{cwd:root,encoding:'utf8',input:'\n',env:{...process.env,CODEX_BADGE_NODE:runtime}});
      assert.equal(result.status,0,result.stderr);
      assert.deepEqual(result.stdout.trim().split('\n'),[temp,'./manage.cjs',action]);
    }
  } finally { fs.rmSync(temp,{recursive:true,force:true}); }
});

test('发布包可重复构建，保留可执行权限且只包含登记文件',()=>{
  const result=spawnSync('python3',['-c',String.raw`
import hashlib, importlib.util, json, shutil, sys, tempfile
from pathlib import Path
from zipfile import ZipFile
sys.dont_write_bytecode = True
root = Path.cwd()
spec = importlib.util.spec_from_file_location('release', root / 'scripts/build-release.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
(root / 'dist').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='release-test-', dir=root / 'dist') as temp:
    temp = Path(temp)
    source = temp / 'source with spaces'
    source.mkdir()
    for name in [*module.FILES, 'package.json']:
        dest = source / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / name, dest)
    (source / '.env').write_text('PRIVATE_FIXTURE=not-for-release')
    (source / 'account.json').write_text('private fixture')
    module.ROOT = source
    archive, sums = module.build(temp / 'release with spaces')
    first = archive.read_bytes()
    module.build(temp / 'release with spaces')
    assert archive.read_bytes() == first, 'Build must be deterministic'
    assert sums.read_text().split()[0] == hashlib.sha256(first).hexdigest()
    with ZipFile(archive) as bundle:
        prefix = archive.stem + '/'
        names = {name.removeprefix(prefix) for name in bundle.namelist()}
        assert names == set(module.FILES) | {'SHA256SUMS.txt'}
        for name in ['安装.command', '查看状态.command', '卸载.command', 'scripts/mac-entry.sh', 'macos/startup/bridge']:
            assert (bundle.getinfo(prefix + name).external_attr >> 16) & 0o111 == 0o111
        for line in bundle.read(prefix + 'SHA256SUMS.txt').decode().splitlines():
            checksum, name = line.split('  ', 1)
            assert hashlib.sha256(bundle.read(prefix + name)).hexdigest() == checksum
        bundle.extractall(temp / 'extracted with spaces')
    for name in module.FILES:
        assert (temp / 'extracted with spaces' / archive.stem / name).read_bytes() == (source / name).read_bytes()
    manager = source / 'manage.cjs'
    saved = manager.read_text()
    manager.write_text(saved.replace("const VERSION='", "const VERSION='invalid-"))
    try:
        module.build(temp / 'invalid')
        raise AssertionError('Version mismatch must reject packaging')
    except ValueError:
        pass
    manager.write_text(saved)
    bridge = source / 'macos/startup/bridge'
    bridge.unlink()
    bridge.symlink_to(root / 'macos/startup/bridge')
    try:
        module.build(temp / 'invalid')
        raise AssertionError('Symlinks must reject packaging')
    except ValueError:
        pass
print('ZIP checksums, executable modes, allowlist, extraction, deterministic build and validation passed')
`],{cwd:require('node:path').resolve(__dirname,'..'),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr || result.stdout);
});
