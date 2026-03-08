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

function stringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value || '');
  }
}

function out(payload) {
  process.stdout.write(JSON.stringify(payload));
}

(async () => {
  const raw = await readStdin();
  const payload = parseJson(raw);

  const toolName = payload.tool_name || payload.toolName || '';
  const toolInput = payload.tool_input || payload.toolInput || {};
  const toolResponse = stringify(payload.tool_response || payload.toolResponse || '');
  const isEditTool = toolName === 'editFiles' || toolName === 'edit/editFiles';
  const isRunTool = toolName === 'runCommands' || toolName === 'execute/runInTerminal';

  if (isEditTool) {
    out({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          'Files were edited. Run the nearest tests first, then summarize changed files, command outcomes, and residual risks.'
      }
    });
    return;
  }

  if (isRunTool) {
    const command = String(toolInput.command || '');
    const looksLikeTest = /npm\s+test|jest|pytest/i.test(command);
    const looksFailed = /fail|failed|error|exception/i.test(toolResponse);

    if (looksLikeTest && looksFailed) {
      out({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext:
            'Test command reported failures. Diagnose root cause before continuing and avoid unrelated fixes.'
        }
      });
      return;
    }

    if (looksLikeTest) {
      out({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext:
            'Tests executed. Record command, scope, and pass/fail outcome in the validation matrix.'
        }
      });
      return;
    }
  }

  out({ continue: true });
})();
