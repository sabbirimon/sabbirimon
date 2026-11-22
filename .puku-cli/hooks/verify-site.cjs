#!/usr/bin/env node
// PostToolUse gate for Edit and Write.
//
// After a file under docs/ or tests/ changes, run the repository's two gates and report
// what failed. This hook never blocks: it runs after the edit has already landed, so
// refusing would leave the workspace in a half-done state with no message. It reports
// loudly and exits 0.
//
// Exit codes:
//   0  always, unless the hook itself failed
//   1  the hook could not run (a bug in this file)

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const WATCHED = /^(docs|tests|scripts)\//;

function readPayload() {
  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {
    return {};
  }
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function run(command, args) {
  return spawnSync(command, args, { encoding: 'utf8', timeout: 120000 });
}

function main() {
  const payload = readPayload();
  const file = (payload.tool_input && (payload.tool_input.file_path || payload.tool_input.path)) || '';
  if (typeof file !== 'string' || !file) return;

  const relative = path.relative(process.cwd(), path.resolve(file));
  if (!WATCHED.test(relative)) return;

  const projectRoot = process.cwd();
  const results = [];

  const tests = run('node', ['--test', 'tests/*.test.mjs']);
  // node --test does not expand a glob itself on every platform, so fall back to
  // enumerating the directory when the glob came back as a literal path.
  const testOutput = tests.stdout + tests.stderr;
  const globNotExpanded = /Could not find[^\n]*tests\/\*\.test\.mjs/.test(testOutput);
  if (globNotExpanded) {
    const dir = path.join(projectRoot, 'tests');
    const files = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).map((f) => path.join('tests', f))
      : [];
    if (files.length) results.push({ name: 'node --test', ...run('node', ['--test', ...files]) });
    else results.push({ name: 'node --test', status: 0, stdout: 'no test files\n', stderr: '' });
  } else {
    results.push({ name: 'node --test', ...tests });
  }

  results.push({ name: 'check-site.py', ...run('python3', ['scripts/check-site.py']) });

  const failed = results.filter((r) => r.status !== 0);
  if (!failed.length) return;

  const lines = ['[verify-site] a gate failed after editing ' + relative];
  for (const r of failed) {
    lines.push('--- ' + r.name + ' (exit ' + r.status + ') ---');
    const output = (r.stdout || '') + (r.stderr || '');
    lines.push(output.trim().split('\n').slice(-25).join('\n'));
  }
  lines.push('[verify-site] fix these before committing.');
  process.stderr.write(lines.join('\n') + '\n');
}

try {
  main();
} catch (err) {
  process.stderr.write(`[verify-site] hook error: ${err && err.message}\n`);
  process.exit(1);
}
