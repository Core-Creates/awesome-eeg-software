# Contributing

Thanks for helping keep this list useful and accurate.

## The inclusion bar

Every **software** entry must contain **meaningful code**: real source, not just a README, notebooks, bundled data, or a thin wrapper around another listed project. It must also be at least one of:

- **Novel:** it provides a capability that no other entry provides.
- **Exceptionally well engineered:** tests, CI, documentation, packaging/releases, and active maintenance.

Not accepted:

- Forks.
- Awesome-style link lists.
- Toy or student projects.
- Paper-code dumps whose method is already implemented in a listed library. For example, EEG foundation models that Braindecode ships.
- Abandoned repositories when a maintained alternative is already listed.

**Datasets** (scalp EEG, ECoG/sEEG, MEG, fNIRS, HEG, PSG, and human single-neuron or microelectrode recordings) are welcome. They go in the [Datasets (data, not code)](README.md#datasets-data-not-code) section and must link to an official source. They are exempt from the code bar.

## Adding a software entry

1. Put it in the most specific section. If it fits several, choose the one that matches its main purpose.
2. Use the existing table format:

   ```markdown
   | [Name](https://link-to-repo) | Language | SPDX-License | One-sentence description ending with a period. |
   ```

3. Use the license from the project's **actual license file**, given as an [SPDX identifier](https://spdx.org/licenses/). If the repository has no license file, write `*No license file*`.
4. Add an italic note for any specific shortfall: no tests or CI, no commits in 12+ months, overlap with another entry, or mostly non-code content.
5. Link to the canonical source repository. That is GitHub, GitLab, or the project's own forge, not a personal fork.
6. Keep descriptions neutral and factual. Don't use marketing language.
7. In your PR, include the evidence: source size by language, tests and CI present, commits in the last 12 months, and latest release.

## Adding a dataset

Use the dataset table format: name and official link, modality, access model (open / free registration / credentialed), and a one-sentence description. If there is a companion code repository, mention it in the description.

## Updating entries

Corrections are always welcome, especially license changes, moved repositories, and projects that have been archived. Please update the **Last verified** date in the README when you re-check entries.

## Link checking

A GitHub Actions workflow runs [lychee](https://github.com/lycheeverse/lychee) on every pull request and weekly. If a URL is known to block automated checkers, add it to `.lycheeignore` with a comment explaining why.
