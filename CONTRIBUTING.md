## 🔒 Branch Protection Rules!!

### `main` Branch
- ✅ Require pull request before merging
- ✅ Require at least 2 approvals
- ✅ Require status checks to pass (CI workflow)
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ❌ Do not allow force pushes
- ❌ Do not allow deletions

### `dev` Branch
- ✅ Require pull request before merging
- ✅ Require at least 1 approval
- ✅ Require status checks to pass (CI workflow)
- ✅ Require branches to be up to date before merging
- ❌ Do not allow force pushes
- ❌ Do not allow deletions

### How to Configure (Admin Only)
1. Go to **Settings → Branches** in the GitHub repository.
2. Click **Add branch protection rule**.
3. Enter the branch name pattern (e.g., `main` or `dev`).
4. Enable the rules listed above.
5. Click **Save changes**.
6. Repeat for both `main` and `dev`.
7. Under **Settings → General → Default branch**, change the default to `dev`.

## 🌿 Branching & Pull Request Workflow

### Default Branch: `dev`
All active development happens on the `dev` branch. The `main` branch is reserved for stable, production-ready releases only.

### How to Contribute

1. **Fork** the repository (external contributors) or create a branch (team).
2. **Always branch off `dev`**:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**, following our code style guidelines.
4. **Commit using [Conventional Commits](https://www.conventionalcommits.org/)**:
   ```bash
   git commit -m "feat(scope): add new feature description"
   ```
5. **Push to your fork/branch**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request targeting `dev`** (NOT `main`).
7. **Ensure all CI checks pass** (automated via GitHub Actions).
8. **Address review feedback** if requested.
9. **Merge** happens after maintainer approval.

> ⚠️ **IMPORTANT**: Pull Requests targeting `main` will be **closed automatically**.
> Always target `dev`.

### Branch Naming Convention
| Prefix | Purpose | Example |
|---|---|---|
| `feature/` | New features | `feature/add-invoice-upload` |
| `fix/` | Bug fixes | `fix/jwt-expiration-bug` |
| `docs/` | Documentation | `docs/update-api-reference` |
| `test/` | Test additions | `test/add-escrow-unit-tests` |
| `refactor/` | Code refactoring | `refactor/simplify-auth-flow` |
| `chore/` | Maintenance | `chore/update-dependencies` |

## ✅ CI Status Checks

Every Pull Request to `dev` automatically triggers our CI pipeline via GitHub Actions. Your PR must pass ALL checks before it can be merged:

- **Lint / Format**: Code formatting and linting rules.
- **Type Check**: Static type analysis (TypeScript / Rust Clippy).
- **Tests**: All unit and integration tests must pass.
- **Build**: The project must compile/build successfully.

## 🚀 Release Process

Releases follow a controlled merge from `dev` to `main`:

1. A maintainer creates a release PR: `dev` → `main`.
2. The release PR includes a changelog and version bump.
3. Two maintainer approvals are required.
4. All CI checks must pass.
5. After merge, a GitHub Release is created with a tag.
6. `dev` is rebased on `main` to stay in sync.

Contributors do NOT need to worry about releases. Focus on getting your PRs merged into `dev`.
