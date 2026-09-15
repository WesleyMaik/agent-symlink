# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.1 (2026-09-15)

### Documentation & Project Setup

- Update README with global and local installation instructions and CLI quickstart guide.
- Add repository guideline symlinks for supported agent configurations (.amazonq, .continue, .github/copilot-instructions.md, CLAUDE.md, GEMINI.md).

## 0.1.0 (2026-09-15)

### Fixes

- Set the development version to `0.1.0` and share package metadata across the API, CLI, and interactive UI.
- Preserve existing destinations when link creation fails and restore them if replacement fails.
- Reject circular paths, including aliased paths and replacements that contain the source.
- Create relative directory symlinks on Windows and follow source links when detecting directory types.
- Honor working directory, dry-run, and link options throughout interactive flows.
- Align JSON success flags and exit codes, include batch errors per agent, and honor custom skills sources for native agents.
- Build before packing, validate before release, and test Node.js 22 and 24 in CI.

### Features

- Initial development of `@agent-symlink/cli`.
- Core filesystem engine for creating safe and idempotent symbolic links.
- Relative link target resolution by default with POSIX forward slashes.
- Interactive Clack wizard when invoked without arguments.
- Agent presets supporting Claude Code, Gemini, Copilot, Amazon Q, Continue, Cursor, Windsurf, Cline, and Junie.
- Automatic detection and preservation of native `AGENTS.md` support.
- Dedicated skills and rules directory commands.
- Diagnostic inspection with `symlink inspect` and environment checks with `symlink doctor`.
- Safe `symlink unlink` to delete links without modifying underlying source files.
- Cross-platform support for file and directory symlinks on Windows, macOS, and Linux.
