# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-09-14)

### Features

- Initial release of `@agent-symlink/cli`.
- Core filesystem engine for creating safe and idempotent symbolic links.
- Relative link target resolution by default with POSIX forward slashes.
- Interactive Clack wizard when invoked without arguments.
- Agent presets supporting Claude Code, Gemini, Copilot, Amazon Q, Continue, Cursor, Windsurf, Cline, and Junie.
- Automatic detection and preservation of native `AGENTS.md` support.
- Dedicated skills and rules directory commands.
- Diagnostic inspection with `symlink inspect` and environment checks with `symlink doctor`.
- Safe `symlink unlink` to delete links without modifying underlying source files.
- Cross-platform hardening for Windows (junctions and symlinks), macOS, and Linux.
