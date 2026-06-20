# How to Back Up the Database 💾

This guide explains how to save a complete copy of the Uggalla Oil Mills
database onto your computer, so nothing is ever lost. It is written for
**beginners** — just follow the steps in order.

> **What is a backup?**
> A backup is a *photocopy* of everything in the database — every order, every
> customer, every product, every setting — saved as a single file on your
> computer. If anything ever goes wrong (a mistake, a bug, a problem at
> Supabase), you can use this file to bring everything back.

> **Do it once a week.** Each backup is a snapshot of that moment. A weekly
> backup means the most you could ever lose is one week of new orders.

---

## What you get

In the project folder there are these backup files:

| File | What it is |
|---|---|
| `backup-db.cmd` | **Windows** — double-click this to make a backup |
| `backup-db.command` | **Mac** — double-click this to make a backup |
| `backup-db.ps1` | the real script the Windows file runs (don't touch) |
| `.backup-env.example` | a template for your connection string |
| `backups/` | the folder where your backup files are saved (created automatically) |

Backups are named like `uggalla-2026-06-20.dump` (the date they were made).
Backups older than **8 weeks** are deleted automatically so the folder stays tidy.

---

# PART 1 — One-time setup (do this only once)

You set this up **once**. After that, making a backup is just a double-click.

There are two small setup steps:
**(A)** install the backup tool, and **(B)** create your connection-string file.

---

## STEP A — Install the backup tool (`pg_dump`)

`pg_dump` is the free tool that actually copies the database. It comes inside
**PostgreSQL**. You only need to install it once.

### 🪟 On Windows

1. Open the **Microsoft Store** app named **"Terminal"** (or "PowerShell"), OR
   the Start menu → type **PowerShell** → open it.
2. Copy-paste this line and press **Enter**:
   ```powershell
   winget install PostgreSQL.PostgreSQL.17
   ```
3. Wait for it to finish (it downloads and installs). Click **Yes** if Windows
   asks for permission.
4. **Close and re-open** PowerShell so it notices the new tool.
5. Check it worked — paste this and press Enter:
   ```powershell
   pg_dump --version
   ```
   If you see something like `pg_dump (PostgreSQL) 17.x`, you're done. ✅

> If `winget` is not found, download the installer instead from
> <https://www.postgresql.org/download/windows/> → "Download the installer".
> During install you can untick "pgAdmin" and "Stack Builder" — you only need
> the **Command Line Tools**. Keep clicking Next, then Finish.

### 🍎 On Mac

1. Open the **Terminal** app (press `Cmd + Space`, type "Terminal", Enter).
2. If you don't have Homebrew yet, install it (paste, press Enter, follow prompts):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Install the tool:
   ```bash
   brew install libpq
   brew link --force libpq
   ```
4. Check it worked:
   ```bash
   pg_dump --version
   ```
   If you see a version number, you're done. ✅

---

## STEP B — Create your connection-string file

The script needs to know *how to reach* your database. That address (with the
password) goes into a file called **`.backup-env`**.

1. **Get the connection string from Supabase:**
   - Go to your project at <https://supabase.com> and log in.
   - Click the **"Connect"** button near the top of the page.
   - A window opens with a few boxes. Find the box titled
     **"Direct - Connection String"** and click it.
   - Now a **"Connection method"** chooser appears with three options:
     **Direct**, **Transaction pooler**, and **Session pooler**.
     👉 Choose **Session pooler**.
   - The connection string updates to show the Session pooler one. Copy it.

     *(Quick sanity check — the Session pooler string contains
     **`pooler.supabase.com`** and ends in **`:5432`**. If it ends in `:6543`
     you accidentally picked Transaction pooler; switch back to Session.)*

   - The line you copied (the **URI**) looks like:
     ```
     postgresql://postgres.abcd1234:[YOUR-PASSWORD]@aws-0-xxxx.pooler.supabase.com:5432/postgres
     ```
   - Replace `[YOUR-PASSWORD]` with your real **database password**.
     *(This is the database password you set when creating the project — not
     your Supabase login password. If you forgot it: Supabase → Project Settings
     → Database → "Reset database password".)*

   > **Why Session pooler and not "Direct"?** Supabase's own docs suggest Direct
   > for `pg_dump`, but Direct needs an IPv6 network — most home internet is
   > IPv4-only, so Direct often won't connect from home. The **Session pooler**
   > works on normal home internet *and* with `pg_dump`. (Only the *Transaction*
   > pooler — port 6543 — is the one to avoid for backups.)

2. **Make the file:**
   - In the project folder, find **`.backup-env.example`**.
   - Make a **copy** of it, and rename the copy to exactly **`.backup-env`**
     (remove the `.example` part).
   - Open `.backup-env` in Notepad (Windows) or TextEdit (Mac).
   - Paste your real connection string after `SUPABASE_DB_URL=`, replacing the
     placeholder line. Save the file.

> 🔒 **Keep this file private.** It contains your database password. It is
> already set to never be uploaded to git/GitHub. Don't email it or share it.

✅ **Setup is finished.** You never have to do Part 1 again.

---

# PART 2 — Making a backup (the weekly habit)

This is all you do from now on:

### 🪟 Windows
1. Open the project folder.
2. **Double-click `backup-db.cmd`.**
3. A black window opens and says "Backing up the database...". Wait a moment.
4. When it says **"SUCCESS!"**, press **Enter** to close it.

### 🍎 Mac
1. Open the project folder in Finder.
2. **Double-click `backup-db.command`.**
   - *First time only:* if Mac says it "cannot be opened", right-click the file
     → **Open** → **Open** again. (Or run `chmod +x backup-db.command` once in
     Terminal.)
3. Wait for **"SUCCESS!"**, then press **Enter** to close.

Your new backup is now inside the **`backups`** folder, named with today's date.

> 🌟 **One more safety habit:** every few weeks, copy the whole `backups` folder
> to **Google Drive** (or a USB stick). That way, even if this computer dies,
> your backups are safe somewhere else.

---

# PART 3 — Restoring (only if something goes wrong)

You hopefully never need this — but here's how a backup file is used to bring
the database back. **This replaces data, so only do it when you really mean to.**

You restore with a tool called `pg_restore` (it installed alongside `pg_dump`).
Run this in PowerShell (Windows) or Terminal (Mac), replacing the connection
string with your `SUPABASE_DB_URL` and the filename with the backup you want:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="postgresql://postgres.abcd1234:YOUR-PASSWORD@aws-0-xxxx.pooler.supabase.com:5432/postgres" \
  "backups/uggalla-2026-06-20.dump"
```

> Restoring is a bigger, riskier operation than backing up. If you ever actually
> need to do it, it's worth asking a developer to help, or restoring into a
> fresh/test project first to make sure it looks right.

---

# Troubleshooting

| The window says… | What it means / fix |
|---|---|
| `pg_dump is not installed` | Do **Step A** above. Remember to close & re-open PowerShell after installing. |
| `Could not find the .backup-env file` | Do **Step B**. Make sure the file is named exactly `.backup-env` (no `.txt`, no `.example`). |
| `SUPABASE_DB_URL is missing or empty` | Open `.backup-env` and check you pasted the full connection string after the `=`. |
| `Backup failed` / connection error | Check your internet. Re-copy the **Session pooler** string from Supabase and make sure the password is correct. |
| `could not translate host name "...@...pooler.supabase.com"` | Your **password contains a special symbol** (like `@ # : / ?`), which breaks the connection string. **Easiest fix:** Supabase → Project Settings → Database → **Reset database password**, and set one using **only letters and numbers**, then update `.backup-env`. (This is safe — the website uses API keys, not this password, so it won't break.) Or keep your password but replace each symbol with its code: `@`→`%40`, `#`→`%23`, `:`→`%3A`, `/`→`%2F`, `?`→`%3F`. |
| Backups folder is filling up | It shouldn't — files older than 8 weeks delete themselves automatically each run. |

---

# Good to know

- **This is manual.** It only runs when someone double-clicks it. Making it run
  automatically every week (Windows Task Scheduler) is a later add-on.
- **It runs on any computer** that has `pg_dump` installed and the `.backup-env`
  file. Backups save onto *that* computer.
- **Backups vs. images:** this backs up the **database** (orders, customers,
  products, settings — the important stuff). It does **not** copy uploaded
  product/banner images; those live in Supabase Storage and can be re-uploaded
  if needed.
- **The hands-off alternative** is Supabase's **Pro plan ($25/month)**, which
  makes automatic daily backups with zero effort. Many shops switch to that once
  they're live and busy. This manual weekly backup is the free version of the
  same idea.
