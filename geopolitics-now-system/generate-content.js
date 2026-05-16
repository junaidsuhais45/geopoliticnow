// ============================================================
// GEOPOLITICS NOW — Daily Auto-Content Generator
// Runs once per day via GitHub Actions
// Calls Claude API → writes articles → builds the site
// ============================================================

const https = require("https");
const fs = require("fs");
const path = require("path");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── HELPER: Call Claude API ───────────────────────────────
function callClaude(prompt, maxTokens = 2000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.content[0].text);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─── HELPER: Slug from title ───────────────────────────────
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

// ─── HELPER: Format date ───────────────────────────────────
function formatDate(date) {
  return date.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatDateShort(date) {
  return date.toISOString().split("T")[0];
}

// ─── STEP 1: Generate today's articles ─────────────────────
async function generateArticles(today) {
  console.log("📰 Generating breaking news articles...");

  const newsPrompt = `You are the editor of Geopolitics Now, a sophisticated global affairs publication.
Today is ${formatDate(today)}.

Generate 5 breaking news articles covering different regions. For each article return ONLY a JSON array (no markdown, no explanation) with this exact structure:
[
  {
    "title": "Compelling headline under 12 words",
    "region": "One of: Middle East, Europe, Asia-Pacific, Americas, Africa, Global",
    "kicker": "Short geographic/topic label e.g. 'Gaza Strip · Ceasefire Talks'",
    "author": "Realistic full name",
    "authorRole": "e.g. 'Senior Correspondent, Cairo'",
    "readTime": "number only, e.g. 6",
    "summary": "Two-sentence sharp summary of what happened and why it matters geopolitically.",
    "body": "Five substantial paragraphs of high-quality analytical journalism. Each paragraph 80-120 words. Cover: what happened, regional context, international reactions, historical background, implications for global order.",
    "isLive": false
  }
]

Make one article have isLive: true (a fast-moving developing story).
Cover genuinely different regions. Write at the level of Foreign Affairs or The Economist.
Return ONLY the JSON array, nothing else.`;

  const newsText = await callClaude(newsPrompt, 4000);
  const newsArticles = JSON.parse(newsText.trim());

  console.log("✍️  Generating opinion pieces...");

  const opinionPrompt = `You are commissioning editor of Geopolitics Now, a sophisticated global affairs publication.
Today is ${formatDate(today)}.

Generate 3 high-quality opinion/essay pieces. Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "title": "Provocative, intellectual essay title",
    "author": "Full name of a plausible expert",
    "authorRole": "e.g. 'Former NSC Director; Senior Fellow, Brookings Institution'",
    "authorInitial": "Single letter for avatar",
    "pullQuote": "One powerful sentence from the piece — 15-25 words — that could stand alone as a provocative statement",
    "summary": "Two sentences on the essay's central argument.",
    "body": "Six paragraphs of sharp analytical opinion writing. 80-100 words each. Takes a clear, defensible but contested position. Cite historical precedents, data points, and geopolitical theory.",
    "readTime": "number only"
  }
]

Make the pieces genuinely contrarian and intellectually serious. Different geopolitical perspectives.
Return ONLY the JSON array, nothing else.`;

  const opinionText = await callClaude(opinionPrompt, 4000);
  const opinionPieces = JSON.parse(opinionText.trim());

  return { newsArticles, opinionPieces };
}

// ─── STEP 2: Generate ticker headlines ─────────────────────
async function generateTicker(today) {
  console.log("📡 Generating ticker...");

  const prompt = `Today is ${formatDate(today)}.
Generate 8 short breaking news ticker items for a geopolitics news site.
Return ONLY a JSON array of objects: [{"region": "MIDDLE EAST", "text": "brief headline"}]
Regions: MIDDLE EAST, EUROPE, ASIA-PACIFIC, AMERICAS, AFRICA, GLOBAL
Keep each text under 15 words. Make them feel like real wire service bulletins.
Return ONLY the JSON array, nothing else.`;

  const text = await callClaude(prompt, 600);
  return JSON.parse(text.trim());
}

// ─── STEP 3: Generate data indicators ──────────────────────
async function generateIndicators(today) {
  console.log("📊 Generating global indicators...");

  const prompt = `Today is ${formatDate(today)}.
Generate 4 global geopolitical indicators for a news dashboard.
Return ONLY a JSON array: [{"label": "Active Conflicts", "value": "39", "change": "↑ 2 this month", "trend": "up"}]
Trend is "up", "down", or "neutral".
Make values realistic. Categories: active conflicts, sanctions regimes, UN resolutions this year, displaced persons (in millions).
Return ONLY the JSON array, nothing else.`;

  const text = await callClaude(prompt, 400);
  return JSON.parse(text.trim());
}

// ─── STEP 4: Build full HTML site ──────────────────────────
function buildSite(newsArticles, opinionPieces, ticker, indicators, today) {
  console.log("🏗️  Building HTML site...");

  const dateStr = formatDate(today);
  const dateShort = formatDateShort(today);

  // Build ticker HTML
  const tickerHTML = [...ticker, ...ticker].map(t =>
    `<span><strong>${t.region}</strong> — ${t.text}</span>`
  ).join("\n        ");

  // Build sidebar stories (articles 2-5)
  const sidebarHTML = newsArticles.slice(1, 5).map((a, i) => `
    <div class="sidebar-story" onclick="openArticle('news-${i+1}')">
      <div class="num">0${i+2}</div>
      <span class="s-tag">${a.region}</span>
      <h3>${a.title}</h3>
      <span class="s-time">${a.isLive ? '🟢 Developing' : Math.floor(Math.random()*3+1) + ' hour' + (Math.floor(Math.random()*3+1) > 1 ? 's' : '') + ' ago'}</span>
    </div>`).join("");

  // Build opinion grid
  const opinionFeatured = opinionPieces[0];
  const opinionColsHTML = opinionPieces.slice(1, 3).map(op => `
    <div class="opinion-col">
      <h3>${op.title}</h3>
      <p>${op.summary}</p>
      <a href="#" class="read-more" onclick="openOpinion('op-${opinionPieces.indexOf(op)}'); return false;">Read Essay →</a>
    </div>`).join("");

  // Build data indicators
  const indicatorsHTML = indicators.map(ind => `
    <div class="data-item">
      <span class="label">${ind.label}</span>
      <span class="value">${ind.value}</span>
      <span class="change ${ind.trend}">${ind.change}</span>
    </div>`).join("");

  // Build breaking cards
  const heroArticle = newsArticles[0];
  const breakingCardsHTML = newsArticles.slice(1, 5).map((a, i) => `
    <div class="breaking-card" onclick="openArticle('news-${i+1}')">
      <div class="card-region"><div class="card-dot${a.isLive ? ' live' : ''}"></div>${a.isLive ? '<span style="color:#5ba87c;">Live</span>&nbsp;·&nbsp;' : ''}${a.region}</div>
      <h3>${a.title}</h3>
      <p>${a.summary}</p>
      <div class="card-footer"><span>${a.author}</span><span>${Math.floor(Math.random()*5+1)}h ago</span></div>
    </div>`).join("");

  // Build analysis stories from opinion
  const analysisHTML = opinionPieces.map((op, i) => `
    <div class="analysis-story" onclick="openOpinion('op-${i}')">
      <div class="story-num">0${i+1}</div>
      <span class="region-tag">Opinion · Essay</span>
      <h3>${op.title}</h3>
      <p>${op.summary}</p>
    </div>`).join("");

  // Build article modal data
  const articleData = newsArticles.map((a, i) => ({
    id: `news-${i}`,
    type: "news",
    title: a.title,
    region: a.region,
    kicker: a.kicker,
    author: a.author,
    authorRole: a.authorRole,
    readTime: a.readTime,
    body: a.body,
    isLive: a.isLive,
    date: dateStr
  }));

  const opinionData = opinionPieces.map((op, i) => ({
    id: `op-${i}`,
    type: "opinion",
    title: op.title,
    author: op.author,
    authorRole: op.authorRole,
    authorInitial: op.authorInitial,
    pullQuote: op.pullQuote,
    readTime: op.readTime,
    body: op.body,
    date: dateStr
  }));

  const allArticlesJSON = JSON.stringify([...articleData, ...opinionData]);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Geopolitics Now — ${dateStr}</title>
<meta name="description" content="Sophisticated global affairs journalism. Breaking news, analysis and opinion on geopolitics, international relations and world affairs.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Mono:wght@300;400;500&family=Bebas+Neue&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --navy: #082052; --navy-mid: #0d2d6e; --navy-light: #1a3d82;
    --cream: #F8F0E5; --cream-dark: #ede4d4; --gold: #c9a84c;
    --muted: #6b7fa8; --line: rgba(8,32,82,0.1); --line-light: rgba(8,32,82,0.06);
  }
  html { scroll-behavior: smooth; }
  body { background: var(--cream); color: var(--navy); font-family: 'Crimson Pro', serif; font-size: 18px; line-height: 1.6; overflow-x: hidden; }
  body::before { content: ''; position: fixed; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E"); pointer-events: none; z-index: 9999; opacity: 0.5; }

  /* TICKER */
  .ticker-wrap { background: var(--navy); color: var(--cream); padding: 9px 0; overflow: hidden; position: relative; }
  .ticker-wrap::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--gold), transparent); }
  .ticker-inner { display: flex; align-items: center; }
  .ticker-label { font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; background: var(--gold); color: var(--navy); padding: 3px 16px; white-space: nowrap; flex-shrink: 0; margin-right: 24px; font-weight: 500; }
  .ticker-track { display: flex; animation: ticker 55s linear infinite; white-space: nowrap; }
  .ticker-track span { font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: 0.07em; padding-right: 64px; color: rgba(248,240,229,0.55); }
  .ticker-track span strong { color: var(--cream); font-weight: 500; }
  @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }

  /* HEADER */
  header { border-bottom: 1px solid var(--line); padding: 0 48px; background: var(--cream); }
  .header-top { display: flex; justify-content: space-between; align-items: center; padding: 14px 0 12px; border-bottom: 1px solid var(--line); }
  .date-stamp { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted); }
  .edition-badge { font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--navy); border: 1px solid var(--navy); padding: 3px 12px; }
  .masthead { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 28px 0 22px; border-bottom: 1px solid var(--line); }
  .masthead-left span { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--muted); display: block; line-height: 1.8; }
  .site-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px, 6.5vw, 92px); letter-spacing: 0.05em; line-height: 0.9; color: var(--navy); text-align: center; text-shadow: 1px 1px 0 rgba(8,32,82,0.4), 2px 2px 0 rgba(8,32,82,0.28), 3px 3px 0 rgba(8,32,82,0.16), 4px 4px 0 rgba(8,32,82,0.08), 0 8px 24px rgba(8,32,82,0.15); cursor: pointer; transition: text-shadow 0.3s; }
  .site-title:hover { text-shadow: 1px 1px 0 rgba(8,32,82,0.5), 2px 2px 0 rgba(8,32,82,0.38), 3px 3px 0 rgba(8,32,82,0.24), 4px 4px 0 rgba(8,32,82,0.14), 5px 5px 0 rgba(8,32,82,0.06), 0 12px 32px rgba(8,32,82,0.2); }
  .title-deco { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 8px; }
  .title-deco::before, .title-deco::after { content: ''; height: 1px; width: 52px; background: var(--gold); }
  .title-star-deco { width: 10px; height: 10px; background: var(--gold); transform: rotate(45deg); box-shadow: 0 2px 8px rgba(201,168,76,0.5); }
  .masthead-right { display: flex; justify-content: flex-end; gap: 20px; align-items: center; }
  .masthead-right a { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted); text-decoration: none; transition: color 0.2s; }
  .masthead-right a:hover { color: var(--navy); }
  nav { display: flex; align-items: center; overflow-x: auto; }
  nav a { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--navy); text-decoration: none; padding: 14px 20px; border-right: 1px solid var(--line); transition: all 0.2s; white-space: nowrap; position: relative; opacity: 0.65; }
  nav a:first-child { border-left: 1px solid var(--line); }
  nav a::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--gold); transform: scaleX(0); transition: transform 0.25s; }
  nav a:hover { opacity: 1; } nav a:hover::after, nav a.active::after { transform: scaleX(1); } nav a.active { opacity: 1; }
  .nav-spacer { flex: 1; }
  .nav-subscribe { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; background: var(--navy); color: var(--cream); border: none; padding: 11px 24px; cursor: pointer; margin-left: 16px; transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 4px 0 #04122e, 0 6px 14px rgba(8,32,82,0.28); }
  .nav-subscribe:hover { transform: translateY(-2px); box-shadow: 0 6px 0 #04122e, 0 10px 22px rgba(8,32,82,0.32); }

  main { padding: 0 48px; max-width: 1440px; margin: 0 auto; }

  /* HERO */
  .hero { display: grid; grid-template-columns: 1fr 360px; gap: 0; border-bottom: 1px solid var(--line); padding: 52px 0 48px; animation: fadeUp 0.7s ease both; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  .hero-main { padding-right: 52px; border-right: 1px solid var(--line); }
  .breaking-pill { display: inline-flex; align-items: center; gap: 8px; background: var(--navy); color: var(--cream); font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.32em; text-transform: uppercase; padding: 5px 14px; margin-bottom: 22px; box-shadow: 0 4px 14px rgba(8,32,82,0.22); }
  .live-pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--gold); animation: lpulse 1.6s ease-in-out infinite; }
  @keyframes lpulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.8); } }
  .hero-kicker { font-family: 'DM Mono', monospace; font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 18px; display: block; }
  .hero-headline { font-family: 'Playfair Display', serif; font-size: clamp(30px, 3.8vw, 54px); font-weight: 900; line-height: 1.06; letter-spacing: -0.01em; margin-bottom: 22px; color: var(--navy); cursor: pointer; transition: opacity 0.2s; }
  .hero-headline:hover { opacity: 0.75; }
  .hero-deck { font-family: 'Crimson Pro', serif; font-size: 19px; line-height: 1.65; color: rgba(8,32,82,0.65); margin-bottom: 30px; font-weight: 300; max-width: 540px; }
  .hero-meta { display: flex; align-items: center; gap: 16px; font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; }
  .hero-meta .author { color: var(--navy); font-weight: 500; } .hero-meta .dot { opacity: 0.3; }
  .hero-visual { width: 100%; height: 290px; margin-top: 32px; perspective: 900px; }
  .globe-card { width: 100%; height: 100%; background: linear-gradient(145deg, var(--navy) 0%, var(--navy-mid) 55%, #081a44 100%); position: relative; overflow: hidden; transform: rotateX(5deg) rotateY(-4deg); box-shadow: 10px 18px 44px rgba(8,32,82,0.38), 0 2px 0 rgba(255,255,255,0.05) inset; transition: transform 0.4s ease; cursor: pointer; }
  .globe-card:hover { transform: rotateX(2deg) rotateY(-1deg); }
  .globe-grid { position: absolute; inset: 0; background-image: repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(248,240,229,0.04) 30px, rgba(248,240,229,0.04) 31px), repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(248,240,229,0.04) 30px, rgba(248,240,229,0.04) 31px); }
  .gc { position: absolute; border-radius: 50%; border: 1px solid rgba(201,168,76,0.22); }
  .gc1 { width: 320px; height: 320px; top: -70px; right: -70px; }
  .gc2 { width: 200px; height: 200px; top: -10px; right: -10px; border-color: rgba(248,240,229,0.07); }
  .gc3 { width: 100px; height: 100px; top: 40px; right: 50px; border-color: rgba(201,168,76,0.13); }
  .globe-text { position: absolute; top: 20px; left: 22px; font-family: 'Bebas Neue', sans-serif; font-size: 84px; color: rgba(248,240,229,0.04); letter-spacing: 0.06em; line-height: 1; }
  .globe-star-svg { position: absolute; bottom: 36px; right: 36px; width: 34px; height: 34px; filter: drop-shadow(0 0 14px rgba(201,168,76,0.7)); }
  .globe-label { position: absolute; bottom: 16px; left: 20px; font-family: 'DM Mono', monospace; font-size: 8.5px; letter-spacing: 0.22em; color: rgba(248,240,229,0.28); text-transform: uppercase; }
  .hero-sidebar { padding-left: 44px; display: flex; flex-direction: column; }
  .sidebar-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--muted); padding-bottom: 14px; border-bottom: 2px solid var(--navy); }
  .sidebar-story { padding: 20px 0; border-bottom: 1px solid var(--line); cursor: pointer; transition: padding-left 0.2s; }
  .sidebar-story:hover { padding-left: 8px; }
  .sidebar-story .num { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: rgba(8,32,82,0.1); line-height: 1; margin-bottom: 5px; }
  .sidebar-story .s-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 6px; display: block; }
  .sidebar-story h3 { font-family: 'Playfair Display', serif; font-size: 15.5px; font-weight: 700; line-height: 1.3; color: var(--navy); }
  .sidebar-story .s-time { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; color: var(--muted); margin-top: 8px; display: block; }

  .section-head { display: flex; align-items: center; gap: 16px; padding: 44px 0 28px; }
  .section-head h2 { font-family: 'Bebas Neue', sans-serif; font-size: 13px; letter-spacing: 0.38em; text-transform: uppercase; color: var(--navy); white-space: nowrap; }
  .section-head::after { content: ''; flex: 1; height: 1px; background: var(--line); }
  .section-head .tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); white-space: nowrap; }

  /* OPINION */
  .opinion-grid { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 0; border-top: 2px solid var(--navy); border-bottom: 1px solid var(--line); margin-bottom: 60px; animation: fadeUp 0.7s 0.1s ease both; }
  .opinion-featured { padding: 40px 44px 40px 0; border-right: 1px solid var(--line); cursor: pointer; }
  .opinion-featured::before { content: 'Featured Opinion'; font-family: 'DM Mono', monospace; font-size: 8.5px; letter-spacing: 0.4em; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 24px; }
  .pull-quote { font-family: 'Playfair Display', serif; font-size: clamp(20px, 2.5vw, 31px); font-style: italic; font-weight: 400; line-height: 1.28; color: var(--navy); border-left: 3px solid var(--gold); padding-left: 24px; margin-bottom: 28px; }
  .opinion-author-block { display: flex; align-items: center; gap: 14px; }
  .author-avatar { width: 46px; height: 46px; border-radius: 50%; background: var(--navy); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 18px; color: var(--cream); font-style: italic; box-shadow: 0 4px 12px rgba(8,32,82,0.28); }
  .author-info .name { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; font-weight: 500; color: var(--navy); display: block; }
  .author-info .role { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.08em; color: var(--muted); display: block; margin-top: 2px; }
  .opinion-col { padding: 40px 32px; border-right: 1px solid var(--line); display: flex; flex-direction: column; cursor: pointer; transition: background 0.2s; }
  .opinion-col:last-child { border-right: none; }
  .opinion-col:hover { background: var(--cream-dark); }
  .opinion-col::before { content: 'Opinion'; font-family: 'DM Mono', monospace; font-size: 8.5px; letter-spacing: 0.4em; color: var(--muted); text-transform: uppercase; display: block; margin-bottom: 20px; }
  .opinion-col h3 { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; line-height: 1.28; margin-bottom: 14px; flex: 1; color: var(--navy); }
  .opinion-col p { font-size: 14.5px; line-height: 1.6; color: rgba(8,32,82,0.6); font-weight: 300; margin-bottom: 20px; }
  .read-more { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--navy); text-decoration: none; border-bottom: 1px solid var(--navy); padding-bottom: 2px; display: inline-block; transition: color 0.2s, border-color 0.2s, opacity 0.2s; align-self: flex-start; margin-top: auto; opacity: 0.65; }
  .read-more:hover { opacity: 1; color: var(--gold); border-color: var(--gold); }

  /* DATA STRIP */
  .data-strip { background: var(--navy); margin: 0 -48px 60px; padding: 38px 48px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; position: relative; overflow: hidden; box-shadow: 0 10px 48px rgba(8,32,82,0.22); }
  .data-strip::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent); }
  .data-strip::after { content: 'GLOBAL INDICATORS'; position: absolute; top: -10px; left: 48px; font-family: 'DM Mono', monospace; font-size: 8px; letter-spacing: 0.3em; background: var(--navy); color: rgba(248,240,229,0.28); padding: 0 8px; }
  .data-item { padding: 0 32px; border-right: 1px solid rgba(248,240,229,0.08); position: relative; z-index: 1; }
  .data-item:first-child { padding-left: 0; } .data-item:last-child { border-right: none; }
  .data-item .label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(248,240,229,0.32); margin-bottom: 8px; display: block; }
  .data-item .value { font-family: 'Bebas Neue', sans-serif; font-size: 44px; line-height: 1; letter-spacing: 0.03em; color: var(--cream); display: block; text-shadow: 1px 1px 0 rgba(0,0,0,0.45), 2px 2px 0 rgba(0,0,0,0.28), 3px 3px 0 rgba(0,0,0,0.14); }
  .data-item .change { font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: 0.1em; margin-top: 6px; display: block; }
  .change.up { color: #7ec8a4; } .change.neutral { color: rgba(248,240,229,0.38); } .change.down { color: #f0a070; }

  /* BREAKING CARDS */
  .breaking-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-top: 2px solid var(--navy); margin-bottom: 64px; animation: fadeUp 0.7s 0.2s ease both; }
  .breaking-card { padding: 32px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); cursor: pointer; transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.2s; position: relative; display: flex; flex-direction: column; background: var(--cream); }
  .breaking-card:hover { transform: translateY(-5px) scale(1.006); box-shadow: 0 14px 36px rgba(8,32,82,0.13); background: #fdf7ef; z-index: 2; }
  .breaking-card:nth-child(3n) { border-right: none; }
  .breaking-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--navy), var(--navy-light)); transform: scaleX(0); transform-origin: left; transition: transform 0.3s ease; }
  .breaking-card:hover::before { transform: scaleX(1); }
  .card-region { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.25em; text-transform: uppercase; color: var(--gold); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .card-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--gold); flex-shrink: 0; }
  .card-dot.live { background: #5ba87c; animation: lpulse 1.5s infinite; }
  .breaking-card h3 { font-family: 'Playfair Display', serif; font-size: 18.5px; font-weight: 700; line-height: 1.28; margin-bottom: 12px; color: var(--navy); }
  .breaking-card p { font-size: 14px; line-height: 1.6; color: rgba(8,32,82,0.52); font-weight: 300; margin-bottom: 18px; flex: 1; }
  .card-footer { display: flex; justify-content: space-between; align-items: center; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; color: var(--muted); text-transform: uppercase; border-top: 1px solid var(--line-light); padding-top: 12px; }

  /* ANALYSIS */
  .analysis-grid { display: grid; grid-template-columns: 240px 1fr; gap: 0; border-top: 2px solid var(--navy); margin-bottom: 64px; }
  .analysis-label-col { padding: 44px 44px 44px 0; border-right: 1px solid var(--line); display: flex; flex-direction: column; justify-content: space-between; }
  .analysis-label-col h2 { font-family: 'Bebas Neue', sans-serif; font-size: 13px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--navy); writing-mode: vertical-rl; transform: rotate(180deg); align-self: flex-start; }
  .analysis-label-col .view-all { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); text-decoration: none; transition: color 0.2s; }
  .analysis-label-col .view-all:hover { color: var(--navy); }
  .analysis-stories { display: grid; grid-template-columns: repeat(3, 1fr); }
  .analysis-story { padding: 40px 32px; border-right: 1px solid var(--line); cursor: pointer; transition: background 0.2s; }
  .analysis-story:last-child { border-right: none; }
  .analysis-story:hover { background: var(--cream-dark); }
  .story-num { font-family: 'Bebas Neue', sans-serif; font-size: 48px; color: rgba(8,32,82,0.06); line-height: 1; margin-bottom: 14px; }
  .region-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold); margin-bottom: 10px; display: block; }
  .analysis-story h3 { font-family: 'Playfair Display', serif; font-size: 17.5px; font-weight: 700; line-height: 1.3; margin-bottom: 12px; color: var(--navy); }
  .analysis-story p { font-size: 13.5px; line-height: 1.65; color: rgba(8,32,82,0.52); font-weight: 300; }

  /* ARTICLE MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(8,32,82,0.85); z-index: 10000; display: none; align-items: flex-start; justify-content: center; padding: 40px 20px; overflow-y: auto; backdrop-filter: blur(4px); }
  .modal-overlay.open { display: flex; animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-box { background: var(--cream); max-width: 760px; width: 100%; position: relative; animation: slideUp 0.35s ease; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  .modal-close { position: absolute; top: 24px; right: 24px; background: var(--navy); color: var(--cream); border: none; width: 36px; height: 36px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 1; }
  .modal-close:hover { background: var(--navy-light); }
  .modal-header { padding: 48px 48px 32px; border-bottom: 1px solid var(--line); }
  .modal-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold); margin-bottom: 16px; display: block; }
  .modal-title { font-family: 'Playfair Display', serif; font-size: clamp(24px, 4vw, 40px); font-weight: 900; line-height: 1.08; color: var(--navy); margin-bottom: 20px; }
  .modal-meta { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; }
  .modal-meta .author { color: var(--navy); font-weight: 500; }
  .modal-body { padding: 40px 48px 56px; }
  .modal-pull { font-family: 'Playfair Display', serif; font-size: 22px; font-style: italic; line-height: 1.35; color: var(--navy); border-left: 3px solid var(--gold); padding-left: 24px; margin-bottom: 32px; }
  .modal-body p { font-family: 'Crimson Pro', serif; font-size: 18px; line-height: 1.75; color: rgba(8,32,82,0.82); margin-bottom: 20px; font-weight: 300; }

  /* FOOTER */
  footer { background: var(--navy); color: var(--cream); margin: 0 -48px; padding: 0 48px; position: relative; }
  footer::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, var(--gold), transparent); }
  .footer-top { display: grid; grid-template-columns: 1fr 1fr 1fr 1.5fr; gap: 0; border-bottom: 1px solid rgba(248,240,229,0.08); padding: 60px 0 52px; }
  .footer-col { padding-right: 44px; border-right: 1px solid rgba(248,240,229,0.07); margin-right: 44px; }
  .footer-col:last-child { border-right: none; margin-right: 0; padding-right: 0; }
  .footer-col h4 { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.32em; text-transform: uppercase; color: rgba(248,240,229,0.28); margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid rgba(248,240,229,0.07); }
  .footer-col a { display: block; font-family: 'Crimson Pro', serif; font-size: 15.5px; color: rgba(248,240,229,0.58); text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
  .footer-col a:hover { color: var(--cream); }
  .newsletter-form { display: flex; flex-direction: column; gap: 10px; }
  .newsletter-form p { font-size: 14px; color: rgba(248,240,229,0.42); font-family: 'Crimson Pro', serif; line-height: 1.55; margin-bottom: 4px; }
  .newsletter-form input { background: rgba(248,240,229,0.05); border: 1px solid rgba(248,240,229,0.12); color: var(--cream); padding: 12px 16px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.05em; outline: none; transition: border-color 0.2s; }
  .newsletter-form input::placeholder { color: rgba(248,240,229,0.18); }
  .newsletter-form input:focus { border-color: var(--gold); }
  .newsletter-form button { background: var(--gold); color: var(--navy); border: none; padding: 13px 20px; font-family: 'DM Mono', monospace; font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; cursor: pointer; font-weight: 500; transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 4px 0 #8a6f2a; }
  .newsletter-form button:hover { transform: translateY(-2px); box-shadow: 0 6px 0 #8a6f2a; }
  .footer-bottom { display: flex; justify-content: space-between; align-items: center; padding: 20px 0; }
  .footer-bottom .copy { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.14em; color: rgba(248,240,229,0.18); }
  .footer-brand { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 0.08em; color: rgba(248,240,229,0.09); }

  @media (max-width: 1000px) {
    header, main, footer { padding-left: 24px; padding-right: 24px; }
    .hero { grid-template-columns: 1fr; }
    .hero-main { padding-right: 0; border-right: none; border-bottom: 1px solid var(--line); padding-bottom: 36px; margin-bottom: 36px; }
    .hero-sidebar { padding-left: 0; }
    .masthead { grid-template-columns: 1fr; text-align: center; gap: 14px; }
    .masthead-left, .masthead-right { justify-content: center; }
    .breaking-grid { grid-template-columns: 1fr; }
    .opinion-grid { grid-template-columns: 1fr; }
    .data-strip { grid-template-columns: repeat(2, 1fr); margin: 0 -24px 48px; padding: 32px 24px; gap: 24px; }
    .footer-top { grid-template-columns: 1fr 1fr; gap: 32px; }
    .analysis-grid { grid-template-columns: 1fr; }
    .analysis-stories { grid-template-columns: 1fr; }
    .modal-header, .modal-body { padding-left: 24px; padding-right: 24px; }
  }
</style>
</head>
<body>

<div class="ticker-wrap">
  <div class="ticker-inner">
    <span class="ticker-label">Live Updates</span>
    <div style="overflow:hidden;flex:1;">
      <div class="ticker-track">
        ${tickerHTML}
      </div>
    </div>
  </div>
</div>

<header>
  <div class="header-top">
    <span class="date-stamp">${dateStr} &nbsp;·&nbsp; Global Edition</span>
    <span class="edition-badge">AI-Powered Edition</span>
  </div>
  <div class="masthead">
    <div class="masthead-left"><span>Est. 2024</span><span>Independent Analysis</span></div>
    <div>
      <div class="site-title" onclick="window.scrollTo(0,0)">Geopolitics Now</div>
      <div class="title-deco"><div class="title-star-deco"></div></div>
    </div>
    <div class="masthead-right"><a href="#">Search</a><a href="#">Archive</a><a href="#">Login</a></div>
  </div>
  <nav>
    <a href="#" class="active">Home</a>
    <a href="#">Breaking</a><a href="#">Opinion</a><a href="#">Middle East</a>
    <a href="#">Europe</a><a href="#">Asia-Pacific</a><a href="#">Americas</a>
    <a href="#">Africa</a><a href="#">Economy</a>
    <div class="nav-spacer"></div>
    <button class="nav-subscribe">Subscribe</button>
  </nav>
</header>

<main>
  <section class="hero">
    <div class="hero-main">
      <div class="breaking-pill"><div class="live-pulse"></div>${heroArticle.isLive ? 'Live · Breaking' : 'Breaking'}</div>
      <span class="hero-kicker">${heroArticle.kicker}</span>
      <h1 class="hero-headline" onclick="openArticle('news-0')">${heroArticle.title}</h1>
      <p class="hero-deck">${heroArticle.summary}</p>
      <div class="hero-meta">
        <span class="author">${heroArticle.author}</span><span class="dot">·</span>
        <span>${heroArticle.authorRole}</span><span class="dot">·</span>
        <span>Today</span><span class="dot">·</span><span>${heroArticle.readTime} min read</span>
      </div>
      <div class="hero-visual">
        <div class="globe-card" onclick="openArticle('news-0')">
          <div class="globe-grid"></div>
          <div class="gc gc1"></div><div class="gc gc2"></div><div class="gc gc3"></div>
          <div class="globe-text">${heroArticle.region.toUpperCase().slice(0,6)}</div>
          <svg class="globe-star-svg" viewBox="0 0 40 40" fill="none"><path d="M20 2 L21.6 17.4 L37 20 L21.6 22.6 L20 38 L18.4 22.6 L3 20 L18.4 17.4 Z" fill="#c9a84c"/></svg>
          <span class="globe-label">${heroArticle.region} — Strategic Overview · ${dateShort}</span>
        </div>
      </div>
    </div>
    <div class="hero-sidebar">
      <div class="sidebar-label">Also Breaking</div>
      ${sidebarHTML}
    </div>
  </section>

  <div class="section-head"><h2>Opinion</h2><span class="tag">Today's perspectives</span></div>
  <section class="opinion-grid">
    <div class="opinion-featured" onclick="openOpinion('op-0')">
      <div class="pull-quote">"${opinionFeatured.pullQuote}"</div>
      <div class="opinion-author-block">
        <div class="author-avatar">${opinionFeatured.authorInitial}</div>
        <div class="author-info">
          <span class="name">${opinionFeatured.author}</span>
          <span class="role">${opinionFeatured.authorRole}</span>
        </div>
      </div>
    </div>
    ${opinionColsHTML}
  </section>

  <div class="data-strip">
    ${indicatorsHTML}
  </div>

  <div class="section-head"><h2>Breaking News</h2><span class="tag">Updated ${dateShort}</span></div>
  <section class="breaking-grid">
    ${breakingCardsHTML}
  </section>

  <section class="analysis-grid">
    <div class="analysis-label-col"><h2>In Depth</h2><a href="#" class="view-all">All Analysis →</a></div>
    <div class="analysis-stories">${analysisHTML}</div>
  </section>
</main>

<footer>
  <div class="footer-top">
    <div class="footer-col"><h4>Coverage</h4><a href="#">Middle East</a><a href="#">Europe</a><a href="#">Asia-Pacific</a><a href="#">Americas</a><a href="#">Africa</a><a href="#">Global Economy</a></div>
    <div class="footer-col"><h4>Formats</h4><a href="#">Breaking News</a><a href="#">Opinion & Essays</a><a href="#">In-Depth Analysis</a><a href="#">Data & Indicators</a><a href="#">Morning Brief</a></div>
    <div class="footer-col"><h4>Publication</h4><a href="#">About Us</a><a href="#">Editorial Board</a><a href="#">Contributors</a><a href="#">Press & Media</a><a href="#">Contact</a></div>
    <div class="footer-col"><h4>Daily Newsletter</h4>
      <div class="newsletter-form">
        <p>Geopolitical intelligence, delivered each morning at 06:00 GMT.</p>
        <input type="email" placeholder="your@email.com">
        <button type="button">Subscribe Free →</button>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span class="copy">© ${today.getFullYear()} Geopolitics Now. AI-assisted journalism. All rights reserved.</span>
    <span class="footer-brand">Geopolitics Now</span>
  </div>
</footer>

<!-- ARTICLE MODAL -->
<div class="modal-overlay" id="modal" onclick="closeModalOnBg(event)">
  <div class="modal-box">
    <button class="modal-close" onclick="closeModal()">✕</button>
    <div class="modal-header">
      <span class="modal-tag" id="m-tag"></span>
      <h2 class="modal-title" id="m-title"></h2>
      <div class="modal-meta" id="m-meta"></div>
    </div>
    <div class="modal-body" id="m-body"></div>
  </div>
</div>

<script>
const ARTICLES = ${allArticlesJSON};

function openArticle(id) {
  const a = ARTICLES.find(x => x.id === id);
  if (!a) return;
  document.getElementById('m-tag').textContent = (a.region || 'News') + (a.kicker ? ' · ' + a.kicker : '');
  document.getElementById('m-title').textContent = a.title;
  document.getElementById('m-meta').innerHTML =
    '<span class="author">' + a.author + '</span>' +
    '<span style="opacity:0.3">·</span>' +
    '<span>' + (a.authorRole || '') + '</span>' +
    '<span style="opacity:0.3">·</span>' +
    '<span>' + a.readTime + ' min read</span>' +
    '<span style="opacity:0.3">·</span>' +
    '<span>' + (a.date || '') + '</span>';
  const body = document.getElementById('m-body');
  body.innerHTML = '';
  (a.body || '').split('\\n\\n').forEach(para => {
    if (para.trim()) { const p = document.createElement('p'); p.textContent = para.trim(); body.appendChild(p); }
  });
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function openOpinion(id) {
  const a = ARTICLES.find(x => x.id === id);
  if (!a) return;
  document.getElementById('m-tag').textContent = 'Opinion & Analysis';
  document.getElementById('m-title').textContent = a.title;
  document.getElementById('m-meta').innerHTML =
    '<span class="author">' + a.author + '</span>' +
    '<span style="opacity:0.3">·</span>' +
    '<span>' + (a.authorRole || '') + '</span>' +
    '<span style="opacity:0.3">·</span>' +
    '<span>' + a.readTime + ' min read</span>';
  const body = document.getElementById('m-body');
  body.innerHTML = '';
  if (a.pullQuote) {
    const pq = document.createElement('div');
    pq.className = 'modal-pull';
    pq.textContent = '"' + a.pullQuote + '"';
    body.appendChild(pq);
  }
  (a.body || '').split('\\n\\n').forEach(para => {
    if (para.trim()) { const p = document.createElement('p'); p.textContent = para.trim(); body.appendChild(p); }
  });
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalOnBg(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
</script>
</body>
</html>`;
}

// ─── MAIN ─────────────────────────────────────────────────
async function main() {
  const today = new Date();
  console.log(`\n🌍 Geopolitics Now — Daily Build: ${today.toDateString()}\n`);

  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable not set");
  }

  const [{ newsArticles, opinionPieces }, ticker, indicators] = await Promise.all([
    generateArticles(today),
    generateTicker(today),
    generateIndicators(today),
  ]);

  const html = buildSite(newsArticles, opinionPieces, ticker, indicators, today);

  // Write the main index.html
  const outDir = path.join(__dirname, "dist");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");

  // Also save a dated archive copy
  const archiveDir = path.join(outDir, "archive");
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
  const dateStr = today.toISOString().split("T")[0];
  fs.writeFileSync(path.join(archiveDir, `${dateStr}.html`), html, "utf8");

  console.log(`\n✅ Site built successfully → dist/index.html`);
  console.log(`📁 Archive saved → dist/archive/${dateStr}.html\n`);
}

main().catch(err => { console.error("❌ Build failed:", err); process.exit(1); });
