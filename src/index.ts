#!/usr/bin/env node

import { Command } from "commander";
import { getConfig, type Config } from "./config.js";
import { getStagedDiff } from "./git.js";
import { generateMessage } from "./llm.js";

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
  .action(async (opts) => {
    const config: Config = getConfig();

    const provider = opts.provider ?? config.provider;
    const model = opts.model ?? config.model;

    if (!provider || !model) {
      console.error("Error: Set provider and model via flags or ~/.gitcommitgen.json");
      process.exit(1);
    }

    const apiKeyEnv =
      provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) {
      console.error(`Error: ${apiKeyEnv} not set`);
      process.exit(1);
    }

    const diff = getStagedDiff();
    if (!diff.trim()) {
      console.error("Error: No staged changes. Use git add to stage files first.");
      process.exit(1);
    }

    if (opts.dryRun) {
      console.log("--- Staged diff ---");
      console.log(diff.length > 3000 ? diff.slice(0, 3000) + "\n... (truncated)" : diff);
    }

    const message = await generateMessage({ provider, model, apiKey, diff });

    if (opts.edit) {
      const { editMessage } = await import("./edit.js");
      const edited = editMessage(message);
      if (!edited.trim()) {
        console.log("Aborted: empty message from editor.");
        process.exit(0);
      }
      await commitOrPrint(edited, opts.commit);
    } else {
      if (opts.dryRun) {
        console.log("\n--- Generated message ---");
      }
      await commitOrPrint(message, opts.commit);
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
