import { execSync } from "node:child_process";

export function getStagedDiff(): string {
  try {
    return execSync("git diff --staged", { encoding: "utf-8" });
  } catch {
    return "";
  }
}
