# Ledger

A small personal finance tracker. Money in, money out, who spent it,
who it was for, and net worth. One HTML file, works offline, optional
cloud sync through your own Google Sheet.

---

## Put it online (GitHub Pages) — about 5 minutes

You are reading this inside your new repository. To turn it into a live app:

1. On GitHub, open this repository → **Settings** (top tab).
2. Left menu → **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Branch: **main**, folder: **/ (root)** → **Save**.
5. Wait 1–2 minutes, then refresh the Pages screen. It shows a link like
   `https://YOURNAME.github.io/ledger/`.
6. Open that link on your phone → Chrome menu **⋮ → Add to Home screen**.
   It now launches like a real app.

That `https://…github.io/…` address is what makes cloud sync work — an app
opened from Downloads (a `file://` or `content://` address) cannot reach Google.

---

## Load your data

1. Open the app → **Settings → Restore from a backup**.
2. Pick your `ledger-backup-from-ET.json` file.
3. Then **Settings → Accounts → Bank** and set the real starting balance so
   today's figure matches your bank.
4. Add your gold under **Own vs owe** if your gold loans are secured against it,
   otherwise net worth only sees the debt.

---

## Turn on cloud sync (optional)

Full step-by-step is in **`ledger-sync.gs`** (read the comment block at the top).
Short version:

1. Go to **script.google.com** → New project.
2. Delete the sample, paste in **all of `ledger-sync.gs`**, save.
   (This is the file that starts with `/**`, not the one that starts with `{`.)
3. **Deploy → New deployment → Web app**, Execute as **Me**,
   Who has access **Anyone** → Deploy → authorise.
4. Copy the web-app URL ending in `/exec`.
5. Test it: open that URL in a browser. You should see `{"ok":true,...}`.
6. In the app → **Settings → Cloud sync** → paste the URL → **Save link**.
7. Do the same paste on any other phone. Same app link, same sync link.

The `/exec` link is a password to your finances. Keep it private; only share it
with your own other devices.

---

## Updating the app later

Replace `index.html` in this repository with a newer version and commit.
GitHub Pages redeploys in a minute. Your data lives in the browser and in your
Google Sheet, so updating the file does not touch it.
