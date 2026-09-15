# Symlink CLI - Agent Guidelines

Guidelines for AI coding agents working on the Symlink CLI codebase.

## Repository Mission

Provide an open-source CLI written in TypeScript for creating and managing symbolic links between AI agent instruction files, skill directories, and rules directories across different coding tools.

## Architecture Guidelines

- Follow SOLID, DRY, KISS, and YAGNI principles.
- Decouple the core engine (`src/core/`) completely from terminal UI libraries (`commander`, `@clack/prompts`).
- Keep agent conventions centralized in `src/registry/agents.ts` rather than hardcoding paths throughout CLI commands.
- Never use `any` in TypeScript. Rely on strict types, generics, and exhaustive union checks.
- Document public APIs using JSDoc/TSDoc. Avoid trivial standard comments.
- Keep all code, logs, comments, and identifiers strictly in English.

## Cross-Platform Rules

- Ensure tests and implementation work transparently on Linux, macOS, and Windows.
- Always normalize relative symlink paths using forward slashes (`/`) so that symlinks committed to version control do not break across operating systems.
- Use `node:fs/promises` rather than shelling out to OS binaries like `ln -s`.
