# @agent-symlink/cli

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-blue)](https://www.typescriptlang.org)

Fast, safe, and cross-platform CLI for creating and managing symbolic links between AI agent instruction files, skill directories, rules directories, and configuration files.

---

## Motivation

Modern AI coding agents expect project instructions in varying formats and locations:

```text
AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── .github/copilot-instructions.md
├── .amazonq/rules/AGENTS.md
└── .continue/rules/AGENTS.md
```

Instead of duplicating instruction files and manually synchronizing them across tools, `symlink` allows you to maintain a single canonical source (such as `AGENTS.md`) and project it cleanly into every tool's expected path using relative symbolic links.

---

## Features

- **Direct & Intuitive:** `symlink <source> <target>` links files or directories with automatic detection.
- **Interactive Terminal UI:** Run `symlink` with no arguments for a guided Clack-powered wizard.
- **Data-Driven Agent Presets:** Out-of-the-box presets for Claude Code, Gemini, Copilot, Amazon Q, Continue, Cursor, Windsurf, Cline, and Junie.
- **Relative Links by Default:** Generates portable relative links that do not break across machines, Git checkouts, or CI environments.
- **Cross-Platform Hardening:** Full support for Windows (junctions and symlinks), macOS, and Linux, with normalized POSIX forward slashes in Git.
- **Idempotent & Safe:** Never destroys unlinked files, warns on conflicts unless `--force` is given, and rejects circular links.
- **Built-in Diagnostics:** `symlink inspect` and `symlink doctor` check link health, runtime compatibility, and repository readiness.

---

## Installation

```bash
# Global installation via pnpm
pnpm add -g @agent-symlink/cli

# Or via npm
npm install -g @agent-symlink/cli

# Run directly via npx / pnpx
npx @agent-symlink/cli --help
```

---

## Quick Start

### 1. Interactive Mode

Run `symlink` without arguments in your terminal:

```bash
symlink
```

Select what you want to link (instructions, skills, rules, or agent presets) and follow the interactive prompts.

### 2. Direct Linking

Link your root `AGENTS.md` to Claude Code's expected file:

```bash
symlink AGENTS.md CLAUDE.md
```

Link to a nested directory (the CLI automatically computes the relative path `../AGENTS.md`):

```bash
symlink AGENTS.md .github/copilot-instructions.md
```

Link a shared skills directory:

```bash
symlink .agents/skills .claude/skills
```

### 3. Agent Presets

Apply a single agent preset:

```bash
symlink preset claude
symlink preset gemini
symlink preset copilot
```

Apply all compatible presets at once:

```bash
symlink preset all
```

> **Note:** Tools that natively consume root `AGENTS.md` (such as Cursor, Windsurf, Cline, Zed, Junie, and Codex) will not receive redundant links.

---

## Agent Compatibility Matrix

| Agent / Tool           | Native Instruction Format         | Root `AGENTS.md` Support |                  Symlink Required                   |
| :--------------------- | :-------------------------------- | :----------------------: | :-------------------------------------------------: |
| **OpenAI Codex**       | `AGENTS.md`                       |           Yes            |                         No                          |
| **Cursor**             | `AGENTS.md` or `.cursor/rules/`   |           Yes            |                         No                          |
| **Windsurf**           | `AGENTS.md` or `.windsurf/rules/` |           Yes            |                         No                          |
| **Cline**              | `AGENTS.md` or `.clinerules/`     |           Yes            |                         No                          |
| **Zed Agent**          | `AGENTS.md`                       |           Yes            |                         No                          |
| **JetBrains Junie**    | `AGENTS.md`                       |           Yes            |                         No                          |
| **Claude Code**        | `CLAUDE.md`                       |            No            |                **Yes** (`CLAUDE.md`)                |
| **Gemini CLI**         | `GEMINI.md`                       |       Configurable       |            **Recommended** (`GEMINI.md`)            |
| **GitHub Copilot**     | `.github/copilot-instructions.md` |    Surface dependent     | **Recommended** (`.github/copilot-instructions.md`) |
| **Amazon Q Developer** | `.amazonq/rules/*.md`             |            No            |    **Recommended** (`.amazonq/rules/AGENTS.md`)     |
| **Continue**           | `.continue/rules/*.md`            |            No            |    **Recommended** (`.continue/rules/AGENTS.md`)    |

---

## Skills and Rules Linking

### Skills Directories

The recommended cross-agent canonical skills location is `.agents/skills/`.

```bash
# Link to Claude Code skills
symlink skills claude

# Link to all non-native agents with skills directories
symlink skills all

# Custom directory linking
symlink skills .my-custom-skills/
```

### Rules Directories

The recommended canonical rules location is `.agent-config/rules/`.

```bash
# Link to Claude rules
symlink rules claude

# Link to Cursor rules
symlink rules cursor

# Link to all agents with rules support
symlink rules all
```

---

## Management Commands

### Inspect Links

Inspect whether a file is a symlink, verify its destination, and check if it is broken:

```bash
symlink inspect CLAUDE.md
```

JSON output:

```bash
symlink inspect CLAUDE.md --json
```

### Safely Unlink

Remove a symbolic link without ever deleting or modifying the source file:

```bash
symlink unlink CLAUDE.md
```

### Environment Doctor

Check runtime version, operating system symlink capabilities, Git repository status, and link health:

```bash
symlink doctor
```

---

## Command Reference

| Command                          | Description                                                         |
| :------------------------------- | :------------------------------------------------------------------ |
| `symlink [source] [target]`      | Create a symbolic link (or launch interactive mode if no arguments) |
| `symlink preset <agent\|all>`    | Apply presets for specific agents or all compatible agents          |
| `symlink skills <target\|agent>` | Link canonical skills (`.agents/skills`) to target                  |
| `symlink rules <target\|agent>`  | Link canonical rules (`.agent-config/rules`) to target              |
| `symlink inspect <target>`       | Inspect target path and diagnose symlink validity                   |
| `symlink unlink <target>`        | Safely remove symbolic link without touching source                 |
| `symlink doctor`                 | Run system and environment health checks                            |

### Global Flags

- `-f, --force`: Replace an existing target file or mismatched symlink.
- `-d, --dry-run`: Preview actions without modifying the filesystem.
- `-a, --absolute`: Create absolute symlink instead of default relative symlink.
- `--allow-dangling`: Allow linking to a source path that does not yet exist.
- `--cwd <path>`: Resolve paths relative to a specified directory.
- `--json`: Output machine-readable JSON format.
- `--verbose`: Display detailed path resolution and diagnostics.
- `-v, --version`: Output the current version.
- `-h, --help`: Display help.

---

## Windows Notes

Windows is a first-class supported platform.

To create symbolic links on Windows without administrator prompts:

1. Enable **Developer Mode** in Windows Settings (`Settings > System > For developers > Developer Mode`).
2. Alternatively, run in an elevated terminal with `SeCreateSymbolicLinkPrivilege`.

All relative links generated by `symlink` use POSIX forward slashes (`/`), ensuring seamless Git interoperability between Windows and Unix systems.

---

## Safety Behavior

1. **Source Validation:** By default, non-existent sources are rejected unless `--allow-dangling` is supplied.
2. **Idempotency:** Running the same command multiple times succeeds with a no-op when the link already exists.
3. **Overwrite Protection:** Regular files or conflicting links are never overwritten without `--force` (or explicit confirmation in interactive mode).
4. **Circular Reference Prevention:** Creating links where source and target are identical or circular is strictly rejected.
5. **Source Preservation:** `unlink` only deletes the symbolic link, never the underlying file.

---

## Development Setup

```bash
# Clone repository
git clone https://github.com/WesleyMaik/agent-symlink.git
cd symlink

# Install dependencies
pnpm install

# Compile TypeScript
pnpm build

# Run Vitest test suite
pnpm test

# Run type checking
pnpm typecheck
```

---

## Contributing

We welcome contributions! Please review [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for details on code style, commit conventions, and release procedures.

---

## License

[MIT](./LICENSE) © 2026 Wesley Maik
