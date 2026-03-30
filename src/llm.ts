import ora from "ora";

const SYSTEM_PROMPT = `You are a commit message generator. Given a git diff, output ONLY a conventional commit message. No explanation, no markdown fences, just the message.

Use one of these types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
Format: type(scope): description

Keep the subject line under 72 characters. Add a blank line then body only if the change is non-trivial.`;

interface GenerateParams {
  provider: "openai" | "anthropic";
  model: string;
  apiKey: string;
  diff: string;
}

export async function generateMessage({ provider, model, apiKey, diff }: GenerateParams): Promise<string> {
  const spinner = ora("Generating commit message...").start();

  try {
    let message: string;

    if (provider === "openai") {
      message = await callOpenAI(model, apiKey, diff);
    } else {
      message = await callAnthropic(model, apiKey, diff);
    }

    // Strip markdown fences if present
    message = message.trim().replace(/^```[\s\S]*?\n?```\s*$/, "").trim();

    spinner.succeed("Commit message generated.");
    return message;
  } catch (err) {
    spinner.fail("Failed to generate commit message.");
    throw err;
  }
}

async function callOpenAI(model: string, apiKey: string, diff: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Here is the git diff:\n\n${diff}` },
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? "";
}

async function callAnthropic(model: string, apiKey: string, diff: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Here is the git diff:\n\n${diff}` }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
  return data.content[0]?.text ?? "";
}
