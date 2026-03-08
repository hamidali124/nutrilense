# skills.sh compatibility folder

This folder is available for optional shared-skill imports via `skills.sh`.

Example:

```bash
npx skills add owner/repo
```

If an imported skill lands in `.agents/skills`, VS Code can still discover it because `.vscode/settings.json` includes this location in `chat.agentSkillsLocations`.

Primary in-repo source remains `.github/skills`.
