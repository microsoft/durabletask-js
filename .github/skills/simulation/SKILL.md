# Skill: Simulation — Empirical Behavior Verification

## When to Use

Use this skill when **fact-checking cannot provide high confidence** about a specific
JavaScript, TypeScript, or Node.js behavior. This happens when:

- Official documentation is ambiguous or silent on the specific edge case
- The `js-fact-checking` skill returned a verdict of **INCONCLUSIVE** or **LOW confidence**
- The behavior depends on runtime version, timing, or environment-specific factors
- You need to verify interaction between multiple APIs (e.g., "what happens when you
  `removeAllListeners()` on a stream and then emit an error?")
- You are making a code change that assumes specific behavior you haven't personally
  verified in Node.js >= 22

**Do NOT use this skill for:**
- Behavior that is clearly documented and unambiguous
- Questions about TypeScript type system (types don't need runtime verification)
- Performance benchmarks (out of scope — requires controlled environments)

## How to Execute

### Step 1: Define the Question

State exactly what you are trying to verify. Be precise:

- **Good:** "Does `EventEmitter.removeAllListeners('error')` prevent the process from
  crashing when a subsequent `emit('error')` has no listeners?"
- **Bad:** "How do EventEmitters work?"

### Step 2: Create Temporary Simulation Directory

Create a temporary directory for the simulation:

```bash
mkdir -p /tmp/dt-simulation-<timestamp>
cd /tmp/dt-simulation-<timestamp>
```

Use a unique timestamp or random suffix to avoid collisions with parallel runs.

### Step 3: Write the Minimal Reproduction Script

Write a **single TypeScript or JavaScript file** that:

1. **Sets up the exact scenario** being tested
2. **Exercises the specific behavior** in question
3. **Prints structured results** (not just "it works")
4. **Handles both expected outcomes** (the behavior works as assumed AND it doesn't)
5. **Exits with code 0 on expected behavior, 1 on unexpected**

### Script Guidelines

- Keep it **minimal** — only the code needed to test the specific behavior
- **No external dependencies** — use only Node.js built-in modules
- Use `console.log` with labeled output for clarity
- Include a **control case** alongside the test case when feasible
- Add comments explaining what should happen if the assumption is correct
- Target **Node.js >= 22** (can use modern syntax)

### Script Template

```typescript
// Simulation: <one-line description of what we're verifying>
// Question: <the specific behavioral question>
// Expected: <what we expect to happen if our assumption is correct>

import { EventEmitter } from "events";

function main() {
  console.log("=== SIMULATION START ===");
  console.log("Question: <question>");
  console.log("");

  // --- Test Case ---
  console.log("--- Test Case ---");
  try {
    // <code that exercises the behavior>
    const result = /* ... */;
    console.log(`Result: ${result}`);
    console.log(`Expected: <expected>`);
    console.log(`Match: ${result === expected}`);
  } catch (err) {
    console.log(`Exception: ${err.message}`);
    console.log(`Exception expected: <yes/no>`);
  }

  // --- Control Case (optional) ---
  console.log("");
  console.log("--- Control Case ---");
  // <known-good baseline for comparison>

  console.log("");
  console.log("=== SIMULATION END ===");

  // Structured verdict
  const passed = /* condition */;
  console.log(JSON.stringify({
    question: "<question>",
    verified: passed,
    result: "<observed behavior>",
    node_version: process.version,
    timestamp: new Date().toISOString(),
  }));

  process.exit(passed ? 0 : 1);
}

main();
```

### Step 4: Run the Simulation

```bash
cd /tmp/dt-simulation-<timestamp>

# For TypeScript files:
npx ts-node --swc simulation.ts

# For plain JavaScript files:
node simulation.js

# If ts-node is not available, use Node.js directly with ESM:
node --experimental-strip-types simulation.ts
```

Capture the full output.

### Step 5: Interpret Results

Parse the structured JSON output from the simulation:

- **`verified: true`** → The assumed behavior is confirmed empirically.
  Proceed with confidence.
- **`verified: false`** → The assumed behavior is **wrong**. The code change or
  documentation update must be corrected. Document the actual observed behavior.

### Step 6: Clean Up

Remove the temporary simulation directory:

```bash
rm -rf /tmp/dt-simulation-<timestamp>
```

**Never commit simulation files to the repository.** They are ephemeral verification
artifacts.

### Step 7: Report Results

Include the simulation results in your work output. Format:

```
## Simulation Verification

**Question:** <what was tested>
**Node.js version:** <version>
**Result:** ✅ VERIFIED / ❌ DISPROVED
**Observed behavior:** <what actually happened>

<details>
<summary>Simulation script</summary>

\`\`\`typescript
<the script>
\`\`\`

</details>

<details>
<summary>Output</summary>

\`\`\`
<full stdout/stderr>
\`\`\`

</details>
```

## Examples

### Example 1: Verify EventEmitter error guard behavior

**Question:** After calling `stream.removeAllListeners()`, does adding
`stream.on("error", () => {})` prevent crashes from subsequent error emissions?

**Simulation script:**
```javascript
const { EventEmitter } = require("events");

const emitter = new EventEmitter();

// Add and then remove all listeners
emitter.on("error", () => console.log("original handler"));
emitter.removeAllListeners();

// Add no-op error guard
emitter.on("error", () => {});

// Emit error — should NOT crash
try {
  emitter.emit("error", new Error("test error"));
  console.log("No crash — error guard works");
  console.log(JSON.stringify({ verified: true }));
  process.exit(0);
} catch (err) {
  console.log("Crashed:", err.message);
  console.log(JSON.stringify({ verified: false }));
  process.exit(1);
}
```

**Result:** ✅ VERIFIED — The no-op listener prevents the default throw behavior.

### Example 2: Verify generator `done` state behavior

**Question:** After a generator returns `{ done: true }`, does calling `.next()` again
throw or return `{ done: true, value: undefined }`?

**Simulation script:**
```javascript
function* gen() {
  yield 1;
  return 2;
}

const g = gen();
console.log("Step 1:", JSON.stringify(g.next())); // { value: 1, done: false }
console.log("Step 2:", JSON.stringify(g.next())); // { value: 2, done: true }
console.log("Step 3:", JSON.stringify(g.next())); // { value: undefined, done: true }
console.log("Step 4:", JSON.stringify(g.next())); // { value: undefined, done: true }

const step3 = g.next();
const verified = step3.done === true && step3.value === undefined;
console.log(JSON.stringify({ question: "generator after done", verified }));
process.exit(verified ? 0 : 1);
```

**Result:** ✅ VERIFIED — Calling `.next()` after done returns `{ done: true, value: undefined }`.
No exception thrown.

## Integration with Other Skills

- This skill is the **fallback** for the `js-fact-checking` skill when documentation
  is insufficient.
- The `self-reflection` agent should invoke this skill when adding `node-js-pitfall`
  lessons to copilot-instructions.md and fact-checking is inconclusive.
- The `daily-code-review` agent should invoke this skill when proposing fixes that depend
  on specific runtime behavior.

## Important Notes

- **Node.js >= 22** is the target runtime. Always check `process.version` in output.
- **CommonJS** is the current module system. Use `require()` in simulations unless
  testing ESM-specific behavior.
- **Keep simulations deterministic.** Avoid timing-dependent tests unless that's
  exactly what you're verifying.
- **Never leave simulation files in the repo.** Always clean up.
- **One question per simulation.** Don't test multiple unrelated behaviors in one script.
