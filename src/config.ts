import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Config {
  provider?: "openai" | "anthropic";
  model?: string;
  commit?: boolean;
  edit?: boolean;
  dryRun?: boolean;
}

export function getConfig(): Config {
  const configPath = join(homedir(), ".gitcommitgen.json");
  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as Config;
  } catch {
    return {};
  }
}
