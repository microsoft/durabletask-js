# Skill: JS/TS/Node.js Fact-Checking

## When to Use

Use this skill **whenever you are about to commit a claim about JavaScript, TypeScript,
or Node.js runtime behavior** into code, documentation, PR comments, or copilot
instructions. This includes:

- Assertions about how a Node.js API works (EventEmitter, Streams, Timers, etc.)
- Claims about TypeScript type system behavior
- Statements about ECMAScript specification semantics
- Performance characteristics of specific patterns
- Module system behavior (CommonJS vs ESM)
- Async/await, Promise, and event loop semantics

**Trigger conditions:**
- You are writing or reviewing JS/TS code that relies on specific runtime behavior
- You are adding a lesson to `copilot-instructions.md` about a Node.js pitfall
- You are explaining *why* code works a certain way in a PR description or comment
- You are making a claim in the `node-js-pitfall` or `bug-pattern` category
- You are uncertain about how a specific API behaves in edge cases

## How to Execute

### Step 1: Identify the Claim

Clearly state the specific behavioral claim you need to verify. Examples:
- "EventEmitter.emit() discards the return value of async listeners"
- "Promise.all() rejects on the first rejection and ignores remaining results"
- "setTimeout with 0ms delay defers to the next event loop tick, not immediately"
- "Generators cannot be restarted after returning"

### Step 2: Search Official Documentation

Search the following authoritative sources **in priority order**:

1. **Node.js Official Docs** — https://nodejs.org/api/
   - Use `fetch_webpage` tool to retrieve the relevant API page
   - Look for the specific section about the API in question
   - Pay attention to "Stability" markers and version-specific behavior

2. **MDN Web Docs** — https://developer.mozilla.org/en-US/docs/Web/JavaScript/
   - Authoritative for ECMAScript-level behavior (Promises, generators, etc.)
   - Includes browser + Node.js compatibility info

3. **TypeScript Handbook** — https://www.typescriptlang.org/docs/handbook/
   - For TypeScript-specific type system questions
   - Especially generics, conditional types, module resolution

4. **ECMAScript Specification** — https://tc39.es/ecma262/
   - Last resort for spec-level semantics
   - Use for ambiguous cases not clearly documented elsewhere

### Step 3: Extract Evidence

From the documentation, extract:

1. **Direct quote** that confirms or denies the claim
2. **URL** of the specific documentation page
3. **Relevant version info** (is this behavior Node.js version-specific?)
4. **Edge cases** or caveats mentioned in the docs

### Step 4: Render Verdict

Produce a structured verdict:

```
## Fact-Check: <claim summary>

**Verdict:** ✅ CONFIRMED / ❌ REFUTED / ⚠️ PARTIALLY CORRECT / ❓ INCONCLUSIVE

**Source:** <URL to official documentation>

**Evidence:**
> <Direct quote from documentation>

**Caveats:**
- <Any edge cases or version-specific behavior>

**Confidence:** HIGH / MEDIUM / LOW
```

### Step 5: Act on the Verdict

- **CONFIRMED (HIGH confidence):** Proceed with the code change or documentation update.
- **REFUTED:** Correct the claim before proceeding. Document the correct behavior.
- **PARTIALLY CORRECT:** Refine the claim to be precise. Add caveats.
- **INCONCLUSIVE or LOW confidence:** Escalate to the **simulation** skill
  (`.github/skills/simulation/SKILL.md`) to empirically verify the behavior by
  writing and running a minimal reproduction script.

## Examples

### Example 1: Checking EventEmitter async behavior

**Claim:** "EventEmitter.emit() ignores the return value of listeners, so async listeners
cause unhandled promise rejections."

**Search:** Fetch https://nodejs.org/api/events.html

**Evidence found:**
> "The EventEmitter calls all listeners synchronously in the order in which they were
> registered."
> "Using async functions with event handlers is problematic, because it can lead to an
> unhandled rejection in case of a thrown exception."

**Verdict:** ✅ CONFIRMED (HIGH confidence)

### Example 2: Checking generator restart behavior

**Claim:** "A generator function can be called again after it returns done: true to
restart from the beginning."

**Search:** Fetch MDN Generator documentation

**Evidence found:**
> "Calling the next() method with an argument will resume the generator function
> execution..." but the generator object itself cannot be reset. Calling the generator
> function again creates a *new* generator object.

**Verdict:** ⚠️ PARTIALLY CORRECT — The *generator function* can be called again to get
a new iterator, but the existing *generator object* cannot be restarted.

## Important Notes

- **Do NOT rely on Stack Overflow or blog posts** as primary sources. Only use
  official documentation.
- **Do NOT hallucinate documentation quotes.** If you cannot find the relevant docs,
  say so and escalate to the simulation skill.
- **Version matters.** This SDK targets Node.js >= 22. Some APIs behave differently
  in older versions.
- **CommonJS vs ESM matters.** This SDK currently uses CommonJS output. Behavior
  differences between module systems are relevant.
