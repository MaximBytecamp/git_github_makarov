#!/usr/bin/env python3
"""Replay both experiments in an existing *disposable* lab created by lab.py.
Usage: python3 replay.py --root FOLDER
Stops rather than overwriting finished histories. All pushes use a local bare path.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--root',required=True,type=Path)
p.add_argument('--stop-after',help='Stop after a named snapshot for an editor inspection')
a=p.parse_args();root=a.root.resolve();repo=root/'work-a'; evidence=root/'evidence'
env=dict(os.environ,LC_ALL='C',GIT_AUTHOR_NAME='Demo',GIT_AUTHOR_EMAIL='demo@example.invalid',GIT_COMMITTER_NAME='Demo',GIT_COMMITTER_EMAIL='demo@example.invalid',GIT_AUTHOR_DATE='2001-01-01T00:10:00+0000',GIT_COMMITTER_DATE='2001-01-01T00:10:00+0000',GIT_EDITOR='true',GIT_SEQUENCE_EDITOR='true')
lab=Path(__file__).with_name('lab.py')
log=[]
def run(*cmd,expected=0):
    r=subprocess.run(['git','-c','commit.gpgsign=false','-c','core.autocrlf=false','-C',str(repo),*cmd],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    log.append('$ git '+' '.join(cmd)+'\n'+r.stdout+'[exit '+str(r.returncode)+']\n')
    (evidence/'replay.log').write_text('\n'.join(log))
    print(log[-1],flush=True)
    if r.returncode!=expected:raise SystemExit('Unexpected exit status')
    return r.stdout.strip()
def snap(name):
    subprocess.run([sys.executable,'-I',str(lab),'--root',str(root),'snapshot',name],check=True,stdout=subprocess.DEVNULL)
    if a.stop_after==name: raise SystemExit('Stopped for inspection at '+name)
if run('remote','get-url','origin')!=str(root/'origin.git'):
    raise SystemExit('Refusing non-local remote')
hashes=json.loads((root/'setup.json').read_text())
if run('rev-parse','--short=7','merge-demo')!=hashes['merge-demo-local'] or run('rev-parse','--short=7','rebase-demo')!=hashes['rebase-demo-local']:
    raise SystemExit('Not the initial lab: create a new root with lab.py')
run('switch','merge-demo');snap('01-before-push')
run('push','origin','merge-demo',expected=1);snap('02-rejected')
run('fetch','origin');snap('03-fetched')
run('rev-list','--left-right','--count','HEAD...@{u}')
run('log','--graph','--oneline','--decorate','HEAD','origin/merge-demo')
run('merge','--no-edit','origin/merge-demo');snap('04-merged')
run('show','--format=%h %s%nParents: %p','--no-patch','HEAD')
run('status','--short');run('diff','--check')
assert (repo/'notes.txt').read_text()=='Bring laptop\n'
assert (repo/'contact.txt').read_text()=='Room 204\n'
run('push','origin','merge-demo');snap('05-merge-pushed')
run('fetch','origin');run('rev-list','--left-right','--count','HEAD...@{u}')
run('switch','rebase-demo');snap('06-rebase-start')
# Demonstrate the alternative merge conflict and a safe cancellation.
run('merge','--no-edit','origin/rebase-demo',expected=1);snap('07-merge-conflict')
run('merge','--abort');snap('08-merge-aborted')
run('rebase','origin/rebase-demo',expected=1);snap('09-rebase-conflict')
run('rebase','--abort');snap('10-rebase-aborted')
run('rebase','origin/rebase-demo',expected=1);snap('11-rebase-retry')
# Agreed resolution keeps the remote time and adds the local preparation time.
(repo/'plan.txt').write_text('Start: 12:00\nPreparation: 11:00\n')
run('add','plan.txt');snap('12-resolved-staged')
run('diff','--cached','--check')
run('rebase','--continue');snap('13-rebased')
run('show','--format=%h %s%nParents: %p','--no-patch','HEAD')
run('status','--short');run('diff','--check')
assert (repo/'plan.txt').read_text()=='Start: 12:00\nPreparation: 11:00\n'
run('push','origin','rebase-demo');snap('14-rebase-pushed')
run('fetch','origin');run('rev-list','--left-right','--count','HEAD...@{u}')
# Second clone is behind after A's push; its fast-forward preserves all commits.
b=root/'work-b'
r=subprocess.run(['git','-C',str(b),'fetch','origin'],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=True)
log.append('$ git -C work-b fetch origin\n'+r.stdout)
r=subprocess.run(['git','-C',str(b),'status','-sb'],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=True)
log.append('$ git -C work-b status -sb\n'+r.stdout)
r=subprocess.run(['git','-C',str(b),'merge','--ff-only','origin/rebase-demo'],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=True)
log.append('$ git -C work-b merge --ff-only origin/rebase-demo\n'+r.stdout)
(evidence/'replay.log').write_text('\n'.join(log))
print('Both scenarios complete. Evidence:',evidence)
