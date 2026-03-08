function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

function parseJson(value) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return {};
  }
}

function out(payload) {
  process.stdout.write(JSON.stringify(payload));
}

(async () => {
  const raw = await readStdin();
  const payload = parseJson(raw);
  const hookEventName = payload.hookEventName || payload.hook_event_name || '';

  if (hookEventName === 'SessionStart') {
    out({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext:
          'Session policy: build impact map, plan before broad edits, keep scope minimal, validate with focused tests first, and finish with QA-style risk summary.'
      }
    });
    return;
  }

  if (hookEventName === 'SubagentStart') {
    out({
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext:
          'Subagent policy: report changed files, commands run, results, and remaining risks before handoff completes.'
      }
    });
    return;
  }

  out({ continue: true });
})();
