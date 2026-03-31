#!/usr/bin/env node

import { Command } from "commander";
import { getConfig, type Config } from "./config.js";
import { getStagedDiff } from "./git.js";
import { generateMessage } from "./llm.js";

const DEFAULT_PROVIDER = "openai";
const DEFAULT_MODEL = "gpt-4o-mini";

const program = new Command();

program
  .name("gitcommitgen")
  .description("AI-powered conventional commit message generator")
  .version("1.0.0")
  .option("-p, --provider <provider>", "LLM provider (openai, anthropic)")
  .option("-m, --model <model>", "LLM model to use")
  .option("--commit", "auto-commit with the generated message")
  .option("--dry-run", "show diff summary and proposed message without committing")
  .option("--edit", "open generated message in $EDITOR before committing")
  .action(async (opts: { provider?: string; model?: string; commit?: boolean; dryRun?: boolean; edit?: boolean }) => {
    const config = getConfig();
    const isConfigEmpty = Object.keys(config).length === 0;

    const provider = (opts.provider ?? config.provider ?? DEFAULT_PROVIDER) as "openai" | "anthropic";
    const model = opts.model ?? config.model ?? DEFAULT_MODEL;
    const commit = opts.commit ?? config.commit ?? false;
    const dryRun = opts.dryRun ?? config.dryRun ?? false;

    // Default to --edit if no flags and no config
    const noFlags = opts.commit === undefined && opts.dryRun === undefined && opts.edit === undefined;
    const edit = opts.edit ?? config.edit ?? (isConfigEmpty && noFlags ? true : false);

    if (provider !== "openai" && provider !== "anthropic") {
      console.error(`Error: Unsupported provider "${provider}". Supported: openai, anthropic`);
      process.exit(1);
    }

    const apiKeyEnv =
      provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) {
      console.error(`Error: ${apiKeyEnv} is not set.
To use ${provider}, please provide your API key by running:
export ${apiKeyEnv}="your-key-here"`);
      process.exit(1);
    }

    const diff = getStagedDiff();
    if (!diff.trim()) {
      console.error("Error: No staged changes. Use git add to stage files first.");
      process.exit(1);
    }

    if (dryRun) {
      console.log("--- Staged diff ---");
      console.log(diff.length > 3000 ? diff.slice(0, 3000) + "\n... (truncated)" : diff);
    }

    const message = await generateMessage({ provider, model, apiKey, diff });

    if (edit) {
      const { editMessage } = await import("./edit.js");
      const edited = editMessage(message);
      if (!edited.trim()) {
        console.log("Aborted: empty message from editor.");
        process.exit(0);
      }
      await commitOrPrint(edited, commit);
    } else {
      if (dryRun) {
        console.log("\n--- Generated message ---");
      }
      await commitOrPrint(message, commit);
    }
  });

async function commitOrPrint(message: string, autoCommit: boolean) {
  if (autoCommit) {
    const { execSync } = await import("child_process");
    execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: "inherit" });
  } else {
    console.log(message);
  }
}

program.parse();
