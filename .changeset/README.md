# Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) for version management and automated publishing.

## Adding a Changeset

When preparing a pull request with user-facing changes:

```bash
pnpm changeset
```

Select the affected packages, the SemVer bump type (`patch`, `minor`, `major`), and provide a brief summary of the change.
