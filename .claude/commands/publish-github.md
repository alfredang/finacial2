---
description: Security-scan the project, then push it to GitHub with README, About section, Pages deploy and live link
argument-hint: <owner/repo or GitHub URL> [public|private]
allowed-tools: Bash(git:*), Bash(gh:*), Bash(curl:*), Bash(grep:*), Bash(find:*), Bash(gitleaks:*), Bash(sleep:*), Bash(cp:*), Bash(mkdir:*), Bash(python:*), mcp__playwright__browser_navigate, mcp__playwright__browser_resize, mcp__playwright__browser_wait_for, mcp__playwright__browser_evaluate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_close, Read, Edit, Write, Grep, Glob
---

Publish this project to GitHub. Repo info from the user: `$ARGUMENTS`

Work through the steps in order. Do not skip the security scan, and do not push anything if it finds a problem.

## 0. Resolve the target repo

- Accept `owner/repo`, `https://github.com/owner/repo(.git)` or `git@github.com:owner/repo.git`. Normalise to `OWNER` and `REPO`.
- If `$ARGUMENTS` is empty, fall back to the existing `origin` remote (`git remote get-url origin`). If there is no remote either, ask the user for the repo and stop.
- Visibility defaults to `public`. GitHub Pages on a private repo needs a paid plan, so warn the user if they chose `private`.
- Check `gh auth status`. If not logged in, tell the user to run `gh auth login` and stop.
- Check whether the repo exists: `gh repo view OWNER/REPO --json name,visibility,defaultBranchRef`.
- The Pages URL is `https://OWNER.github.io/REPO/` (lower-case owner). If REPO is `OWNER.github.io`, it is `https://OWNER.github.io/`.

## 1. Security scan (gate before anything goes online)

Scan everything that would be pushed: tracked files, untracked files that are not ignored, **and the full git history** (history is pushed too).

```bash
git ls-files; git ls-files --others --exclude-standard     # files that would be published
```

1. **Secret scanner.** If `gitleaks` is installed, run `gitleaks detect --source . --redact -v` (covers history). Otherwise do the manual checks below.
2. **Sensitive files.** Flag any of these in the file list or in `git log --all --name-only`:
   `.env*` (except `.env.example`), `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `id_ed25519*`, `*.keystore`, `credentials*.json`, `service-account*.json`, `*.sqlite`, `*.db`, `.npmrc`, `.pypirc`, `*.tfstate`, `.claude/settings.local.json`.
3. **Secret patterns.** Grep the working tree (`git grep -nIE`) and history (`git log -p --all | grep -nE`) for:
   - AWS `AKIA[0-9A-Z]{16}` · GitHub `gh[pousr]_[A-Za-z0-9]{36,}` and `github_pat_[A-Za-z0-9_]{20,}`
   - OpenAI/Anthropic `sk-(proj-|ant-)?[A-Za-z0-9_-]{20,}` · Google `AIza[0-9A-Za-z_-]{35}` · Slack `xox[abprs]-[A-Za-z0-9-]{10,}`
   - Stripe `(sk|rk)_live_[A-Za-z0-9]{20,}` · `-----BEGIN [A-Z ]*PRIVATE KEY-----` · JWTs `eyJ[A-Za-z0-9_-]{10,}\.eyJ`
   - Credentials in URLs `[a-z]+://[^/\s:@]+:[^/\s@]+@`
   - Assignments like `(password|passwd|secret|api[_-]?key|token|client_secret)\s*[:=]\s*['"][^'"]{6,}`
4. **Personal data.** In this site every email must end in `.example` and the phone number is the placeholder `+65 6123 4567` (see README "Placeholder content"). Flag any other real-looking emails, phone numbers, NRIC/SSN-style IDs or street addresses. Also note the commit author emails (`git log --format='%ae' | sort -u`) that will become public, and suggest a `users.noreply.github.com` address if a personal one is used.
5. **Large files.** Flag anything over 50 MB (`find . -path ./.git -prune -o -type f -size +50M -print`).

Report each finding as a table: file:line, what it is, severity, fix. Treat false positives sensibly (for example a placeholder in docs) and say why you dismissed them.

If there are real findings, **stop and do not push**:
- Working-tree only: remove or redact the value, add the file pattern to `.gitignore`, and tell the user to rotate the secret.
- Already in history: explain that the secret must be rotated and history rewritten (`git filter-repo`), and ask the user before rewriting anything.

Make sure `.gitignore` covers the sensitive patterns above; add any that are missing.

## 2. Screenshot (Playwright MCP)

Capture a fresh homepage screenshot with the Playwright MCP server (configured in `.mcp.json`) and save it as `docs/screenshot.png`.

1. Serve the site locally so fonts and images load the same way as on Pages: run `python -m http.server 8765` in the background from the project root.
2. `browser_resize` to 1440 x 900, then `browser_navigate` to `http://localhost:8765/index.html`.
3. Make the shot deterministic: `browser_evaluate` to add `.visible` to every `.fade-in` element and set each `.stat-number` to its final value (`data-prefix` + `data-target` formatted with thousands separators + `data-suffix`). Then `browser_wait_for` about 2 seconds so the hero image and fonts finish loading.
4. `browser_take_screenshot` with `filename: "docs/screenshot.png"`, `type: "png"`, `scale: "css"` (viewport only, not full page). Relative filenames resolve against the project root, so it overwrites the existing screenshot in place.
5. `browser_close` and stop the local server.
6. Read the PNG to check it shows the header and hero correctly (no blank image, no cookie or error overlay). If Playwright is unavailable, keep the existing screenshot and say so in the report.

Stage `docs/screenshot.png` with the other files in step 5.

## 3. README

Create `README.md` if missing, otherwise edit it in place. Keep existing content and tone; only add or correct what is missing or stale.

It must contain:
- Project name and a one-paragraph description (read `index.html` and `CLAUDE.md` for what the site actually does)
- `**Live site:** <Pages URL>` near the top, matching the URL from step 0 (fix it if the repo name changed)
- The screenshot `docs/screenshot.png` from step 2, embedded below the live link with alt text that describes what it actually shows
- Features, a placeholder-content note, run-locally instructions, the JS syntax-check command, a Deployment section pointing at `.github/workflows/pages.yml`, and the contributing conventions
- A link to `CLAUDE.md`

## 4. GitHub Pages workflow

Create or update `.github/workflows/pages.yml` so it deploys the repo root on every push to `main` and on `workflow_dispatch`, using the current major versions of `actions/checkout`, `actions/configure-pages` (with `enablement: true`), `actions/upload-pages-artifact` (`path: .`) and `actions/deploy-pages`, with `permissions: contents: read, pages: write, id-token: write` and a `pages` concurrency group. Leave the file alone if it already matches.

## 5. Commit and push

- Make sure the branch is `main` (`git branch -M main` if needed).
- If the repo does not exist: `gh repo create OWNER/REPO --<visibility> --source . --remote origin`.
- If it exists: set `origin` to `https://github.com/OWNER/REPO.git` (`git remote add` or `git remote set-url`).
- Stage only the intended files by name (never `git add -A` blindly), re-run the step 1 pattern grep on `git diff --cached`, then commit with a clear message.
- `git push -u origin main`. Never force-push; if the push is rejected, show the user why and ask how to proceed.

## 6. Enable Pages and confirm the deploy

- Enable Pages with the Actions source:
  `gh api -X POST repos/OWNER/REPO/pages -f build_type=workflow`, or if it already exists
  `gh api -X PUT repos/OWNER/REPO/pages -f build_type=workflow`.
- Find the run for the push (`gh run list --workflow pages.yml --limit 1`) and `gh run watch <id> --exit-status`. If the run failed before Pages was enabled, re-run it with `gh run rerun <id>`.
- If the run fails, show `gh run view <id> --log-failed` and stop.
- Confirm the site responds: `curl -sI <Pages URL>` should return 200 (the CDN can take a minute; retry a few times).

## 7. About section

Update the repo's About section:

```bash
gh repo edit OWNER/REPO \
  --description "<one-line summary of the site>" \
  --homepage "<Pages URL>" \
  --add-topic html --add-topic css --add-topic javascript --add-topic github-pages --add-topic <2-3 topics specific to this project>
```

Verify with `gh repo view OWNER/REPO --json description,homepageUrl,repositoryTopics`.

## 8. Report

Finish with a short summary:
- Security scan result (clean, or what was found and fixed/dismissed)
- Repo URL and live Pages URL
- What changed in README, workflow and About section
- Anything the user still has to do by hand (rotate a secret, change Pages source in Settings, etc.)
