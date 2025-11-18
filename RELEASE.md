# Release Process

This document explains how to create a release that can be installed via npm from GitHub.

## Quick Release (Automated)

Use the release script:

```bash
./scripts/release.sh
```

The script will:
1. Build the npm package using `deno task build`
2. Force-add the built files (they're normally gitignored)
3. Commit the built files
4. Create/update the git tag for the version in `.version`
5. Optionally push the tag to GitHub

## Manual Release Process

If you prefer to do it manually:

### 1. Build the npm package

```bash
deno task build
```

This creates the `npm/` directory with built JavaScript files.

### 2. Stage the built files

Since `npm/` is in `.gitignore`, you need to force-add it:

```bash
git add -f npm/
```

### 3. Commit the built files

```bash
git commit -m "chore: add built npm files for v1.9.0"
```

### 4. Create/update the tag

```bash
git tag -f v1.9.0 -m "Release v1.9.0"
```

### 5. Push the tag

```bash
git push origin v1.9.0
```

Or if the tag already exists remotely and you need to update it:

```bash
git push -f origin v1.9.0
```

## Installing from GitHub

Once the tag is pushed, the package can be installed via:

```json
{
  "dependencies": {
    "node-x12": "github:muthuka/node-x12#v1.9.0"
  }
}
```

Or using npm/yarn/pnpm:

```bash
npm install github:muthuka/node-x12#v1.9.0
```

## Notes

- The `npm/` directory is gitignored in the main branch to keep it clean
- Built files are only committed when creating a release tag
- The `package.json` in the root points to the built files in `npm/`
- Make sure the version in `.version` matches the tag version

