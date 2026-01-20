#!/usr/bin/env node

/**
 * Long-running agent loop hook for Cursor.
 *
 * This hook runs when the agent stops and checks if work is complete.
 * If .cursor/scratchpad.md exists and does NOT contain "DONE", it sends
 * a follow-up message to continue working.
 *
 * Usage:
 * 1. Create .cursor/scratchpad.md with your goal/checklist
 * 2. Ask the agent to work on the task and update scratchpad.md
 * 3. The agent will keep iterating until scratchpad.md contains "DONE"
 *
 * To disable: Remove or rename .cursor/hooks.json
 */

import { readFileSync, existsSync } from "node:fs";

const MAX_ITERATIONS = 5;
const SCRATCHPAD_PATH = ".cursor/scratchpad.md";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  let input;
  try {
    const raw = await readStdin();
    input = JSON.parse(raw);
  } catch {
    // If we can't parse input, exit silently
    console.log(JSON.stringify({}));
    process.exit(0);
  }

  const { status, loop_count = 0 } = input;

  // Only continue if the agent completed successfully and we haven't hit max iterations
  if (status !== "completed" || loop_count >= MAX_ITERATIONS) {
    console.log(JSON.stringify({}));
    process.exit(0);
  }

  // Check if scratchpad exists and contains DONE
  if (!existsSync(SCRATCHPAD_PATH)) {
    console.log(JSON.stringify({}));
    process.exit(0);
  }

  const scratchpad = readFileSync(SCRATCHPAD_PATH, "utf-8");

  if (scratchpad.includes("DONE")) {
    // Work is complete, don't continue
    console.log(JSON.stringify({}));
  } else {
    // Work is not complete, send follow-up message
    console.log(
      JSON.stringify({
        followup_message: `[Iteration ${loop_count + 1}/${MAX_ITERATIONS}] Continue working on the task. Check .cursor/scratchpad.md for progress. Mark it with DONE when complete.`,
      })
    );
  }
}

main().catch(() => {
  console.log(JSON.stringify({}));
  process.exit(0);
});
