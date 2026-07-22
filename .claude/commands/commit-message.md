---
description: Create a commit message by analyzing git diffs
allowed-tools: Bash(git status:*), Bash(git diff --staged), Bash(git commit:*)
---

## Your task:

Analyze above staged git changes and create a commit message. Use present tense and explain "why" something has changed, not just "what" has changed.

## Run these commands:

```bash

git status
git diff --staged
```

## Commit types with emojis:
Only use the following emojis:

- ✨ `feat:` - New feature
- 🐛 `fix:` - Bug fix
- 🔨 `refactor:` - Refactoring code
- 📝 `docs:` - Documentation
- 🎨 `style:` - Styling/formatting
- ✅ `test:` - Tests
- ⚡ `perf:` - Performance

## Format:

Use the following format for making the commit message:

```
<emoji> <type>: <concise_descriptiom>
<optional_body_explaining_why>
```

## Output:

1. Show summary of changes currently staged
2. Propose commit messages with appropriate emoji
3. Ask for confirmation before commiting

DO NOT auto-commit - wait for user approval, and only commit if user says so.