# Collaborating on this repo

How we work in the same repo without stepping on each other: short branches and
Pull Requests.

## Why can't I push to `main` anymore?

`main` is now **protected**: changes have to go through a short-lived branch and
a **Pull Request (PR)** instead of pushing straight to `main`. This keeps
everyone's work from colliding. It's a quick extra step, not a big deal — you can
approve and merge your own PR.

## The everyday loop (VS Code — the easy way)

Do this in VS Code using the **Source Control** panel (the branch icon on the
left sidebar). You barely need the command line.

1. **Start from the latest `main`.** Bottom-left status bar shows your current
   branch. Click it, pick `main`, then click the little sync/refresh icon to pull
   the newest code.
2. **Make a new branch.** Click the branch name in the status bar again → **"Create
   new branch..."** → name it something short, like `add-login-button` or
   `yourname/fix-typo`.
3. **Make your changes.** Edit files as normal.
4. **Commit.** Open **Source Control**, type a short message (e.g. "Add login
   button"), and click the **✓ Commit** button.
5. **Publish / push.** Click **"Publish Branch"** (first time) or the sync icon.
   This puts your branch on GitHub.
6. **Open a Pull Request.** Use the **GitHub Pull Requests** panel (the extension
   we recommend) → **"Create Pull Request"**. Give it a title and click create.
7. **Merge it.** On the PR, click **"Merge Pull Request"**. (No one else has to
   approve — you can merge your own.)
8. **Go back to `main` and pull.** Switch your branch back to `main` (status bar)
   and click sync. Now you're up to date and ready for the next thing.

That's the whole loop: **branch → change → commit → publish → PR → merge → back to
main → pull.**

## The same loop with git commands (fallback)

If VS Code isn't cooperating, these do the same thing:

```bash
git checkout main
git pull                              # get the latest main
git checkout -b add-login-button      # make + switch to a new branch
# ...edit files...
git add .
git commit -m "Add login button"
git push -u origin add-login-button   # publish the branch
# open the PR from the link git prints, or in the GitHub website / VS Code
# after merging:
git checkout main
git pull
```

## When two of you edit the same file (merge conflicts)

A "merge conflict" just means two people changed the same lines, and git wants a
human to pick what stays. Nothing is broken or lost.

If your PR (or a `git pull`) reports a conflict:

1. VS Code shows the conflicted file(s) in **Source Control** and highlights the
   clashing lines with buttons above them.
2. For each conflict you'll see **"Accept Current Change"**, **"Accept Incoming
   Change"**, or **"Accept Both Changes"**. Click the one that gives the correct
   result (sometimes you'll hand-edit to combine both).
3. Save the file, then **commit** again in Source Control. That resolves it.
4. If you're stuck, ask the lead — resolving a conflict wrong is easy to undo.

## Quick tips

- Keep branches small and short-lived — merge often.
- One task = one branch = one PR.
- Always start a new branch from an up-to-date `main`.
