## 🔍 Running CI Checks Locally

Before opening a PR to `dev`, run these checks:

```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build
npm run build

# Run tests
npm test
```