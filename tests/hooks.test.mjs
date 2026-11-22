import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const guard = path.join(root, '.puku-cli/hooks/guard-bash.cjs');
const verify = path.join(root, '.puku-cli/hooks/verify-site.cjs');

function runHook(script, payload) {
  const res = spawnSync('node', [script], {
    cwd: root,
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 120000
  });
  return { status: res.status, out: (res.stdout || '') + (res.stderr || '') };
}

function bash(command) {
  return { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, tool_use_id: 't', session_id: 't', cwd: root };
}

function edit(file_path) {
  return { hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path }, tool_use_id: 't', session_id: 't', cwd: root };
}

test('the bash guard blocks a force push', () => {
  const res = runHook(guard, bash('git push --force origin main'));
  assert.equal(res.status, 2);
  assert.match(res.out, /blocked: force-push/);
});

test('the bash guard blocks a history rewrite', () => {
  assert.equal(runHook(guard, bash('git reset --hard HEAD~3')).status, 2);
  assert.equal(runHook(guard, bash('git rebase -i main')).status, 2);
});

test('the bash guard blocks a recursive delete of the root or the home directory', () => {
  assert.equal(runHook(guard, bash('rm -rf /')).status, 2);
  assert.equal(runHook(guard, bash('rm -rf ~/')).status, 2);
});

test('the bash guard blocks a recursive delete outside the project', () => {
  const res = runHook(guard, bash('rm -rf /Users/someone/other-repo'));
  assert.equal(res.status, 2);
  assert.match(res.out, /blocked: out-of-project-delete/);
});

test('the bash guard blocks writing to a block device', () => {
  assert.equal(runHook(guard, bash('dd if=/dev/zero of=/dev/sda')).status, 2);
});

test('the bash guard blocks deleting a remote branch', () => {
  assert.equal(runHook(guard, bash('git push origin main --delete feature')).status, 2);
});

test('the bash guard allows ordinary work', () => {
  for (const command of ['git status --short', 'node --test tests/*.test.mjs', 'FOO=bar python3 -c print', 'rm -rf node_modules', 'rm -rf docs/old', 'npm run build', 'git commit -m "fix: thing"']) {
    assert.equal(runHook(guard, bash(command)).status, 0, command);
  }
});

test('the bash guard survives a payload with no command', () => {
  assert.equal(runHook(guard, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: {} }).status, 0);
});

test('the site verifier never blocks, it only reports', () => {
  for (const file of ['docs/news.js', 'tests/news.test.mjs', 'ReadMe.md']) {
    assert.equal(runHook(verify, edit(file)).status, 0, file);
  }
});

test('the site verifier ignores files outside the watched folders', () => {
  const res = runHook(verify, edit('assets/logo.svg'));
  assert.equal(res.status, 0);
  assert.equal(res.out.trim(), '');
});
