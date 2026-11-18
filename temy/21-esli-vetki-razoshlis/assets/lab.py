#!/usr/bin/env python3
"""Local-only Git lab. Usage: python3 lab.py --root NEW_FOLDER setup
Then: python3 lab.py --root SAME_FOLDER snapshot NAME
Never overwrites an existing lab. Requires Python 3.9+ and Git.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--root', required=True, type=Path)
parser.add_argument('action', choices=['setup', 'snapshot'])
parser.add_argument('name', nargs='?', default='state')
args = parser.parse_args()
root = args.root.expanduser().resolve()
env = dict(os.environ, LC_ALL='C', GIT_CONFIG_NOSYSTEM='1',
           GIT_AUTHOR_NAME='Demo', GIT_AUTHOR_EMAIL='demo@example.invalid',
           GIT_COMMITTER_NAME='Demo', GIT_COMMITTER_EMAIL='demo@example.invalid',
           GIT_AUTHOR_DATE='2001-01-01T00:00:00+0000',
           GIT_COMMITTER_DATE='2001-01-01T00:00:00+0000')
transcript = []
def git(folder, *words, check=True):
    result = subprocess.run(['git', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false',
        '-C', str(folder), *words], env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    transcript.append('$ git ' + ' '.join(words) + '\n' + result.stdout)
    if check and result.returncode:
        raise RuntimeError(transcript[-1])
    return result.stdout.strip()

def commit(folder, message, minute):
    date = f'2001-01-01T00:{minute:02d}:00+0000'
    env['GIT_AUTHOR_DATE'] = env['GIT_COMMITTER_DATE'] = date
    git(folder, 'add', '.')
    git(folder, 'commit', '-m', message)
    return git(folder, 'rev-parse', '--short=7', 'HEAD')

def snapshot(name):
    if not name.replace('-', '').replace('_', '').isalnum():
        raise ValueError('Snapshot name must contain letters, digits, - or _')
    a = root / 'work-a'
    data = { 'name': name, 'git_version': git(a, '--version') }
    for key, command in [
        ('status', ['status', '-sb']),
        ('graph', ['log', '--graph', '--oneline', '--decorate', '--all']),
        ('counts', ['rev-list', '--left-right', '--count', 'HEAD...@{u}']),
        ('refs', ['show-ref']), ('head', ['rev-parse', '--short=7', 'HEAD']),
        ('branch', ['symbolic-ref', '--short', '-q', 'HEAD']),
        ('remote', ['remote', 'get-url', 'origin']),
    ]:
        data[key] = git(a, *command, check=False)
    data['files'] = {p.name:p.read_text() for p in a.iterdir() if p.is_file()}
    data['in_progress'] = [p.name for p in (a/'.git').iterdir()
        if p.name in ('rebase-merge', 'rebase-apply', 'MERGE_HEAD')]
    out = root/'evidence'; out.mkdir(exist_ok=True)
    (out/f'{name}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
    (out/f'{name}.txt').write_text('\n\n'.join(f'{k}\n{v}' for k,v in data.items())+'\n')
    print(json.dumps(data, ensure_ascii=False, indent=2))

if args.action == 'setup':
    if root.exists():
        raise SystemExit('Refusing to overwrite existing path: '+str(root))
    root.mkdir(parents=True)
    git(root, 'init', '--bare', '--initial-branch=main', 'origin.git')
    git(root, 'clone', str(root/'origin.git'), 'work-a')
    a, b = root/'work-a', root/'work-b'
    git(a, 'config', 'user.name', 'Demo'); git(a, 'config', 'user.email', 'demo@example.invalid')
    git(a, 'config', 'git45.localOnly', 'true')
    (a/'README.md').write_text('Workshop\n')
    (a/'plan.txt').write_text('Start: 10:00\n')
    hashes = {'base':commit(a, 'Initial workshop plan', 0)}
    git(a, 'push', '-u', 'origin', 'main')
    git(root, 'clone', str(root/'origin.git'), 'work-b')
    git(b, 'config', 'user.name', 'Demo'); git(b, 'config', 'user.email', 'demo@example.invalid')
    for branch in ('merge-demo', 'rebase-demo'):
        git(a, 'branch', branch, hashes['base'])
        git(a, 'push', '-u', 'origin', branch)
    git(b, 'fetch', 'origin')
    for branch, minute in [('merge-demo', 1), ('rebase-demo', 3)]:
        git(a, 'switch', branch); git(b, 'switch', '--track', 'origin/'+branch)
        if branch == 'merge-demo':
            (a/'notes.txt').write_text('Bring laptop\n')
            (b/'contact.txt').write_text('Room 204\n')
            msg_a, msg_b = 'Add equipment note', 'Add room contact'
        else:
            (a/'plan.txt').write_text('Start: 11:00\n')
            (b/'plan.txt').write_text('Start: 12:00\n')
            msg_a, msg_b = 'Move start to 11:00', 'Move start to 12:00'
        hashes[branch+'-local'] = commit(a, msg_a, minute)
        hashes[branch+'-remote'] = commit(b, msg_b, minute+1)
        git(b, 'push', 'origin', branch)
    git(a, 'switch', 'merge-demo')
    (root/'setup.json').write_text(json.dumps(hashes, indent=2)+'\n')
    (root/'setup.log').write_text('\n'.join(transcript))
    print(json.dumps(hashes, indent=2))
    snapshot('initial')
else:
    if not (root/'work-a/.git').exists():
        raise SystemExit('Not a lab: '+str(root))
    snapshot(args.name)
