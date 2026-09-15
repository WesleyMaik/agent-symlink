# Contributing to Symlink CLI

Thank you for your interest in contributing to Symlink CLI! We are committed to fostering an open, welcoming, and high-quality open-source community.

---

## Development Prerequisites

- **Node.js:** `>= 22` (CI validates on Node 24 LTS)
- **TypeScript:** `>= 7.0`
- **Package Manager:** `pnpm >= 10.0`
- **Git:** Latest version

---

## Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/WesleyMaik/agent-symlink.git
   cd symlink
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Build the project:

   ```bash
   pnpm build
   ```

4. Run tests:
   ```bash
   pnpm test
   ```

---

## Code Quality Standards

- **Strict TypeScript:** Never use `any`. Always use explicit types, generics, or `unknown`.
- **Documentation:** Use strictly JSDoc/TSDoc format exclusively for public APIs and complex architecture. Avoid standard trivial comments explaining what code does.
- **Language:** All code, identifiers, tests, logs, and commit messages must be in English.
- **No Em Dashes:** Do not use em dashes in generated text or code comments. Use commas, periods, colons, or parentheses.
- **Architecture:** Keep the core engine (`src/core/`) strictly decoupled from terminal libraries (`commander`, `@clack/prompts`).

---

## Commit Message Conventions

We use Conventional Commits. Commit messages must contain only the subject line, with no commit body:

```text
feat: add agent compatibility presets
fix: harden cross-platform symlink handling
docs: add open source contribution guides
test: add unit coverage for path normalization
chore: update build dependencies
```

---

## How to Add a New Agent Preset

To add support for a new AI coding agent:

1. Open `src/registry/agents.ts`.
2. Add a new `AgentPreset` entry to `AGENT_REGISTRY`:
   ```ts
   {
     id: 'my-agent',
     name: 'My Agent Name',
     instructions: {
       target: '.my-agent/instructions.md',
       nativeAgentsMd: false // Set to true if agent reads root AGENTS.md directly
     },
     skills: {
       target: '.my-agent/skills'
     },
     rules: {
       target: '.my-agent/rules'
     }
   }
   ```
3. Add unit test assertions in `tests/unit/registry.test.ts`.
4. Update the compatibility table in `README.md`.
5. Run `pnpm test` and `pnpm typecheck`.

---

## Changesets and Releases

For any user-visible changes (features, bug fixes, breaking changes), create a changeset:

```bash
pnpm changeset
```

Follow the interactive prompts to select the bump type (`patch`, `minor`, `major`) and describe your change.

---

## Submitting Pull Requests

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Ensure all checks pass:
   ```bash
   pnpm typecheck
   pnpm test
   pnpm build
   ```
3. Open a Pull Request on GitHub using the provided Pull Request Template.
