#!/usr/bin/env node
// PreToolUse guard for Bash calls.
//
// Blocks commands that would damage state outside the project or rewrite published
// history. Everything else is allowed through, so this hook never becomes the reason
// ordinary work stops.
//
// Exit codes follow the hook protocol:
//   0  allow
//   2  block, with the reason on stderr
//   1  the hook itself failed (this is an error in the hook, not a policy decision)

const fs = require('fs');
const path = require('path');

const BLOCKED = [
  {
    id: 'force-push',
    test: (cmd) => /git\s+push\b[^\n]*(--force\b|--force-with-lease\b|-f\b)/.test(cmd),
    reason:
      'Force-pushing rewrites published history. If you really mean to, say so explicitly and it will be run by hand.'
  },
  {
    id: 'history-rewrite',
    test: (cmd) => /git\s+(reset\s+--hard|rebase\b[^\n]*-i|filter-branch|filter-repo)\b/.test(cmd),
    reason:
      'That rewrites or discards local history. Uncommitted work is not recoverable from the reflog if the reflog is gone too.'
  },
  {
    id: 'root-delete',
    test: (cmd) => /\brm\b[^\n]*\s\/(?:\s|$)/.test(cmd) || /\brm\b[^\n]*\s~\/?(?:\s|$)/.test(cmd),
    reason: 'Recursive delete of the filesystem root or the home directory.'
  },
  {
    id: 'out-of-project-delete',
    test: (cmd) => hasRecursiveRm(cmd) && !isInsideProject(cmd),
    reason: 'Recursive delete that reaches outside the project. Remove the path or scope it to the project.'
  },
  {
    id: 'fork-bomb',
    test: (cmd) => /:\(\)\s*\{\s*:\|\s*:\s*&\s*\}\s*;\s*:/.test(cmd),
    reason: 'Fork bomb.'
  },
  {
    id: 'disk-fill',
    test: (cmd) => /\bdd\b[^\n]*of=\/dev\/[sh]d/.test(cmd) || />\s*\/dev\/[sh]d/.test(cmd),
    reason: 'Writing directly to a block device destroys the disk.'
  },
  {
    id: 'remote-branch-delete',
    test: (cmd) => /git\s+push\b[^\n]*--delete\b/.test(cmd),
    reason: 'Deleting a remote branch affects everyone. Say it out loud first.'
  }
];

function isInsideProject(cmd) {
  // A delete is acceptable when it names a path inside the repository. The repo root
  // is the working directory the hook runs in.
  //
  // A relative path resolves against the working directory, so it is inside the
  // project by construction. Only an absolute path can reach outside it, and `~`
  // always means the home directory.
  const root = process.cwd();
  const absolute = cmd.match(/(?:^|\s)(~[^\s]*|\/[^\s]*)/g) || [];
  if (!absolute.length) return true;
  return absolute.every((raw) => {
    const cleaned = raw.trim().replace(/^["']|["']$/g, '');
    const target = cleaned.startsWith('~')
      ? path.resolve(process.env.HOME || root, cleaned.slice(1))
      : path.resolve(root, cleaned);
    return target === root || target.startsWith(root + path.sep);
  });
}

// `rm -rf`, `rm -r`, `rm --recursive` and `rm -fr` all mean the same thing. The flag
// letters are bundled, so the test cannot look for one exact spelling.
function hasRecursiveRm(cmd) {
  const match = cmd.match(/\brm\b((?:\s+-{1,2}[A-Za-z-]+)*)/);
  if (!match) return false;
  return /(^|\s)-{1,2}[A-Za-z]*[rR]/.test(match[1]) || /--recursive/.test(match[1]);
}

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

function main() {
  const payload = readPayload();
  const command = (payload.tool_input && payload.tool_input.command) || '';
  if (typeof command !== 'string' || !command.trim()) return;

  for (const rule of BLOCKED) {
    if (!rule.test(command)) continue;
    process.stderr.write(`[guard-bash] blocked: ${rule.id}\n${rule.reason}\n`);
    process.exit(2);
  }
}

try {
  main();
} catch (err) {
  // A broken guard must not silently allow a dangerous command, but it also must not
  // masquerade as a policy decision. Report it as a hook failure.
  process.stderr.write(`[guard-bash] hook error: ${err && err.message}\n`);
  process.exit(1);
}
