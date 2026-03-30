import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function editMessage(message: string): string {
  const dir = mkdtempSync(join(tmpdir(), "gitcommitgen-"));
  const filePath = join(dir, "COMMIT_MSG");
  writeFileSync(filePath, message, "utf-8");

  const editor = process.env.EDITOR ?? "vim";
  try {
    execSync(`${editor} "${filePath}"`, { stdio: "inherit" });
  } finally {
    let edited = "";
    try {
      edited = readFileSync(filePath, "utf-8");
    } catch {}
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
    return edited;
  }
}
