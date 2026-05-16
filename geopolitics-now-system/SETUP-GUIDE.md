# GEOPOLITICS NOW — Complete Setup Guide
## From zero to a self-updating AI news site in ~30 minutes

---

## WHAT THIS DOES

Every morning at 6:00am, GitHub automatically:
1. Calls Claude AI to write 5 breaking news articles + 3 opinion essays
2. Generates today's ticker headlines and global indicators
3. Builds a complete HTML website with all the content
4. Publishes it live — your site updates while you sleep

---

## WHAT YOU NEED (all free or cheap)

- A GitHub account (free) → github.com
- An Anthropic API key (~$5-15/month) → console.anthropic.com
- Your Netlify site (already done ✓)

---

## STEP 1 — Create a GitHub Account (5 min)

1. Go to github.com
2. Click "Sign up" — use any email
3. Verify your email
4. Done

---

## STEP 2 — Create a New Repository (3 min)

1. Once logged in, click the "+" button (top right) → "New repository"
2. Name it: `geopolitics-now`
3. Set it to **Public**
4. Click "Create repository"
5. You now have an empty repo — leave this tab open

---

## STEP 3 — Upload Your Files (5 min)

Upload these files to your GitHub repo (drag and drop them in):

```
geopolitics-now/
├── generate-content.js          ← The AI content engine
├── package.json                 ← Project config
├── netlify.toml                 ← Tells Netlify where your site is
└── .github/
    └── workflows/
        └── daily-update.yml     ← The daily automation schedule
```

To upload:
1. In your GitHub repo, click "uploading an existing file"
2. Drag all files from this folder
3. For the .github folder: create it manually using "Create new file" 
   and type `.github/workflows/daily-update.yml` as the filename
   then paste the content
4. Click "Commit changes"

---

## STEP 4 — Get Your Anthropic API Key (5 min)

1. Go to console.anthropic.com
2. Sign up / log in
3. Click "API Keys" in the left sidebar
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-...`)
6. Add $10 of credit — this lasts 1-3 months of daily updates

---

## STEP 5 — Add the API Key to GitHub (3 min)

Your API key must be kept secret — GitHub Secrets does this automatically.

1. In your GitHub repo, click "Settings" (top tab)
2. Left sidebar → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Name: `ANTHROPIC_API_KEY`
5. Value: paste your `sk-ant-...` key
6. Click "Add secret"

---

## STEP 6 — Connect GitHub to Netlify (5 min)

Right now your Netlify site is using a static file you uploaded manually.
We need to connect it to GitHub so it updates automatically.

1. Log in to app.netlify.com
2. Click your site
3. Click "Site configuration" → "Build & deploy" → "Link repository"
4. Choose "GitHub" → authorize Netlify
5. Select your `geopolitics-now` repository
6. Set:
   - Build command: (leave empty)
   - Publish directory: `dist`
7. Click "Deploy site"

From now on: every time GitHub pushes a new build, Netlify publishes it automatically.

---

## STEP 7 — Run Your First Build (2 min)

1. In your GitHub repo, click the "Actions" tab
2. Click "Daily Content Generation" in the left sidebar
3. Click "Run workflow" → "Run workflow"
4. Watch it run (takes ~2 minutes)
5. When it says ✅ — your site is live with today's AI-written content!

---

## WHAT HAPPENS EVERY DAY (automatically)

```
06:00 UTC → GitHub wakes up
            ↓
            Claude AI writes:
            • 5 breaking news articles (different regions)
            • 3 opinion essays (by simulated experts)
            • 8 ticker headlines
            • 4 global indicators
            ↓
            HTML site is built
            ↓
            Pushed to GitHub
            ↓
            Netlify detects the push
            ↓
06:03 UTC → Your site is live with fresh content
```

---

## TROUBLESHOOTING

**"Build failed" in GitHub Actions**
→ Check that your ANTHROPIC_API_KEY secret is set correctly (Step 5)
→ Check you have API credits at console.anthropic.com

**Site not updating on Netlify**
→ Make sure Netlify is connected to GitHub (Step 6)
→ In Netlify → Deploys — you should see new deploys appearing

**Want to change what time it updates**
→ Edit `.github/workflows/daily-update.yml`
→ Change `cron: '0 6 * * *'` (this means 6:00am UTC)
→ Use crontab.guru to calculate your timezone

---

## ESTIMATED COSTS

| Service | Cost |
|---------|------|
| GitHub | Free |
| Netlify | Free |
| Anthropic API | ~$0.30-0.50/day = ~$10-15/month |
| **Total** | **~$10-15/month** |

---

## OPTIONAL UPGRADES

- **Custom domain**: Buy geopoliticsnow.com (~$12/year) and connect in Netlify
- **Email newsletter**: Connect Mailchimp to auto-send the daily content
- **Social media**: Add a step to auto-post to X/Twitter
- **Archive page**: The system already saves dated copies in `dist/archive/`

---

## NEED HELP?

Run into any issues? The most common fix:
1. Check GitHub Actions → click the failed job → read the error
2. 90% of failures are the API key not being set correctly

You've got this.
