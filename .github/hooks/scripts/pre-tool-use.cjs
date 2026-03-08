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

function normalizeInput(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return {};
  return toolInput;
}

function detectAffectedFiles(input) {
  const files = new Set();

  if (Array.isArray(input.files)) {
    for (const file of input.files) {
      if (typeof file === 'string') files.add(file);
      if (file && typeof file.filePath === 'string') files.add(file.filePath);
      if (file && typeof file.path === 'string') files.add(file.path);
    }
  }

  if (typeof input.filePath === 'string') files.add(input.filePath);
  if (typeof input.path === 'string') files.add(input.path);

  if (Array.isArray(input.edits)) {
    for (const edit of input.edits) {
      if (edit && typeof edit.filePath === 'string') files.add(edit.filePath);
      if (edit && typeof edit.path === 'string') files.add(edit.path);
    }
  }

  return Array.from(files);
}

function out(payload) {
  process.stdout.write(JSON.stringify(payload));
}

(async () => {
  const raw = await readStdin();
  const payload = parseJson(raw);

  const toolName = payload.tool_name || payload.toolName || '';
  const toolInput = normalizeInput(payload.tool_input || payload.toolInput);
  const isRunTool = toolName === 'runCommands' || toolName === 'execute/runInTerminal';
  const isEditTool = toolName === 'editFiles' || toolName === 'edit/editFiles';

  if (isRunTool) {
    const command = String(toolInput.command || '').toLowerCase();

    const denyPatterns = [
      /\brm\s+-rf\s+\//,
      /\brm\s+-rf\s+\*/,
      /\bformat\s+[a-z]:/,
      /\bdel\s+\/s\s+\/q\s+[a-z]:\\/,
      /\berase\s+\/s\s+\/q\s+[a-z]:\\/
    ];

    if (denyPatterns.some((pattern) => pattern.test(command))) {
      out({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: 'Blocked a destructive command by repository safety policy.'
        },
        systemMessage: 'Command blocked by PreToolUse safety hook.'
      });
      return;
    }
  }

  if (isEditTool) {
    const files = detectAffectedFiles(toolInput);
    const touchesHookFiles = files.some((file) => /\.github[\\/]hooks[\\/]/i.test(file));

    if (touchesHookFiles) {
      out({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: 'Hook files are high-trust artifacts. Manual review is required.'
        },
        systemMessage: 'Manual approval requested for hook file edits.'
      });
      return;
    }

    if (files.length > 8) {
      out({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: 'Large file-edit batch detected. Confirm scope before proceeding.'
        },
        systemMessage: 'Large edit batch detected. Review scope and continue if intentional.'
      });
      return;
    }
  }

  out({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      additionalContext:
        'Use minimal scope and preserve contracts. After tool execution, run focused validation and record outcomes.'
    }
  });
})();
