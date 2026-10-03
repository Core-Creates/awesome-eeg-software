# Contributing

Thanks for helping keep this list useful and accurate.

## What belongs here

- **Open-source** software (OSI-approved license, or a public repository with source code) for reading, processing, analyzing, decoding, streaming, or visualizing EEG.
- Closely related tools (MEG, iEEG, fNIRS, ECG) only when they are commonly used in EEG pipelines.
- Public EEG datasets and data standards, in the [Data standards and datasets](README.md#data-standards-and-datasets) section.

Out of scope: closed-source or commercial-only software, papers without code, and forks without meaningful independent development.

## Adding an entry

1. Put it in the most specific section. If it fits several, choose the one that matches its main purpose.
2. Use the existing table format:

   ```markdown
   | [Name](https://link-to-repo) | Language | SPDX-License | One-sentence description ending with a period. |
   ```

3. Use the license from the project's **actual license file**, given as an [SPDX identifier](https://spdx.org/licenses/). If the repository has no license file, write `*No license file*`.
4. If the last commit is more than 18 months old, add an *Unmaintained since YYYY* or *Last push YYYY* note.
5. Link to the canonical source repository. That is GitHub, GitLab, or the project's own forge, not a personal fork.
6. Keep descriptions neutral and factual. Don't use marketing language.

## Updating entries

Corrections are always welcome, especially license changes, moved repositories, and projects that have been archived. Please update the **Last verified** date in the README when you re-check entries.

## Link checking

A GitHub Actions workflow runs [lychee](https://github.com/lycheeverse/lychee) on every pull request and weekly. If a URL is known to block automated checkers, add it to `.lycheeignore` with a comment explaining why.
