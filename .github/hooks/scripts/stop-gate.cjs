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

  if (payload.stop_hook_active) {
    out({ continue: true });
    return;
  }

  out({
    hookSpecificOutput: {
      hookEventName: 'Stop',
      decision: 'block',
      reason:
        'Before stopping, provide changed files, validation matrix (commands + outcomes), and residual risks.'
    }
  });
})();
