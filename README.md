# gitcommitgen

AI-powered conventional commit message generator. Analyzes your staged git changes and generates clean, meaningful commit messages.

## Why?

Writing good commit messages is tedious. Let AI do it. Just stage your changes and run `gitcommitgen`.

## Install

```bash
npm install -g @fanioz/gitcommitgen
```

## Setup

Set your LLM provider API key:

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

Optional: create a config file at `~/.gitcommitgen.json` to set defaults:

```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "commit": true,
  "edit": true,
  "dryRun": false
}
```

By default, if no configuration file is found and no flags are provided, the tool defaults to `--edit` mode.

## Usage

```bash
# Generate and print commit message
gitcommitgen

# Generate and auto-commit
gitcommitgen --commit

# Use a specific provider and model
gitcommitgen --provider anthropic --model claude-haiku-4-5

# Preview: show diff summary and proposed message
gitcommitgen --dry-run

# Edit the generated message before committing
gitcommitgen --commit --edit
```

### Pipe to git commit

```bash
git commit -m "$(gitcommitgen)"
```

## How it works

1. Reads `git diff --staged` to see your changes
2. Sends the diff to an LLM with a prompt tuned for conventional commits
3. Returns a clean commit message (type, optional scope, description)

## Supported providers

| Provider  | Default model       | Env var              |
| --------- | ------------------- | -------------------- |
| OpenAI    | gpt-4o-mini         | `OPENAI_API_KEY`     |
| Anthropic | claude-haiku-4-5    | `ANTHROPIC_API_KEY`  |

## License

MIT
