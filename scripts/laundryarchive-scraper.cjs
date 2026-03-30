#!/usr/bin/env node
/**
 * laundryarchive-scraper.js
 *
 * Scrapes laundryarchive.com and imports laundromats into the admin database.
 *
 * Setup (run once):
 *   npm install playwright
 *   npx playwright install chromium
 *
 * Run:
 *   node scripts/laundryarchive-scraper.js
 *
 * Options (env vars):
 *   ADMIN_EMAIL   - admin login email   (default: admin@laundromat.com)
 *   ADMIN_PASS    - admin password      (default: Admin123!)
 *   START_FROM    - resume from a city URL (e.g. https://laundryarchive.com/laundromats/TX/Austin)
 *   STATE_FILTER  - only scrape one state (e.g. TX)
 */

const { chromium } = require("playwright");
const fs   = require("fs");
const path = require("path");

// ── Config ────────────────────────────────────────────────────────────────────
const API          = "https://hdzqdlxorkghslaijjzo.supabase.co/functions/v1/make-server-623b2a1c";
const SITEMAP_URL  = "https://laundryarchive.com/sitemap.xml";
const CRAWL_DELAY  = 1300;   // ms between page loads (site asks for 1s)
const BATCH_SIZE   = 300;    // records per API import call
const PROGRESS_FILE = path.join(__dirname, ".scraper-progress.json");

const ADMIN_EMAIL  = process.env.ADMIN_EMAIL || "admin@laundromat.com";
const ADMIN_PASS   = process.env.ADMIN_PASS  || "Admin123!";
const STATE_FILTER = process.env.STATE_FILTER || "";
const START_FROM   = process.env.START_FROM   || "";

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")); }
  catch { return { done: [], totalImported: 0 }; }
}

function saveProgress(p) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

async function getAdminToken() {
  const r = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  const d = await r.json();
  const token = d.access_token || d.token;
  if (!token) throw new Error(`Login failed: ${JSON.stringify(d)}`);
  return token;
}

async function importBatch(token, records) {
  const r = await fetch(`${API}/admin/laundromat-db/import-csv`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records, source: "csv" }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Import failed: ${JSON.stringify(d)}`);
  return d; // { imported, skipped, total }
}

async function getSitemapUrls() {
  const r = await fetch(SITEMAP_URL);
  const xml = await r.text();
  // Extract all <loc> values
  const matches = [...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)];
  return matches.map(m => m[1]);
}

// Extract state abbreviation from a laundryarchive URL
// e.g. https://laundryarchive.com/laundromats/TX/Austin → TX
function stateFromUrl(url) {
  const m = url.match(/\/laundromats\/([A-Za-z]{2})\//i);
  return m ? m[1].toUpperCase() : null;
}

// Extract city name from URL
function cityFromUrl(url) {
  const m = url.match(/\/laundromats\/[A-Za-z]{2}\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]).replace(/-/g, " ") : null;
}

// ── Page scraper ──────────────────────────────────────────────────────────────
// Card structure (confirmed from live DOM inspection):
//   <a href="/laundromats/TX/Houston/12345/slug">
//     <div data-slot="card">
//       <h3>Business Name</h3>
//       <span class="line-clamp-2">Street Address</span>
//       <div class="text-sm ...">ZIP 77008</div>
//     </div>
//   </a>
// City and state come from the page URL.
async function scrapeCityPage(page, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  // Wait for actual listing cards to appear (not loading skeletons)
  try {
    await page.waitForSelector("a[href*='/laundromats/'] h3", { timeout: 8000 });
  } catch {
    return []; // no listings on this page
  }

  const state = stateFromUrl(url);
  const city  = cityFromUrl(url);

  const records = await page.evaluate(({ state, city }) => {
    // Each top-level <a> linking to a specific laundromat is a card
    const cardLinks = [...document.querySelectorAll("a[href*='/laundromats/']")].filter(a => {
      // Only detail links: /laundromats/TX/Houston/12345/slug (4+ path segments after host)
      const parts = a.getAttribute("href")?.split("/").filter(Boolean) ?? [];
      return parts.length >= 4 && !a.closest("nav") && !a.closest("header") && !a.closest("footer");
    });

    return cardLinks.map(a => {
      const name    = a.querySelector("h3,h2,h4")?.textContent?.trim() ?? "";
      const address = a.querySelector("span.line-clamp-2")?.textContent?.trim() ?? "";
      // ZIP is in a div that starts with "ZIP "
      const zipText = [...a.querySelectorAll("div")]
        .find(d => /^ZIP\s+\d{5}/.test(d.textContent?.trim()))
        ?.textContent?.trim()
        .replace(/^ZIP\s+/, "") ?? "";
      return { name, address, city, state, zip: zipText };
    }).filter(r => r.address?.trim()); // skip records with no address — can't locate them
  }, { state, city });

  return records;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🧺  LaundryArchive Scraper");
  console.log("───────────────────────────────────────────");

  // 1. Login
  console.log("🔑  Logging in...");
  let token;
  try { token = await getAdminToken(); }
  catch (e) { console.error("❌  " + e.message); process.exit(1); }
  console.log("✓   Authenticated");

  // 2. Load progress
  const progress = loadProgress();
  console.log(`📋  Previously completed: ${progress.done.length} pages · ${progress.totalImported} records imported`);

  // 3. Get sitemap URLs
  console.log("🗺   Fetching sitemap...");
  let allUrls;
  try { allUrls = await getSitemapUrls(); }
  catch (e) { console.error("❌  Sitemap fetch failed:", e.message); process.exit(1); }

  // Filter to city-level pages only: /laundromats/XX/CityName
  let cityUrls = allUrls.filter(u => /\/laundromats\/[A-Za-z]{2}\/.+/.test(u));

  if (STATE_FILTER) {
    cityUrls = cityUrls.filter(u => stateFromUrl(u) === STATE_FILTER.toUpperCase());
    console.log(`🔍  State filter: ${STATE_FILTER} → ${cityUrls.length} city pages`);
  }

  // Apply START_FROM
  if (START_FROM) {
    const idx = cityUrls.findIndex(u => u === START_FROM);
    if (idx > 0) { cityUrls = cityUrls.slice(idx); console.log(`⏩  Resuming from index ${idx}`); }
  }

  // Skip already done
  const doneSet = new Set(progress.done);
  const remaining = cityUrls.filter(u => !doneSet.has(u));
  console.log(`📍  ${remaining.length} city pages to scrape (${doneSet.size} already done)`);
  console.log("───────────────────────────────────────────\n");

  if (remaining.length === 0) {
    console.log("✅  Nothing left to scrape!");
    return;
  }

  // 4. Browser — fresh context per city for maximum resilience
  let browser = null;

  async function launchBrowser() {
    try { await browser?.close(); } catch { /* ignore */ }
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    console.log("   🔄  Browser started");
  }

  async function scrapeWithFreshPage(url) {
    // New context+page per city — isolates crashes completely
    let ctx, pg;
    try {
      ctx = await browser.newContext({
        userAgent: "Mozilla/5.0 (compatible; LaundryArchive-Importer/1.0; +https://laundryarchive.com/robots.txt)",
      });
      pg = await ctx.newPage();
      return await scrapeCityPage(pg, url);
    } finally {
      try { await pg?.close(); } catch { /* ignore */ }
      try { await ctx?.close(); } catch { /* ignore */ }
    }
  }

  await launchBrowser();

  let pendingRecords = [];
  let totalImported = progress.totalImported;
  let totalSkipped = 0;
  let pagesDone = 0;
  let errors = 0;
  let consecutiveErrors = 0;

  async function flushBatch() {
    if (pendingRecords.length === 0) return;
    try {
      const res = await importBatch(token, pendingRecords);
      totalImported += res.imported || 0;
      totalSkipped  += res.skipped  || 0;
      console.log(`   📥  Batch: ${res.imported} imported · ${res.skipped} skipped (total: ${totalImported})`);
    } catch (e) {
      console.error("   ⚠️   Batch import error:", e.message);
    }
    pendingRecords = [];
  }

  // 5. Scrape each city
  for (let i = 0; i < remaining.length; i++) {
    const url = remaining[i];
    const state = stateFromUrl(url) || "??";
    const city  = cityFromUrl(url)  || url;

    process.stdout.write(`[${i + 1}/${remaining.length}] ${state} · ${city} ... `);

    // If browser crashed 3+ times in a row, relaunch it
    if (consecutiveErrors >= 3) {
      console.log("\n   ♻️  Too many errors — relaunching browser...");
      await launchBrowser();
      consecutiveErrors = 0;
      await sleep(2000);
    }

    try {
      const records = await scrapeWithFreshPage(url);
      process.stdout.write(`${records.length} found\n`);

      pendingRecords.push(...records);

      // Flush when batch is full
      if (pendingRecords.length >= BATCH_SIZE) {
        await flushBatch();
      }

      progress.done.push(url);
      progress.totalImported = totalImported;
      saveProgress(progress);
      pagesDone++;
      consecutiveErrors = 0;

    } catch (e) {
      console.log(`ERROR: ${e.message}`);
      errors++;
      consecutiveErrors++;
    }

    // Crawl delay (skip on last item)
    if (i < remaining.length - 1) await sleep(CRAWL_DELAY);
  }

  // Final flush
  await flushBatch();

  await browser.close();

  console.log("\n───────────────────────────────────────────");
  console.log(`✅  Done!`);
  console.log(`   Pages scraped : ${pagesDone}`);
  console.log(`   Records imported: ${totalImported}`);
  console.log(`   Records skipped : ${totalSkipped}`);
  console.log(`   Errors          : ${errors}`);
  if (errors > 0) {
    console.log(`\n   💡  Re-run to retry failed pages (progress is saved)`);
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
