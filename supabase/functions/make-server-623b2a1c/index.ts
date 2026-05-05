import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

const _siteUrl = Deno.env.get("SITE_URL");
app.use("*", cors({
  origin: _siteUrl
    ? [_siteUrl, "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:4173"]
    : "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type"],
}));
app.use("*", logger(console.log));

// ── Rate Limiting ───────────────────────────────────────────────────────────
// Simple in-memory rate limiter. Resets per Edge Function instance.
// Protects login/signup from brute-force attacks.
const _rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = _rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    _rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ── Caches ──────────────────────────────────────────────────────────────────
// Course structure + content: invalidated on every admin mutation.
// Settings: 5 min TTL, invalidated on admin save.
let _courseContentCache: { data: Record<string, unknown>; expiresAt: number } | null = null;
let _structureCache: { data: any; expiresAt: number } | null = null;
let _settingsCache: { data: any; expiresAt: number } | null = null;
let _statsCache: { data: any; expiresAt: number } | null = null;
let _analyticsCache: { data: any; expiresAt: number } | null = null;
let _locationIntelCache: { data: any; expiresAt: number } | null = null;
let _laundromatStatsCache: { data: any; expiresAt: number } | null = null;
const COURSE_CACHE_TTL_MS = 5 * 60 * 1000;
const STRUCTURE_CACHE_TTL_MS = 5 * 60 * 1000;
const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;
const STATS_CACHE_TTL_MS = 30 * 1000;
const ANALYTICS_CACHE_TTL_MS = 60 * 1000;
const LOCATION_INTEL_CACHE_TTL_MS = 5 * 60 * 1000;

function invalidateCourseCache() {
  _courseContentCache = null;
  _structureCache = null;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ── Course Structure (dynamic, stored in KV) ────────────────────────────────

const DEFAULT_COURSE_STRUCTURE = {
  modules: [
    {
      id: "module-1", title: "Foundation: The Laundromat Business Model",
      description: "Understand why laundromats work and what makes them profitable", duration: "45 min", order: 0,
      lessons: [
        { id: "module-1-lesson-1", title: "Why Laundromats?", duration: "8:24", order: 0, videoUrl: null },
        { id: "module-1-lesson-2", title: "The Business Model Explained", duration: "12:15", order: 1, videoUrl: null },
        { id: "module-1-lesson-3", title: "Cash Flow Fundamentals", duration: "7:42", order: 2, videoUrl: null },
        { id: "module-1-lesson-4", title: "Market Size and Opportunity", duration: "9:18", order: 3, videoUrl: null },
        { id: "module-1-lesson-5", title: "Common Mistakes to Avoid", duration: "6:55", order: 4, videoUrl: null },
        { id: "module-1-lesson-6", title: "Setting Your Goals", duration: "5:30", order: 5, videoUrl: null },
      ],
    },
    {
      id: "module-2", title: "Market Research: Finding Gold Locations",
      description: "Data-driven strategies for identifying profitable markets", duration: "60 min", order: 1,
      lessons: [
        { id: "module-2-lesson-1", title: "Demographics and Site Selection", duration: "10:20", order: 0, videoUrl: null },
        { id: "module-2-lesson-2", title: "Competition Analysis", duration: "9:45", order: 1, videoUrl: null },
        { id: "module-2-lesson-3", title: "Traffic and Visibility Factors", duration: "8:30", order: 2, videoUrl: null },
        { id: "module-2-lesson-4", title: "Reading Census Data", duration: "12:10", order: 3, videoUrl: null },
        { id: "module-2-lesson-5", title: "Evaluating Lease Terms", duration: "11:00", order: 4, videoUrl: null },
        { id: "module-2-lesson-6", title: "Building Your Target List", duration: "8:15", order: 5, videoUrl: null },
      ],
    },
    {
      id: "module-3", title: "Deal Analysis: The Numbers Game",
      description: "Master financial modeling and know exactly what to pay", duration: "55 min", order: 2,
      lessons: [
        { id: "module-3-lesson-1", title: "Reading an Income Statement", duration: "9:30", order: 0, videoUrl: null },
        { id: "module-3-lesson-2", title: "Gross Revenue vs. Net Income", duration: "8:45", order: 1, videoUrl: null },
        { id: "module-3-lesson-3", title: "Cap Rate and Valuation Methods", duration: "10:20", order: 2, videoUrl: null },
        { id: "module-3-lesson-4", title: "ROI and Cash-on-Cash Returns", duration: "11:15", order: 3, videoUrl: null },
        { id: "module-3-lesson-5", title: "Red Flags in Financials", duration: "7:50", order: 4, videoUrl: null },
        { id: "module-3-lesson-6", title: "Building Your Offer Price", duration: "8:00", order: 5, videoUrl: null },
      ],
    },
    {
      id: "module-4", title: "Securing the Deal: Financing & Negotiation",
      description: "Get funded and negotiate terms that work in your favor", duration: "50 min", order: 3,
      lessons: [
        { id: "module-4-lesson-1", title: "SBA Loans Explained", duration: "9:20", order: 0, videoUrl: null },
        { id: "module-4-lesson-2", title: "Seller Financing Strategies", duration: "8:40", order: 1, videoUrl: null },
        { id: "module-4-lesson-3", title: "What Lenders Look For", duration: "10:05", order: 2, videoUrl: null },
        { id: "module-4-lesson-4", title: "Negotiation Tactics That Work", duration: "9:55", order: 3, videoUrl: null },
        { id: "module-4-lesson-5", title: "Letter of Intent (LOI) Walkthrough", duration: "7:30", order: 4, videoUrl: null },
        { id: "module-4-lesson-6", title: "Closing the Deal", duration: "5:10", order: 5, videoUrl: null },
      ],
    },
    {
      id: "module-5", title: "Setup & Equipment: Building Your Store",
      description: "Equipment selection, layout optimization, and vendor relationships", duration: "65 min", order: 4,
      lessons: [
        { id: "module-5-lesson-1", title: "Washer and Dryer Selection", duration: "11:30", order: 0, videoUrl: null },
        { id: "module-5-lesson-2", title: "Store Layout Optimization", duration: "10:45", order: 1, videoUrl: null },
        { id: "module-5-lesson-3", title: "Payment Systems and Kiosks", duration: "9:20", order: 2, videoUrl: null },
        { id: "module-5-lesson-4", title: "Utility Planning: Water and Gas", duration: "12:00", order: 3, videoUrl: null },
        { id: "module-5-lesson-5", title: "Vendor Negotiations", duration: "11:10", order: 4, videoUrl: null },
        { id: "module-5-lesson-6", title: "Grand Opening Checklist", duration: "10:15", order: 5, videoUrl: null },
      ],
    },
    {
      id: "module-6", title: "Operations: Running a Tight Ship",
      description: "Systems and processes that keep things running smoothly", duration: "40 min", order: 5,
      lessons: [
        { id: "module-6-lesson-1", title: "Daily Operations Overview", duration: "7:15", order: 0, videoUrl: null },
        { id: "module-6-lesson-2", title: "Hiring and Managing Attendants", duration: "8:30", order: 1, videoUrl: null },
        { id: "module-6-lesson-3", title: "Maintenance Schedule", duration: "6:45", order: 2, videoUrl: null },
        { id: "module-6-lesson-4", title: "Customer Service Standards", duration: "5:50", order: 3, videoUrl: null },
        { id: "module-6-lesson-5", title: "Handling Problems and Disputes", duration: "6:20", order: 4, videoUrl: null },
        { id: "module-6-lesson-6", title: "Tracking KPIs", duration: "5:00", order: 5, videoUrl: null },
      ],
    },
    {
      id: "module-7", title: "Scale & Optimize: Building Your Portfolio",
      description: "Expand from one location to multiple cash-flowing assets", duration: "35 min", order: 6,
      lessons: [
        { id: "module-7-lesson-1", title: "When to Expand", duration: "5:45", order: 0, videoUrl: null },
        { id: "module-7-lesson-2", title: "Systems for Multiple Locations", duration: "6:30", order: 1, videoUrl: null },
        { id: "module-7-lesson-3", title: "Financing Your Second Deal", duration: "7:20", order: 2, videoUrl: null },
        { id: "module-7-lesson-4", title: "Building Your Team", duration: "5:10", order: 3, videoUrl: null },
        { id: "module-7-lesson-5", title: "Optimizing Existing Stores", duration: "5:45", order: 4, videoUrl: null },
        { id: "module-7-lesson-6", title: "Long-Term Wealth Strategy", duration: "4:50", order: 5, videoUrl: null },
      ],
    },
  ],
};

async function getCourseStructure(): Promise<typeof DEFAULT_COURSE_STRUCTURE> {
  // Serve from in-process cache when hot
  if (_structureCache && Date.now() < _structureCache.expiresAt) {
    return _structureCache.data;
  }

  const [stored, migrated] = await Promise.all([
    kv.get("course:structure"),
    kv.get("course:structure_migrated"),
  ]);

  if (stored && Array.isArray(stored.modules)) {
    // One-time migration: pull video URLs from legacy lesson: keys into structure
    if (!migrated) {
      const lessonEntries = await kv.getByPrefix("lesson:");
      if (lessonEntries.length > 0) {
        const lessonMap: Record<string, any> = {};
        for (const l of lessonEntries) { if (l?.id) lessonMap[l.id] = l; }
        for (const mod of stored.modules) {
          if (!Array.isArray(mod.lessons)) continue;
          for (const lesson of mod.lessons) {
            if (lessonMap[lesson.id]?.videoUrl && !lesson.videoUrl) {
              lesson.videoUrl = lessonMap[lesson.id].videoUrl;
            }
          }
        }
        await kv.set("course:structure", { ...stored, updatedAt: new Date().toISOString() });
      }
      await kv.set("course:structure_migrated", true);
    }
    _structureCache = { data: stored, expiresAt: Date.now() + STRUCTURE_CACHE_TTL_MS };
    return stored;
  }

  // First-time: seed from default
  const structure = JSON.parse(JSON.stringify(DEFAULT_COURSE_STRUCTURE));
  await Promise.all([
    kv.set("course:structure", { ...structure, updatedAt: new Date().toISOString() }),
    kv.set("course:structure_migrated", true),
  ]);
  _structureCache = { data: structure, expiresAt: Date.now() + STRUCTURE_CACHE_TTL_MS };
  return structure;
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Normalizes address+city+state into a consistent dedup key.
// All sources use this so a CSV and OSM entry for the same address are treated as the same location.
function normalizeAddr(address: string, city: string, state: string): string {
  return [address ?? "", city ?? "", state ?? ""]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Check dedup index and return existing entry id if a match already exists.
async function dedupCheck(address: string, city: string, state: string): Promise<string | null> {
  const key = normalizeAddr(address, city, state);
  if (!key || key.length < 4) return null; // too vague to dedup
  return await kv.get(`dedup:addr_${key}`) ?? null;
}

// Register entry in the dedup index.
async function dedupRegister(address: string, city: string, state: string, id: string): Promise<void> {
  const key = normalizeAddr(address, city, state);
  if (!key || key.length < 4) return;
  await kv.set(`dedup:addr_${key}`, id);
}

// Merge two entries — fills gaps in `base` with data from `extra`.
function mergeEntries(base: any, extra: any): any {
  return {
    ...base,
    note:    base.note    || extra.note    || null,
    address: base.address || extra.address || null,
    city:    base.city    || extra.city    || null,
    state:   base.state   || extra.state   || null,
    zip:     base.zip     || extra.zip     || null,
    lat:     base.lat     ?? extra.lat     ?? null,
    lon:     base.lon     ?? extra.lon     ?? null,
    updatedAt: new Date().toISOString(),
  };
}

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 64; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

// Session tokens embed the userId so authenticateUser can fetch session + user
// in a single parallel mget instead of two sequential round trips.
// Format: "{userId}|{64-char random secret}"
function createSessionToken(userId: string): string {
  return `${userId}|${generateId()}`;
}

function parseUserIdFromToken(token: string): string | null {
  const sep = token.indexOf("|");
  if (sep < 1) return null; // old-format tokens (no "|") gracefully fail
  return token.substring(0, sep);
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) return { valid: false, error: "Password must be at least 6 characters" };
  return { valid: true };
}

async function authenticateUser(token: string | undefined) {
  if (!token) return { user: null, error: "No token provided" };
  try {
    const userId = parseUserIdFromToken(token);
    if (!userId) return { user: null, error: "Invalid session" };

    // Single round trip: fetch session validity + user data in parallel
    const [session, userData] = await kv.mget([`session:${token}`, `user:${userId}`]);
    if (!session?.userId) return { user: null, error: "Invalid session" };

    const sessionAge = Date.now() - new Date(session.createdAt).getTime();
    if (sessionAge > 24 * 60 * 60 * 1000) {
      kv.del(`session:${token}`).catch(() => {}); // fire-and-forget cleanup
      return { user: null, error: "Session expired" };
    }

    if (!userData) return { user: null, error: "User not found" };
    return { user: userData, error: null };
  } catch (err) {
    console.error("[authenticateUser] Error:", err);
    return { user: null, error: "Authentication failed" };
  }
}

async function requireAdmin(token: string | undefined) {
  const { user, error } = await authenticateUser(token);
  if (error || !user) return { user: null, error: error || "Unauthorized", statusCode: 401 };
  if (!user.isAdmin) return { user: null, error: "Forbidden - Admin access required", statusCode: 403 };
  return { user, error: null, statusCode: 200 };
}

function logActivity(userId: string, userName: string, action: string): void {
  const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  kv.set(`activity:${id}`, {
    id,
    userId,
    userName,
    action,
    timestamp: new Date().toISOString(),
  }).catch((err) => console.error("[logActivity] Failed:", err));
}

// ── Health / Debug ─────────────────────────────────────────────────────────

app.get("/make-server-623b2a1c/health", (c) => c.json({ status: "ok" }));

app.get("/make-server-623b2a1c/debug/config", (c) =>
  c.json({
    hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
    hasAnonKey: !!Deno.env.get("SUPABASE_ANON_KEY"),
    hasServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  })
);

// ── Auth ───────────────────────────────────────────────────────────────────

app.post("/make-server-623b2a1c/signup", async (c) => {
  const ip = c.req.header("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip, 10, 60_000)) {
    return c.json({ error: "Too many attempts. Please try again later." }, 429);
  }
  try {
    const { email, password, name, couponCode, campaignRef } = await c.req.json();

    if (!isValidEmail(email)) return c.json({ error: "Invalid email format" }, 400);
    const pv = isValidPassword(password);
    if (!pv.valid) return c.json({ error: pv.error }, 400);
    if (!name?.trim()) return c.json({ error: "Name is required" }, 400);

    const emailLower = email.toLowerCase();
    const couponKey = couponCode ? `coupon:${couponCode.toUpperCase().trim()}` : null;

    // Parallelize: hash password + check email index + fetch coupon (if provided)
    const parallelKeys = [`email_index:${emailLower}`, ...(couponKey ? [couponKey] : [])];
    const [passwordHash, [emailIndex, couponRaw]] = await Promise.all([
      hashPassword(password),
      kv.mget(parallelKeys).then(r => [r[0], couponKey ? r[1] : null]),
    ]);

    // Fast duplicate check via email index
    if (emailIndex?.userId) {
      const existingUser = await kv.get(`user:${emailIndex.userId}`);
      if (existingUser) return c.json({ error: "A user with this email already exists" }, 400);
    }
    // Fetch all users (needed for isAdmin=first-user check below)
    const allUsers = await kv.getByPrefix("user:");
    // Fallback scan only when no index entry exists (legacy users without index)
    if (!emailIndex?.userId && allUsers.find((u: any) => u.email?.toLowerCase() === emailLower)) {
      return c.json({ error: "A user with this email already exists" }, 400);
    }

    // Validate free coupon if provided
    let coupon: any = couponRaw ?? null;
    if (couponCode) {
      if (!coupon || !coupon.active || coupon.discountType !== "free") return c.json({ error: "Invalid or non-free coupon code" }, 400);
      if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) return c.json({ error: "Coupon has expired" }, 400);
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return c.json({ error: "Coupon usage limit reached" }, 400);
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const settings = await getSettings();
    const priceNum = parseFloat(String(settings.coursePrice).replace(/[^0-9.]/g, "")) || 997;
    const userData = {
      id: userId,
      email: emailLower,
      name: name.trim(),
      isAdmin: allUsers.length === 0,
      completedModules: [],
      completedLessons: [],
      paymentStatus: coupon ? "coupon_free" : "paid",
      enrolledAt: new Date().toISOString(),
      campaignRef: campaignRef?.trim() || null,
    };

    const writes: Promise<any>[] = [
      kv.set(`user:${userId}`, userData),
      kv.set(`auth:${userId}`, { passwordHash, email: emailLower, createdAt: new Date().toISOString() }),
      kv.set(`email_index:${emailLower}`, { userId }),
    ];

    // Record payment (free via coupon or legacy direct signup)
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    writes.push(kv.set(`payment:${paymentId}`, {
      id: paymentId,
      userId,
      userName: name.trim(),
      userEmail: emailLower,
      originalAmount: priceNum,
      finalAmount: 0,
      discountAmount: priceNum,
      couponCode: coupon?.code ?? null,
      stripeSessionId: null,
      stripePaymentIntentId: null,
      status: coupon ? "coupon_free" : "direct",
      createdAt: new Date().toISOString(),
    }));

    // Auto-add to email contacts list
    const contactId = `contact_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    writes.push(kv.set(`email-contact:${contactId}`, { id: contactId, email: emailLower, name: name.trim(), addedAt: new Date().toISOString(), source: "signup" }));

    await Promise.all(writes);

    // Increment coupon usage
    if (coupon) {
      await kv.set(`coupon:${coupon.code}`, { ...coupon, usedCount: (coupon.usedCount ?? 0) + 1 });
    }

    const sessionToken = createSessionToken(userId);
    await kv.set(`session:${sessionToken}`, { userId, createdAt: new Date().toISOString() });

    logActivity(userId, userData.name, coupon ? `Signed up with coupon: ${coupon.code}` : "Signed up");

    return c.json({ success: true, token: sessionToken, user: userData });
  } catch (err) {
    console.error("[/signup] Error:", err);
    return c.json({ error: "Signup failed", details: err.message }, 500);
  }
});

app.post("/make-server-623b2a1c/login", async (c) => {
  const ip = c.req.header("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip, 10, 60_000)) {
    return c.json({ error: "Too many attempts. Please try again later." }, 429);
  }
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: "Email and password are required" }, 400);

    const emailLower = email.toLowerCase();
    const [passwordHash, emailIndex] = await Promise.all([
      hashPassword(password),
      kv.get(`email_index:${emailLower}`),
    ]);

    let user: any = null;

    // Fast path: O(1) email index lookup
    if (emailIndex?.userId) {
      user = await kv.get(`user:${emailIndex.userId}`);
    }

    // Fallback: full scan for legacy users + self-heal index
    if (!user) {
      const allUsers = await kv.getByPrefix("user:");
      user = allUsers.find((u: any) => u.email?.toLowerCase() === emailLower) ?? null;
      if (user) kv.set(`email_index:${emailLower}`, { userId: user.id }).catch(() => {});
    }

    if (!user) return c.json({ error: "Invalid credentials" }, 401);

    const storedAuth = await kv.get(`auth:${user.id}`);
    if (!storedAuth?.passwordHash) return c.json({ error: "Invalid credentials" }, 401);
    if (storedAuth.passwordHash !== passwordHash) return c.json({ error: "Invalid credentials" }, 401);

    const sessionToken = createSessionToken(user.id);
    await Promise.all([
      kv.set(`session:${sessionToken}`, { userId: user.id, createdAt: new Date().toISOString() }),
      kv.set(`user:${user.id}`, { ...user, lastActiveAt: new Date().toISOString() }),
    ]);

    logActivity(user.id, user.name, "Logged in");

    return c.json({ success: true, token: sessionToken, user });
  } catch (err) {
    console.error("[/login] Error:", err);
    return c.json({ error: "Login failed", details: err.message }, 500);
  }
});

app.post("/make-server-623b2a1c/logout", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (token) await kv.del(`session:${token}`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Logout failed", details: err.message }, 500);
  }
});

app.post("/make-server-623b2a1c/sync-user", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);
    return c.json({ user });
  } catch (err) {
    return c.json({ error: "Failed to sync user", details: err.message }, 500);
  }
});

app.get("/make-server-623b2a1c/user", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);
    return c.json({ user });
  } catch (err) {
    return c.json({ error: "Failed" }, 500);
  }
});

app.put("/make-server-623b2a1c/user/profile", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

    const { name } = await c.req.json();
    if (!name?.trim()) return c.json({ error: "Name is required" }, 400);

    user.name = name.trim();
    await kv.set(`user:${user.id}`, user);
    logActivity(user.id, user.name, "Updated profile");
    return c.json({ success: true, user });
  } catch (err) {
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

app.delete("/make-server-623b2a1c/user/account", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);
    if (user.isAdmin) return c.json({ error: "Admin accounts cannot be self-deleted" }, 403);

    const { password } = await c.req.json();
    if (!password) return c.json({ error: "Password is required" }, 400);

    // Verify password
    const authRecord = await kv.get(`auth:${user.id}`);
    if (!authRecord) return c.json({ error: "Could not verify identity" }, 403);
    const expectedHash = await hashPassword(password);
    if (authRecord.passwordHash !== expectedHash) return c.json({ error: "Incorrect password" }, 403);

    // Delete account + auth + session — location: keys are intentionally preserved
    const [sessions] = await Promise.all([kv.getByPrefix("session:")]);
    const sessionDeletes = (sessions as any[])
      .filter((s: any) => s.userId === user.id)
      .map((s: any) => kv.del(`session:${s.id ?? Object.keys(s)[0]}`));

    await Promise.all([
      kv.del(`user:${user.id}`),
      kv.del(`auth:${user.id}`),
      kv.del(`email_index:${user.email}`),
      ...sessionDeletes,
    ]);

    logActivity(user.id, user.name, "Deleted own account");
    return c.json({ success: true });
  } catch (err) {
    console.error("[DELETE /user/account] Error:", err);
    return c.json({ error: "Failed to delete account" }, 500);
  }
});

app.post("/make-server-623b2a1c/complete-module", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

    const { moduleId } = await c.req.json();
    const structure = await getCourseStructure();
    if (!moduleId || !structure.modules.find((m: any) => m.id === moduleId)) return c.json({ error: "Invalid module ID" }, 400);

    if (!user.completedModules.includes(moduleId)) {
      user.completedModules.push(moduleId);
      await kv.set(`user:${user.id}`, user);
      logActivity(user.id, user.name, `Completed ${moduleId}`);
    }

    return c.json({ completedModules: user.completedModules });
  } catch (err) {
    return c.json({ error: "Failed to complete module" }, 500);
  }
});

// ── Location Analysis (Census + OpenStreetMap, fully free) ─────────────────

app.post("/make-server-623b2a1c/analyze-location", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

    const { address, city, state, zip } = await c.req.json();
    if (!address?.trim() || !city?.trim() || !state?.trim()) {
      return c.json({ error: "Address, city, and state are required" }, 400);
    }

    const fullAddress = `${address}, ${city}, ${state}${zip ? ` ${zip}` : ""}`;

    // 1. Geocode via Nominatim
    const geocodeRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1&addressdetails=1`,
      { headers: { "User-Agent": "MayberryLaundromat/1.0" } }
    );
    const geocodeData = await geocodeRes.json();
    if (!geocodeData?.length) return c.json({ error: "Could not find that address. Check spelling and try again." }, 404);

    const { lat, lon, address: addrDetails } = geocodeData[0];
    const detectedZip = zip || addrDetails?.postcode || null;

    // 2. Census ACS + Census Business Patterns + Overpass + DB — run in parallel
    const [censusResult, censusBusinessResult, overpassRoadResult, overpassPoiResult, dbLaundromatsResult] = await Promise.allSettled([
      // Census ACS (demographics)
      (async () => {
        if (!detectedZip) return null;
        const res = await fetch(
          `https://api.census.gov/data/2023/acs/acs5?get=B19013_001E,B25003_001E,B25003_002E,B25003_003E,B01003_001E&for=zip%20code%20tabulation%20area:${detectedZip}`
        );
        const raw = await res.json();
        if (!Array.isArray(raw) || raw.length < 2) return null;
        const [, vals] = raw;
        const medianIncome = parseInt(vals[0]) || null;
        const totalHousing = parseInt(vals[1]) || 0;
        const ownerOccupied = parseInt(vals[2]) || 0;
        const renterOccupied = parseInt(vals[3]) || 0;
        const population = parseInt(vals[4]) || null;
        const renterPct = totalHousing > 0 ? Math.round((renterOccupied / totalHousing) * 100) : null;
        return { medianIncome, totalHousing, ownerOccupied, renterOccupied, renterPct, population };
      })(),
      // Census ZIP Business Patterns — laundromat count in ZIP (NAICS 812310)
      (async () => {
        if (!detectedZip) return null;
        const res = await fetch(
          `https://api.census.gov/data/2021/zbp?get=ESTAB&for=zipcode:${detectedZip}&NAICS2017=812310`
        );
        const raw = await res.json();
        if (!Array.isArray(raw) || raw.length < 2) return null;
        const count = parseInt(raw[1][0]);
        return isNaN(count) ? null : count;
      })(),
      // Road type (80m radius)
      (async () => {
        const q = `[out:json][timeout:10];way(around:80,${lat},${lon})[highway];out 1;`;
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST", body: `data=${encodeURIComponent(q)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        const d = await res.json();
        if (!d?.elements?.length) return null;
        return { type: d.elements[0].tags?.highway, name: d.elements[0].tags?.name };
      })(),
      // Nearby POIs — hotels, resorts, laundromats, apartments, universities (1-mile radius)
      (async () => {
        const q = `[out:json][timeout:15];(
          node(around:1609,${lat},${lon})[tourism~"hotel|resort|motel|apartment"];
          way(around:1609,${lat},${lon})[tourism~"hotel|resort|motel"];
          node(around:1609,${lat},${lon})[amenity~"laundry|laundromat"];
          way(around:1609,${lat},${lon})[amenity~"laundry|laundromat"];
          node(around:1609,${lat},${lon})[amenity~"university|college"];
          way(around:1609,${lat},${lon})[amenity~"university|college"];
          node(around:1609,${lat},${lon})[building~"apartments|residential|dormitory"];
          way(around:1609,${lat},${lon})[building~"apartments|residential|dormitory"];
          way(around:1609,${lat},${lon})[landuse~"residential|retail|commercial"];
          node(around:200,${lat},${lon})[tourism~"hotel|resort|motel|apartment"];
          way(around:200,${lat},${lon})[building~"hotel|resort"];
        );out tags center;`;
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST", body: `data=${encodeURIComponent(q)}`,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        return await res.json();
      })(),
      // DB: existing laundromats for this ZIP (fetched in parallel)
      (async () => {
        if (!detectedZip) return [];
        const all = await kv.getByPrefix("existing-laundromat:");
        return (all as any[]).filter((el: any) => el.zip === detectedZip);
      })(),
    ]);

    const censusData = censusResult.status === "fulfilled" ? censusResult.value : null;
    const censusLaundromats: number | null = censusBusinessResult.status === "fulfilled" ? censusBusinessResult.value as number | null : null;
    const roadRaw = overpassRoadResult.status === "fulfilled" ? overpassRoadResult.value : null;
    const poiRaw = overpassPoiResult.status === "fulfilled" ? overpassPoiResult.value : null;
    const dbLaundromatsInZip: any[] = dbLaundromatsResult.status === "fulfilled" ? dbLaundromatsResult.value as any[] : [];

    // Parse POIs
    const elements: any[] = poiRaw?.elements ?? [];
    const nearbyHotelsResorts = elements.filter(e =>
      ["hotel","resort","motel"].includes(e.tags?.tourism) ||
      ["hotel","resort"].includes(e.tags?.building)
    );
    const nearbyLaundromats = elements.filter(e =>
      ["laundry","laundromat"].includes(e.tags?.amenity)
    );

    // Auto-save OSM laundromats to database (fire-and-forget — builds DB passively)
    Promise.allSettled(nearbyLaundromats.map(async (osmEl: any) => {
      const osmId = `osm_${osmEl.type}_${osmEl.id}`;
      const elLat = osmEl.lat ?? osmEl.center?.lat ?? null;
      const elLon = osmEl.lon ?? osmEl.center?.lon ?? null;
      const elName = osmEl.tags?.name ?? osmEl.tags?.brand ?? null;
      const elAddr = osmEl.tags?.["addr:housenumber"] && osmEl.tags?.["addr:street"]
        ? `${osmEl.tags["addr:housenumber"]} ${osmEl.tags["addr:street"]}`.trim()
        : null;
      const elCity  = osmEl.tags?.["addr:city"]  ?? city  ?? "";
      const elState = osmEl.tags?.["addr:state"] ?? state ?? "";
      // Skip entries with no address
      if (!elAddr) return;
      // Check dedup index first (cross-source), then check OSM ID
      const dupId = await dedupCheck(elAddr, elCity, elState);
      if (dupId) {
        // Already exists — merge in any new data (e.g. lat/lon)
        const existing = await kv.get(`existing-laundromat:${dupId}`);
        if (existing) await kv.set(`existing-laundromat:${dupId}`, mergeEntries(existing, { lat: elLat ? parseFloat(elLat) : null, lon: elLon ? parseFloat(elLon) : null, note: elName }));
        return;
      }
      if (await kv.get(`existing-laundromat:${osmId}`)) return;
      const entry = {
        id: osmId, address: elAddr, city: elCity, state: elState,
        zip: osmEl.tags?.["addr:postcode"] ?? detectedZip ?? null,
        lat: elLat != null ? parseFloat(elLat) : null,
        lon: elLon != null ? parseFloat(elLon) : null,
        note: elName ?? null, source: "osm", reportedAt: new Date().toISOString(),
      };
      await kv.set(`existing-laundromat:${osmId}`, entry);
      await dedupRegister(elAddr, elCity, elState, osmId);
      _locationIntelCache = null; _laundromatStatsCache = null;
    }));
    const nearbyApartments = elements.filter(e =>
      ["apartments","residential","dormitory"].includes(e.tags?.building) ||
      e.tags?.landuse === "residential"
    );
    const nearbyUniversities = elements.filter(e =>
      ["university","college"].includes(e.tags?.amenity)
    );
    const isDirectlyTourist = elements.some(e =>
      (["hotel","resort","motel"].includes(e.tags?.tourism) || ["hotel","resort"].includes(e.tags?.building))
    );

    // Road scoring
    const roadTrafficMap: Record<string, { score: number; label: string }> = {
      motorway: { score: 10, label: "Highway / Freeway" },
      trunk: { score: 9, label: "Major Arterial" },
      primary: { score: 9, label: "Primary Road" },
      secondary: { score: 8, label: "Secondary Road" },
      tertiary: { score: 6, label: "Tertiary Road" },
      unclassified: { score: 4, label: "Minor Road" },
      residential: { score: 3, label: "Residential Street" },
      living_street: { score: 2, label: "Living Street" },
      service: { score: 2, label: "Service Road" },
    };
    const roadInfo = roadRaw?.type ? (roadTrafficMap[roadRaw.type] ?? { score: 5, label: roadRaw.type }) : null;

    // Base scores (0–10)
    let scoreIncome: number | null = (() => {
      if (!censusData?.medianIncome) return null;
      const inc = censusData.medianIncome;
      if (inc >= 28000 && inc <= 55000) return 10;
      if (inc >= 55001 && inc <= 75000) return 7;
      if (inc >= 20000 && inc < 28000) return 6;
      if (inc >= 75001 && inc <= 100000) return 4;
      if (inc < 20000) return 3;
      return 2;
    })();

    let scoreRenter: number | null = (() => {
      if (censusData?.renterPct == null) return null;
      const r = censusData.renterPct;
      if (r >= 60) return 10;
      if (r >= 45) return 8;
      if (r >= 30) return 5;
      if (r >= 20) return 3;
      return 1;
    })();

    let scoreRoad = roadInfo?.score ?? null;

    // Location-specific modifiers based on nearby POIs
    const locationFlags: { type: "warning" | "positive" | "neutral"; message: string }[] = [];

    // Tourist/resort penalty — this is the big one your condo hit
    if (nearbyHotelsResorts.length >= 2) {
      scoreIncome = scoreIncome != null ? Math.max(1, scoreIncome - 3) : null;
      scoreRenter = scoreRenter != null ? Math.max(1, scoreRenter - 4) : null;
      locationFlags.push({ type: "warning", message: `${nearbyHotelsResorts.length} hotels/resorts nearby — tourist area. Guests use hotel laundry, not coin-ops.` });
    } else if (nearbyHotelsResorts.length === 1) {
      scoreRenter = scoreRenter != null ? Math.max(1, scoreRenter - 2) : null;
      locationFlags.push({ type: "warning", message: "Hotel or resort nearby — area may be tourist-oriented rather than residential." });
    }

    // Competition — use highest count across Census, OSM (1-mile radius), and known DB
    const censusCount = censusLaundromats ?? 0;
    const osmCount = nearbyLaundromats.length;
    const dbCount = dbLaundromatsInZip.length;
    const competitorCount = Math.max(censusCount, osmCount, dbCount);
    const competitorSource =
      censusLaundromats != null && censusCount === competitorCount ? "Census Business Data" :
      dbCount === competitorCount && dbCount >= osmCount ? "Location Database" :
      "OpenStreetMap";
    if (competitorCount >= 4) {
      scoreRoad = scoreRoad != null ? Math.max(1, scoreRoad - 3) : null;
      locationFlags.push({ type: "warning", message: `${competitorCount} laundromats in this ZIP (${competitorSource}) — heavy competition.` });
    } else if (competitorCount >= 2) {
      scoreRoad = scoreRoad != null ? Math.max(1, scoreRoad - 1) : null;
      locationFlags.push({ type: "neutral", message: `${competitorCount} laundromats in this ZIP (${competitorSource}) — moderate competition.` });
    } else if (competitorCount === 1) {
      locationFlags.push({ type: "neutral", message: `1 laundromat in this ZIP (${competitorSource}) — limited competition, may indicate proven demand.` });
    } else {
      locationFlags.push({ type: "positive", message: `No laundromats found in this ZIP (${competitorSource}) — potentially unserved market.` });
    }

    // Apartment density bonus
    if (nearbyApartments.length >= 3) {
      scoreRenter = scoreRenter != null ? Math.min(10, scoreRenter + 1) : null;
      locationFlags.push({ type: "positive", message: `${nearbyApartments.length} apartment/residential buildings nearby — strong captive customer base.` });
    } else if (nearbyApartments.length > 0) {
      locationFlags.push({ type: "positive", message: `${nearbyApartments.length} residential building(s) nearby.` });
    }

    // University bonus
    if (nearbyUniversities.length > 0) {
      scoreRenter = scoreRenter != null ? Math.min(10, scoreRenter + 2) : null;
      locationFlags.push({ type: "positive", message: "University or college nearby — students are reliable laundromat customers." });
    }

    // Weighted viability score (renters 40%, income 35%, road 25%)
    const scoreInputs = [
      scoreRenter != null ? { s: scoreRenter, w: 0.4 } : null,
      scoreIncome != null ? { s: scoreIncome, w: 0.35 } : null,
      scoreRoad != null ? { s: scoreRoad, w: 0.25 } : null,
    ].filter(Boolean) as { s: number; w: number }[];

    let viabilityScore: number | null = null;
    if (scoreInputs.length > 0) {
      const totalWeight = scoreInputs.reduce((s, x) => s + x.w, 0);
      viabilityScore = Math.round(scoreInputs.reduce((s, x) => s + x.s * x.w, 0) / totalWeight * 10) / 10;
    }

    // Community intel for this ZIP
    let communityIntel: any = null;
    const communityLaundromats: any[] = dbLaundromatsInZip.map((el: any) => ({
      address: el.address, city: el.city, note: el.note, reportedAt: el.reportedAt,
    }));
    if (detectedZip) {
      const zipIntel = await kv.get(`zip-intel:${detectedZip}`);
      if (zipIntel && zipIntel.analysisCount > 0) {
        communityIntel = {
          analysisCount: zipIntel.analysisCount,
          avgViability: Math.round((zipIntel.totalViability / zipIntel.analysisCount) * 10) / 10,
          avgRenterPct: zipIntel.renterCount > 0 ? Math.round(zipIntel.totalRenterPct / zipIntel.renterCount) : null,
          avgIncome: zipIntel.incomeCount > 0 ? Math.round(zipIntel.totalIncome / zipIntel.incomeCount) : null,
        };
      }
    }

    return c.json({
      geocode: { lat: parseFloat(lat), lon: parseFloat(lon), displayName: geocodeData[0].display_name },
      zip: detectedZip,
      census: censusData,
      road: roadInfo ? { type: roadRaw?.type, label: roadInfo.label, score: roadInfo.score, name: roadRaw?.name } : null,
      nearby: {
        hotelsResorts: nearbyHotelsResorts.length,
        laundromats: competitorCount,
        laundromatsSource: competitorSource,
        apartments: nearbyApartments.length,
        universities: nearbyUniversities.length,
        isTouristArea: isDirectlyTourist,
      },
      locationFlags,
      scores: { income: scoreIncome, renter: scoreRenter, road: scoreRoad, viability: viabilityScore },
      communityIntel,
      communityLaundromats,
    });
  } catch (err) {
    console.error("[analyze-location] Error:", err);
    return c.json({ error: "Analysis failed. Please try again." }, 500);
  }
});

// ── Locations ──────────────────────────────────────────────────────────────

app.post("/make-server-623b2a1c/locations", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

    const { address, city, state, notes, dealScore, status, analysisData } = await c.req.json();
    if (!address?.trim() || !city?.trim() || !state?.trim()) {
      return c.json({ error: "Address, city, and state are required" }, 400);
    }

    const locationId = `loc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const location = {
      id: locationId,
      userId: user.id,
      userName: user.name,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      notes: notes?.trim() ?? "",
      dealScore: Math.min(10, Math.max(0, Number(dealScore) || 5)),
      status: status ?? "researching",
      analysisData: analysisData ?? null,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`location:${locationId}`, location);

    // Upsert ZIP intel aggregate
    const zip = analysisData?.zip;
    if (zip && analysisData?.scores?.viability != null) {
      const key = `zip-intel:${zip}`;
      const existing = (await kv.get(key)) ?? { zip, analysisCount: 0, totalViability: 0, totalRenterPct: 0, renterCount: 0, totalIncome: 0, incomeCount: 0 };
      existing.analysisCount = (existing.analysisCount || 0) + 1;
      existing.totalViability = (existing.totalViability || 0) + (analysisData.scores.viability ?? 0);
      if (analysisData.census?.renterPct != null) { existing.totalRenterPct = (existing.totalRenterPct || 0) + analysisData.census.renterPct; existing.renterCount = (existing.renterCount || 0) + 1; }
      if (analysisData.census?.medianIncome != null && analysisData.census.medianIncome > 0) { existing.totalIncome = (existing.totalIncome || 0) + analysisData.census.medianIncome; existing.incomeCount = (existing.incomeCount || 0) + 1; }
      existing.lastUpdated = new Date().toISOString();
      await kv.set(key, existing);
    }

    logActivity(user.id, user.name, `Added location: ${address}, ${city}`);
    return c.json({ success: true, location });
  } catch (err) {
    return c.json({ error: "Failed to save location", details: err.message }, 500);
  }
});

app.get("/make-server-623b2a1c/locations/my", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

    const allLocations = await kv.getByPrefix("location:");
    const myLocations = allLocations.filter((l: any) => l.userId === user.id);
    myLocations.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ locations: myLocations });
  } catch (err) {
    return c.json({ error: "Failed to fetch locations" }, 500);
  }
});

app.put("/make-server-623b2a1c/locations/:id", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

    const locationId = c.req.param("id");
    const location = await kv.get(`location:${locationId}`);
    if (!location) return c.json({ error: "Location not found" }, 404);
    if (location.userId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);

    const { address, city, state, notes, dealScore, status } = await c.req.json();
    const updated = {
      ...location,
      address: address?.trim() ?? location.address,
      city: city?.trim() ?? location.city,
      state: state?.trim() ?? location.state,
      notes: notes?.trim() ?? location.notes,
      dealScore: dealScore !== undefined ? Math.min(10, Math.max(0, Number(dealScore))) : location.dealScore,
      status: status ?? location.status,
    };

    await kv.set(`location:${locationId}`, updated);
    return c.json({ success: true, location: updated });
  } catch (err) {
    return c.json({ error: "Failed to update location" }, 500);
  }
});

app.delete("/make-server-623b2a1c/locations/:id", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

    const locationId = c.req.param("id");
    const location = await kv.get(`location:${locationId}`);
    if (!location) return c.json({ error: "Location not found" }, 404);
    if (location.userId !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);

    await kv.del(`location:${locationId}`);
    logActivity(user.id, user.name, `Deleted location: ${location.address}, ${location.city}`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Failed to delete location" }, 500);
  }
});

app.post("/make-server-623b2a1c/locations/mark-existing", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);
    const { address, city, state, zip, lat, lon, note } = await c.req.json();
    if (!address?.trim()) return c.json({ error: "Address is required" }, 400);
    const cleanAddr  = address.trim();
    const cleanCity  = city?.trim()  ?? "";
    const cleanState = state?.trim() ?? "";
    // Dedup check — skip if already in DB from any source
    const dupId = await dedupCheck(cleanAddr, cleanCity, cleanState);
    if (dupId) {
      // Merge student data (note, lat/lon) into existing entry silently
      const existing = await kv.get(`existing-laundromat:${dupId}`);
      if (existing) await kv.set(`existing-laundromat:${dupId}`, mergeEntries(existing, { note: note?.trim() ?? null, lat: lat ?? null, lon: lon ?? null, source: "student" }));
      _locationIntelCache = null; _laundromatStatsCache = null;
      return c.json({ success: true });
    }
    const id = `elm_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const entry = {
      id, address: cleanAddr, city: cleanCity, state: cleanState,
      zip: zip ?? null, lat: lat ?? null, lon: lon ?? null,
      note: note?.trim() ?? "", source: "student", reportedAt: new Date().toISOString(),
    };
    await kv.set(`existing-laundromat:${id}`, entry);
    await dedupRegister(cleanAddr, cleanCity, cleanState, id);
    _locationIntelCache = null; _laundromatStatsCache = null;
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Failed to save" }, 500);
  }
});

app.get("/make-server-623b2a1c/admin/location-intelligence", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    if (_locationIntelCache && Date.now() < _locationIntelCache.expiresAt) {
      return c.json(_locationIntelCache.data);
    }

    const [zipIntels, existingLaundromats] = await Promise.all([
      kv.getByPrefix("zip-intel:"),
      kv.getByPrefix("existing-laundromat:"),
    ]);

    // Group existing laundromats by ZIP
    const flaggedByZip: Record<string, number> = {};
    for (const el of existingLaundromats as any[]) {
      if (el.zip) flaggedByZip[el.zip] = (flaggedByZip[el.zip] || 0) + 1;
    }

    const markets = (zipIntels as any[]).map((z: any) => ({
      zip: z.zip,
      analysisCount: z.analysisCount,
      avgViability: z.analysisCount > 0 ? Math.round((z.totalViability / z.analysisCount) * 10) / 10 : null,
      avgRenterPct: z.renterCount > 0 ? Math.round(z.totalRenterPct / z.renterCount) : null,
      avgIncome: z.incomeCount > 0 ? Math.round(z.totalIncome / z.incomeCount) : null,
      flaggedCompetitors: flaggedByZip[z.zip] ?? 0,
      lastUpdated: z.lastUpdated,
    })).sort((a: any, b: any) => b.analysisCount - a.analysisCount).slice(0, 20);

    const result = { markets, totalZipsAnalyzed: zipIntels.length, totalFlagged: existingLaundromats.length };
    _locationIntelCache = { data: result, expiresAt: Date.now() + LOCATION_INTEL_CACHE_TTL_MS };
    return c.json(result);
  } catch (err) {
    return c.json({ error: "Failed to fetch location intelligence" }, 500);
  }
});

app.get("/make-server-623b2a1c/admin/all-locations", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const allLocations = await kv.getByPrefix("location:");
    allLocations.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ locations: allLocations });
  } catch (err) {
    return c.json({ error: "Failed to fetch locations" }, 500);
  }
});

// ── Activity Log ───────────────────────────────────────────────────────────

app.get("/make-server-623b2a1c/admin/activity", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const allActivity = await kv.getByPrefix("activity:");
    allActivity.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return c.json({ activity: allActivity.slice(0, 100) });
  } catch (err) {
    return c.json({ error: "Failed to fetch activity" }, 500);
  }
});

// ── Settings ───────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = { platformName: "Mayberry Laundromat Course", coursePrice: "$997" };

async function getSettings() {
  if (_settingsCache && Date.now() < _settingsCache.expiresAt) return _settingsCache.data;
  const stored = await kv.get("settings:platform");
  const data = stored ?? DEFAULT_SETTINGS;
  _settingsCache = { data, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
  return data;
}

app.get("/make-server-623b2a1c/settings", async (c) => {
  try {
    return c.json({ settings: await getSettings() });
  } catch (err) {
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

app.put("/make-server-623b2a1c/settings", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const { platformName, coursePrice, emailFromName, emailFromEmail } = await c.req.json();
    const existing = await getSettings();
    const settings = {
      ...existing,
      platformName: platformName?.trim() ?? existing.platformName ?? "Mayberry Laundromat Course",
      coursePrice: coursePrice?.trim() ?? existing.coursePrice ?? "$997",
      emailFromName: emailFromName?.trim() ?? existing.emailFromName ?? "",
      emailFromEmail: emailFromEmail?.trim() ?? existing.emailFromEmail ?? "",
      updatedAt: new Date().toISOString(),
    };

    await kv.set("settings:platform", settings);
    _settingsCache = { data: settings, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
    logActivity(user.id, user.name, "Updated platform settings");
    return c.json({ success: true, settings });
  } catch (err) {
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

// ── Admin Users ────────────────────────────────────────────────────────────

app.get("/make-server-623b2a1c/admin/users", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const allUsers = await kv.getByPrefix("user:");
    return c.json({ users: allUsers });
  } catch (err) {
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

app.get("/make-server-623b2a1c/admin/stats", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    if (_statsCache && Date.now() < _statsCache.expiresAt) return c.json(_statsCache.data);

    const [allUsers, structure, payments, pageVisits] = await Promise.all([
      kv.getByPrefix("user:"),
      getCourseStructure(),
      kv.getByPrefix("payment:"),
      kv.getByPrefix("page-visit:"),
    ]);

    const moduleCompletions: Record<string, number> = {};
    for (const m of structure.modules) moduleCompletions[m.id] = 0;
    for (const u of allUsers as any[]) {
      for (const m of (u.completedModules ?? [])) {
        if (moduleCompletions[m] !== undefined) moduleCompletions[m]++;
      }
    }

    const totalRevenue = (payments as any[]).reduce((sum: number, p: any) => {
      const amount = typeof p.finalAmount === "number" ? p.finalAmount : 0;
      return sum + (p.status !== "coupon_free" && amount > 0 ? amount : 0);
    }, 0);

    const recentUsers = [...allUsers as any[]]
      .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime())
      .slice(0, 5);

    const result = {
      stats: {
        totalUsers: allUsers.length,
        totalAdmins: (allUsers as any[]).filter((u: any) => u.isAdmin).length,
        totalStudents: (allUsers as any[]).filter((u: any) => !u.isAdmin).length,
        totalRevenue,
        totalVisitors: (pageVisits as any[]).length,
        moduleCompletions,
        recentUsers,
      },
    };
    _statsCache = { data: result, expiresAt: Date.now() + STATS_CACHE_TTL_MS };
    return c.json(result);
  } catch (err) {
    console.error("[/admin/stats] Error:", err);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

app.post("/make-server-623b2a1c/admin/toggle-admin", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const { userId, password } = await c.req.json();
    if (!userId) return c.json({ error: "User ID is required" }, 400);
    if (!password) return c.json({ error: "Your password is required to change roles" }, 400);
    if (user.id === userId) return c.json({ error: "You cannot change your own admin privileges" }, 400);

    // Verify the requesting admin's password
    const adminAuth = await kv.get(`auth:${user.id}`);
    if (!adminAuth) return c.json({ error: "Could not verify identity" }, 403);
    const expectedHash = await hashPassword(password);
    if (adminAuth.passwordHash !== expectedHash) return c.json({ error: "Incorrect password" }, 403);

    const targetUser = await kv.get(`user:${userId}`);
    if (!targetUser) return c.json({ error: "User not found" }, 404);

    targetUser.isAdmin = !targetUser.isAdmin;
    await kv.set(`user:${userId}`, targetUser);
    logActivity(user.id, user.name, `${targetUser.isAdmin ? "Granted" : "Revoked"} admin for ${targetUser.name}`);
    return c.json({ success: true, user: targetUser });
  } catch (err) {
    return c.json({ error: "Failed to toggle admin status" }, 500);
  }
});

app.delete("/make-server-623b2a1c/admin/users/:userId", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const userIdToDelete = c.req.param("userId");
    if (user.id === userIdToDelete) return c.json({ error: "You cannot delete your own account" }, 400);

    const targetUser = await kv.get(`user:${userIdToDelete}`);
    if (!targetUser) return c.json({ error: "User not found" }, 404);

    await kv.del(`user:${userIdToDelete}`);
    await kv.del(`auth:${userIdToDelete}`);
    logActivity(user.id, user.name, `Deleted user: ${targetUser.name}`);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Failed to delete user" }, 500);
  }
});

app.put("/make-server-623b2a1c/admin/users/:userId/modules", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const userId = c.req.param("userId");
    const { completedModules } = await c.req.json();
    if (!Array.isArray(completedModules)) return c.json({ error: "completedModules must be an array" }, 400);

    const [targetUser, structure] = await Promise.all([
      kv.get(`user:${userId}`),
      getCourseStructure(),
    ]);
    if (!targetUser) return c.json({ error: "User not found" }, 404);

    const validIds = new Set(structure.modules.map((m: any) => m.id));
    const invalid = completedModules.filter((m: string) => !validIds.has(m));
    if (invalid.length > 0) return c.json({ error: `Invalid module IDs: ${invalid.join(", ")}` }, 400);

    targetUser.completedModules = completedModules;
    await kv.set(`user:${userId}`, targetUser);
    return c.json({ success: true, user: targetUser });
  } catch (err) {
    return c.json({ error: "Failed to update user modules" }, 500);
  }
});

// ── Course Content ─────────────────────────────────────────────────────────

app.get("/make-server-623b2a1c/course/content", async (c) => {
  try {
    if (_courseContentCache && Date.now() < _courseContentCache.expiresAt) {
      return c.json(_courseContentCache.data);
    }
    // Build video map from dynamic structure
    const structure = await getCourseStructure();
    const videoMap: Record<string, any> = {};
    for (const mod of structure.modules) {
      for (const lesson of mod.lessons) {
        videoMap[lesson.id] = lesson;
      }
    }
    const result = { lessons: videoMap };
    _courseContentCache = { data: result, expiresAt: Date.now() + COURSE_CACHE_TTL_MS };
    return c.json(result);
  } catch (err) {
    return c.json({ error: "Failed to fetch course content" }, 500);
  }
});

app.post("/make-server-623b2a1c/complete-lesson", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error } = await authenticateUser(token);
    if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

    const { lessonId } = await c.req.json();
    const structure = await getCourseStructure();
    const parentModule = structure.modules.find((m: any) => m.lessons.some((l: any) => l.id === lessonId));
    if (!lessonId || !parentModule) return c.json({ error: "Invalid lesson ID" }, 400);

    if (!Array.isArray(user.completedLessons)) user.completedLessons = [];

    let moduleCompleted: string | null = null;

    if (!user.completedLessons.includes(lessonId)) {
      user.completedLessons.push(lessonId);

      const allModuleLessonIds = parentModule.lessons.map((l: any) => l.id);
      const allDone = allModuleLessonIds.every((id: string) => user.completedLessons.includes(id));
      if (allDone && !user.completedModules.includes(parentModule.id)) {
        user.completedModules.push(parentModule.id);
        moduleCompleted = parentModule.id;
        logActivity(user.id, user.name, `Completed module: ${parentModule.title}`);
      }

      await kv.set(`user:${user.id}`, user);
      logActivity(user.id, user.name, `Completed lesson: ${lessonId}`);
    }

    return c.json({
      completedLessons: user.completedLessons,
      completedModules: user.completedModules,
      moduleCompleted,
    });
  } catch (err) {
    return c.json({ error: "Failed to complete lesson" }, 500);
  }
});

app.put("/make-server-623b2a1c/admin/lessons/:lessonId", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const lessonId = c.req.param("lessonId");
    const structure = await getCourseStructure();
    const parentMod = structure.modules.find((m: any) => m.lessons.some((l: any) => l.id === lessonId));
    if (!parentMod) return c.json({ error: "Invalid lesson ID" }, 400);

    const { videoUrl, duration } = await c.req.json();
    const lesson = parentMod.lessons.find((l: any) => l.id === lessonId);
    if (videoUrl !== undefined) lesson.videoUrl = videoUrl || null;
    if (duration !== undefined) lesson.duration = duration;
    await kv.set("course:structure", { ...structure, updatedAt: new Date().toISOString() });
    invalidateCourseCache();
    logActivity(user.id, user.name, `Updated lesson: ${lessonId}`);
    return c.json({ success: true, lesson });
  } catch (err) {
    return c.json({ error: "Failed to update lesson" }, 500);
  }
});

app.get("/make-server-623b2a1c/admin/course/status", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const structure = await getCourseStructure();
    const videoMap: Record<string, any> = {};
    for (const mod of structure.modules) {
      for (const lesson of mod.lessons) { videoMap[lesson.id] = lesson; }
    }
    const allLessons = structure.modules.flatMap((m: any) => m.lessons);
    const uploadedCount = allLessons.filter((l: any) => l.videoUrl).length;
    return c.json({
      lessons: videoMap,
      totalLessons: allLessons.length,
      uploadedCount,
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch course status" }, 500);
  }
});

// ── Password Reset ─────────────────────────────────────────────────────────

function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

app.post("/make-server-623b2a1c/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json();

    // Always return success to avoid revealing if an email exists
    if (!email || !isValidEmail(email)) return c.json({ success: true });

    const emailLower = email.toLowerCase();

    let user: any = null;
    const emailIndex = await kv.get(`email_index:${emailLower}`);
    if (emailIndex?.userId) user = await kv.get(`user:${emailIndex.userId}`);
    if (!user) {
      const allUsers = await kv.getByPrefix("user:");
      user = allUsers.find((u: any) => u.email?.toLowerCase() === emailLower) ?? null;
    }
    if (!user) return c.json({ success: true });

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await kv.set(`reset:${token}`, {
      userId: user.id,
      email: emailLower,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://mayberrylaundromat.com";
    const resetLink = `${siteUrl}/reset-password?token=${token}`;

    if (resendApiKey) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: Deno.env.get("FROM_EMAIL") ?? "onboarding@resend.dev",
          to: [user.email],
          subject: "Reset your password",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;">
  <h1 style="font-size:28px;font-weight:900;margin:0 0 8px;">Reset Your Password</h1>
  <p style="color:#525252;margin:0 0 24px;">Hi ${user.name},</p>
  <p style="color:#525252;margin:0 0 32px;">We received a request to reset your password. Click the button below to set a new one. This link expires in <strong>1 hour</strong>.</p>
  <a href="${resetLink}" style="display:inline-block;background:#000;color:#fff;padding:14px 32px;font-weight:700;text-decoration:none;font-size:16px;letter-spacing:0.05em;">RESET PASSWORD</a>
  <p style="color:#a3a3a3;font-size:13px;margin:32px 0 0;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
</div>`,
        }),
      }).catch((err) => console.error("[forgot-password] Email send failed:", err));
    } else {
      console.log(`[forgot-password] No RESEND_API_KEY. Reset link: ${resetLink}`);
    }

    logActivity(user.id, user.name, "Requested password reset");
    return c.json({ success: true });
  } catch (err) {
    console.error("[/forgot-password] Error:", err);
    return c.json({ success: true });
  }
});

app.post("/make-server-623b2a1c/reset-password", async (c) => {
  try {
    const { token, password } = await c.req.json();
    if (!token || !password) return c.json({ error: "Token and password are required" }, 400);

    const pv = isValidPassword(password);
    if (!pv.valid) return c.json({ error: pv.error }, 400);

    const resetData = await kv.get(`reset:${token}`);
    if (!resetData) return c.json({ error: "Invalid or expired reset link" }, 400);

    if (new Date() > new Date(resetData.expiresAt)) {
      await kv.del(`reset:${token}`);
      return c.json({ error: "This reset link has expired. Please request a new one." }, 400);
    }

    const user = await kv.get(`user:${resetData.userId}`);
    if (!user) return c.json({ error: "User not found" }, 400);

    const newHash = await hashPassword(password);
    const existingAuth = (await kv.get(`auth:${resetData.userId}`)) ?? {};
    await Promise.all([
      kv.set(`auth:${resetData.userId}`, {
        ...existingAuth,
        passwordHash: newHash,
        updatedAt: new Date().toISOString(),
      }),
      kv.del(`reset:${token}`),
    ]);

    logActivity(user.id, user.name, "Reset password");
    return c.json({ success: true });
  } catch (err) {
    console.error("[/reset-password] Error:", err);
    return c.json({ error: "Failed to reset password" }, 500);
  }
});

// ── Seed Demo ──────────────────────────────────────────────────────────────

app.post("/make-server-623b2a1c/seed-demo-users", async (c) => {
  try {
    // Only allow seeding when no users exist yet (self-sealing: useless after first real signup)
    const existingUsers = await kv.getByPrefix("user:");
    if (existingUsers.length > 0) {
      return c.json({ error: "Seed disabled: users already exist in the system" }, 403);
    }

    const demoUsers = [
      { email: "admin@laundromat.com", password: "Admin123!", name: "Peter Mayberry", isAdmin: true },
      { email: "student@laundromat.com", password: "Student123!", name: "John Student", isAdmin: false },
    ];

    const results = [];
    const allSeedUsers = await kv.getByPrefix("user:");

    for (const demo of demoUsers) {
      try {
        const existingUser = allSeedUsers.find((u: any) => u.email === demo.email);

        if (existingUser) {
          const existingAuth = await kv.get(`auth:${existingUser.id}`);
          if (!existingAuth) {
            const passwordHash = await hashPassword(demo.password);
            await Promise.all([
              kv.set(`auth:${existingUser.id}`, { passwordHash, email: demo.email, createdAt: new Date().toISOString() }),
              kv.set(`email_index:${demo.email}`, { userId: existingUser.id }),
            ]);
            results.push({ email: demo.email, status: "auth_created", user: existingUser });
          } else {
            kv.set(`email_index:${demo.email}`, { userId: existingUser.id }).catch(() => {});
            results.push({ email: demo.email, status: "already_exists", user: existingUser });
          }
          continue;
        }

        const userId = `user_${demo.email.split('@')[0]}_${Date.now()}`;
        const passwordHash = await hashPassword(demo.password);
        const userData = {
          id: userId,
          email: demo.email,
          name: demo.name,
          isAdmin: demo.isAdmin,
          completedModules: demo.isAdmin ? ["module-1", "module-2"] : ["module-1"],
          enrolledAt: new Date().toISOString(),
        };

        await Promise.all([
          kv.set(`user:${userId}`, userData),
          kv.set(`auth:${userId}`, { passwordHash, email: demo.email, createdAt: new Date().toISOString() }),
          kv.set(`email_index:${demo.email}`, { userId }),
        ]);
        results.push({ email: demo.email, status: "created", user: userData });
      } catch (err) {
        results.push({ email: demo.email, status: "error", error: err.message });
      }
    }

    return c.json({
      success: true,
      message: "Demo users seeded",
      results,
      credentials: {
        admin: { email: "admin@laundromat.com", password: "Admin123!" },
        student: { email: "student@laundromat.com", password: "Student123!" },
      },
    });
  } catch (err) {
    return c.json({ error: "Failed to seed demo users" }, 500);
  }
});

// ── Coupon System ──────────────────────────────────────────────────────────

app.post("/make-server-623b2a1c/admin/coupons", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  const { user, error, statusCode } = await requireAdmin(token);
  if (error) return c.json({ error }, statusCode);

  try {
    const { code, discountType, discountValue, maxUses, expiresAt } = await c.req.json();
    if (!code || !discountType) return c.json({ error: "code and discountType are required" }, 400);
    if (!["free", "percent", "fixed"].includes(discountType)) return c.json({ error: "discountType must be free, percent, or fixed" }, 400);
    if (discountType !== "free" && (!discountValue || Number(discountValue) <= 0)) return c.json({ error: "discountValue required for non-free coupons" }, 400);

    const upperCode = code.toUpperCase().trim().replace(/\s+/g, "");
    const existing = await kv.get(`coupon:${upperCode}`);
    if (existing) return c.json({ error: "Coupon code already exists" }, 400);

    const coupon = {
      code: upperCode,
      discountType,
      discountValue: discountType === "free" ? 100 : Number(discountValue),
      maxUses: maxUses ? Number(maxUses) : null,
      usedCount: 0,
      expiresAt: expiresAt ?? null,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    await kv.set(`coupon:${upperCode}`, coupon);
    logActivity(user.id, user.name, `Created coupon: ${upperCode}`);
    return c.json({ success: true, coupon });
  } catch (err) {
    console.error("[POST /admin/coupons]", err);
    return c.json({ error: "Failed to create coupon" }, 500);
  }
});

app.get("/make-server-623b2a1c/admin/coupons", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  const { error, statusCode } = await requireAdmin(token);
  if (error) return c.json({ error }, statusCode);

  try {
    const coupons = await kv.getByPrefix("coupon:");
    coupons.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ coupons });
  } catch (err) {
    console.error("[GET /admin/coupons]", err);
    return c.json({ error: "Failed to fetch coupons" }, 500);
  }
});

app.patch("/make-server-623b2a1c/admin/coupons/:code", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  const { user, error, statusCode } = await requireAdmin(token);
  if (error) return c.json({ error }, statusCode);

  try {
    const code = c.req.param("code").toUpperCase();
    const coupon = await kv.get(`coupon:${code}`);
    if (!coupon) return c.json({ error: "Coupon not found" }, 404);

    const updates = await c.req.json();
    const updated = { ...coupon, ...updates, code, updatedAt: new Date().toISOString() };
    await kv.set(`coupon:${code}`, updated);
    logActivity(user.id, user.name, `Updated coupon: ${code}`);
    return c.json({ success: true, coupon: updated });
  } catch (err) {
    console.error("[PATCH /admin/coupons/:code]", err);
    return c.json({ error: "Failed to update coupon" }, 500);
  }
});

app.delete("/make-server-623b2a1c/admin/coupons/:code", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  const { user, error, statusCode } = await requireAdmin(token);
  if (error) return c.json({ error }, statusCode);

  try {
    const code = c.req.param("code").toUpperCase();
    const coupon = await kv.get(`coupon:${code}`);
    if (!coupon) return c.json({ error: "Coupon not found" }, 404);

    await kv.del(`coupon:${code}`);
    logActivity(user.id, user.name, `Deleted coupon: ${code}`);
    return c.json({ success: true });
  } catch (err) {
    console.error("[DELETE /admin/coupons/:code]", err);
    return c.json({ error: "Failed to delete coupon" }, 500);
  }
});

app.post("/make-server-623b2a1c/validate-coupon", async (c) => {
  const ip = c.req.header("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip, 10, 60_000)) return c.json({ valid: false, error: "Too many requests. Please try again later." });

  try {
    const { code } = await c.req.json();
    if (!code) return c.json({ valid: false, error: "No code provided" });

    const upperCode = code.toUpperCase().trim();
    const coupon = await kv.get(`coupon:${upperCode}`);
    if (!coupon) return c.json({ valid: false, error: "Invalid coupon code" });
    if (!coupon.active) return c.json({ valid: false, error: "This coupon is no longer active" });
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) return c.json({ valid: false, error: "This coupon has expired" });
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return c.json({ valid: false, error: "This coupon has reached its usage limit" });

    return c.json({ valid: true, coupon: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue } });
  } catch (err) {
    console.error("[POST /validate-coupon]", err);
    return c.json({ valid: false, error: "Failed to validate coupon" });
  }
});

// ── Stripe Payments ─────────────────────────────────────────────────────────

app.post("/make-server-623b2a1c/create-checkout-session", async (c) => {
  const ip = c.req.header("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip, 5, 60_000)) return c.json({ error: "Too many requests. Please try again later." }, 429);

  const { name, email, password, couponCode } = await c.req.json();
  if (!isValidEmail(email)) return c.json({ error: "Invalid email format" }, 400);
  const pv = isValidPassword(password);
  if (!pv.valid) return c.json({ error: pv.error }, 400);
  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);

  const emailLower = email.toLowerCase();
  const couponKey = couponCode ? `coupon:${couponCode.toUpperCase().trim()}` : null;

  // Parallelize: hash password + email index lookup + coupon fetch + settings
  const [passwordHash, existingIndex, couponRaw, settings, stripeKey] = await Promise.all([
    hashPassword(password),
    kv.get(`email_index:${emailLower}`),
    couponKey ? kv.get(couponKey) : Promise.resolve(null),
    getSettings(),
    Promise.resolve(Deno.env.get("STRIPE_SECRET_KEY")),
  ]);

  if (!stripeKey) return c.json({ error: "Payment system not configured" }, 500);

  if (existingIndex?.userId) {
    const existingUser = await kv.get(`user:${existingIndex.userId}`);
    if (existingUser) return c.json({ error: "An account with this email already exists" }, 400);
  }

  let coupon: any = couponRaw ?? null;
  if (couponCode) {
    if (!coupon || !coupon.active) return c.json({ error: "Invalid coupon code" }, 400);
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) return c.json({ error: "Coupon has expired" }, 400);
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return c.json({ error: "Coupon usage limit reached" }, 400);
  }

  const priceNum = parseFloat(String(settings.coursePrice).replace(/[^0-9.]/g, "")) || 997;
  let finalPrice = priceNum;
  if (coupon?.discountType === "percent") finalPrice = priceNum * (1 - coupon.discountValue / 100);
  if (coupon?.discountType === "fixed") finalPrice = Math.max(0, priceNum - coupon.discountValue);
  finalPrice = Math.round(finalPrice * 100) / 100;
  const pendingId = generateId();

  await kv.set(`pending:${pendingId}`, {
    name: name.trim(),
    email: emailLower,
    passwordHash,
    couponCode: coupon?.code ?? null,
    originalPrice: priceNum,
    finalPrice,
    createdAt: new Date().toISOString(),
  });

  const siteUrl = Deno.env.get("SITE_URL") ?? "https://mayberrylaundromat.com";
  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      "payment_method_types[]": "card",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": "Mayberry Laundromat Course",
      "line_items[0][price_data][unit_amount]": String(Math.round(finalPrice * 100)),
      "line_items[0][quantity]": "1",
      "mode": "payment",
      "customer_email": emailLower,
      "success_url": `${siteUrl}/checkout/success?session=${pendingId}`,
      "cancel_url": `${siteUrl}/checkout/cancel`,
      "metadata[pendingId]": pendingId,
    }),
  });

  if (!stripeRes.ok) {
    const stripeErr = await stripeRes.json();
    console.error("[create-checkout-session] Stripe error:", stripeErr);
    return c.json({ error: "Failed to create checkout session" }, 500);
  }

  const session = await stripeRes.json();
  return c.json({ url: session.url });
});

app.post("/make-server-623b2a1c/stripe-webhook", async (c) => {
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) return c.json({ error: "Not configured" }, 500);

  const body = await c.req.text();
  const signature = c.req.header("stripe-signature") ?? "";

  let event: any;
  try {
    const parts = signature.split(",").reduce((acc: any, part) => {
      const [k, v] = part.split("=");
      acc[k] = v;
      return acc;
    }, {});
    const timestamp = parts["t"];
    const sigHash = parts["v1"];
    const payload = `${timestamp}.${body}`;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const computed = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (computed !== sigHash) return c.json({ error: "Invalid signature" }, 400);
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return c.json({ error: "Timestamp too old" }, 400);
    event = JSON.parse(body);
  } catch (err) {
    console.error("[stripe-webhook] Verification failed:", err);
    return c.json({ error: "Invalid webhook" }, 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const pendingId = session.metadata?.pendingId;
    if (!pendingId) return c.json({ received: true });

    const pending = await kv.get(`pending:${pendingId}`);
    if (!pending) return c.json({ received: true });

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const userData = {
      id: userId,
      email: pending.email,
      name: pending.name,
      isAdmin: false,
      completedModules: [],
      completedLessons: [],
      paymentStatus: "paid",
      enrolledAt: new Date().toISOString(),
    };

    const sessionToken = createSessionToken(userId);
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const paymentRecord = {
      id: paymentId,
      userId,
      userName: pending.name,
      userEmail: pending.email,
      originalAmount: pending.originalPrice,
      finalAmount: pending.finalPrice,
      discountAmount: Math.round((pending.originalPrice - pending.finalPrice) * 100) / 100,
      couponCode: pending.couponCode,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent ?? null,
      status: "paid",
      createdAt: new Date().toISOString(),
    };

    const stripeContactId = `contact_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await Promise.all([
      kv.set(`user:${userId}`, userData),
      kv.set(`auth:${userId}`, { passwordHash: pending.passwordHash, email: pending.email, createdAt: new Date().toISOString() }),
      kv.set(`email_index:${pending.email}`, { userId }),
      kv.set(`session:${sessionToken}`, { userId, createdAt: new Date().toISOString() }),
      kv.set(`payment:${paymentId}`, paymentRecord),
      kv.set(`checkout_result:${pendingId}`, { token: sessionToken, userId, status: "complete", expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() }),
      kv.del(`pending:${pendingId}`),
      kv.set(`email-contact:${stripeContactId}`, { id: stripeContactId, email: pending.email, name: pending.name, addedAt: new Date().toISOString(), source: "signup" }),
    ]);

    if (pending.couponCode) {
      const coupon = await kv.get(`coupon:${pending.couponCode}`);
      if (coupon) await kv.set(`coupon:${pending.couponCode}`, { ...coupon, usedCount: (coupon.usedCount ?? 0) + 1 });
    }

    logActivity(userId, pending.name, "Enrolled via Stripe payment");
  }

  return c.json({ received: true });
});

app.get("/make-server-623b2a1c/checkout/status", async (c) => {
  const pendingId = c.req.query("session");
  if (!pendingId) return c.json({ status: "not_found" });

  const result = await kv.get(`checkout_result:${pendingId}`);
  if (!result) {
    const pending = await kv.get(`pending:${pendingId}`);
    return c.json({ status: pending ? "pending" : "not_found" });
  }

  if (new Date() > new Date(result.expiresAt)) {
    await kv.del(`checkout_result:${pendingId}`);
    return c.json({ status: "expired" });
  }

  const user = await kv.get(`user:${result.userId}`);
  await kv.del(`checkout_result:${pendingId}`);
  return c.json({ status: "complete", token: result.token, user });
});

// ── Admin Payments (real data) ──────────────────────────────────────────────

app.get("/make-server-623b2a1c/admin/payments", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const payments = await kv.getByPrefix("payment:");
    payments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ payments });
  } catch (err) {
    return c.json({ error: "Failed to fetch payments" }, 500);
  }
});

// ── Course Structure CRUD ───────────────────────────────────────────────────

app.get("/make-server-623b2a1c/course/structure", async (c) => {
  try {
    const structure = await getCourseStructure();
    return c.json(structure);
  } catch (err) {
    return c.json({ error: "Failed to fetch course structure" }, 500);
  }
});

app.post("/make-server-623b2a1c/admin/modules", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const { title, description } = await c.req.json();
    if (!title?.trim()) return c.json({ error: "title is required" }, 400);

    const structure = await getCourseStructure();
    if (!Array.isArray(structure.modules)) {
      structure.modules = [];
    }
    const moduleId = `module-${Date.now()}`;
    const newModule = {
      id: moduleId,
      title: title.trim(),
      description: description?.trim() ?? "",
      duration: "0 min",
      order: structure.modules.length,
      lessons: [],
    };
    structure.modules.push(newModule);
    await kv.set("course:structure", { ...structure, updatedAt: new Date().toISOString() });
    invalidateCourseCache();
    logActivity(user.id, user.name, `Added module: ${title}`);
    return c.json({ success: true, structure });
  } catch (err) {
    console.error("[POST /admin/modules] Error:", err);
    return c.json({ error: "Failed to add module" }, 500);
  }
});

app.patch("/make-server-623b2a1c/admin/modules/:moduleId", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const moduleId = c.req.param("moduleId");
    const structure = await getCourseStructure();
    const idx = structure.modules.findIndex((m: any) => m.id === moduleId);
    if (idx === -1) return c.json({ error: "Module not found" }, 404);

    const { title, description, duration, order } = await c.req.json();
    const mod = structure.modules[idx];
    if (title !== undefined) mod.title = title.trim();
    if (description !== undefined) mod.description = description.trim();
    if (duration !== undefined) mod.duration = duration.trim();
    if (order !== undefined && order !== idx) {
      structure.modules.splice(idx, 1);
      structure.modules.splice(Math.max(0, Math.min(order, structure.modules.length)), 0, mod);
    }
    await kv.set("course:structure", { ...structure, updatedAt: new Date().toISOString() });
    invalidateCourseCache();
    return c.json({ success: true, structure });
  } catch (err) {
    console.error("[PATCH /admin/modules/:moduleId] Error:", err);
    return c.json({ error: "Failed to update module" }, 500);
  }
});

app.delete("/make-server-623b2a1c/admin/modules/:moduleId", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const moduleId = c.req.param("moduleId");
    const structure = await getCourseStructure();
    const idx = structure.modules.findIndex((m: any) => m.id === moduleId);
    if (idx === -1) return c.json({ error: "Module not found" }, 404);

    const name = structure.modules[idx].title;
    structure.modules.splice(idx, 1);
    await kv.set("course:structure", { ...structure, updatedAt: new Date().toISOString() });
    invalidateCourseCache();
    logActivity(user.id, user.name, `Deleted module: ${name}`);
    return c.json({ success: true, structure });
  } catch (err) {
    console.error("[DELETE /admin/modules/:moduleId] Error:", err);
    return c.json({ error: "Failed to delete module" }, 500);
  }
});

app.post("/make-server-623b2a1c/admin/modules/:moduleId/lessons", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const moduleId = c.req.param("moduleId");
    const structure = await getCourseStructure();
    const mod = structure.modules.find((m: any) => m.id === moduleId);
    if (!mod) return c.json({ error: "Module not found" }, 404);

    const { title, duration } = await c.req.json();
    if (!title?.trim()) return c.json({ error: "title is required" }, 400);

    const lessonId = `${moduleId}-lesson-${Date.now()}`;
    const newLesson = { id: lessonId, title: title.trim(), duration: duration?.trim() ?? "0:00", order: mod.lessons.length, videoUrl: null };
    mod.lessons.push(newLesson);
    await kv.set("course:structure", { ...structure, updatedAt: new Date().toISOString() });
    invalidateCourseCache();
    logActivity(user.id, user.name, `Added lesson: ${title}`);
    return c.json({ success: true, structure });
  } catch (err) {
    console.error("[POST /admin/modules/:moduleId/lessons] Error:", err);
    return c.json({ error: "Failed to add lesson" }, 500);
  }
});

app.patch("/make-server-623b2a1c/admin/modules/:moduleId/lessons/:lessonId", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const { moduleId, lessonId } = c.req.param();
    const structure = await getCourseStructure();
    const mod = structure.modules.find((m: any) => m.id === moduleId);
    if (!mod) return c.json({ error: "Module not found" }, 404);
    const lessonIdx = mod.lessons.findIndex((l: any) => l.id === lessonId);
    if (lessonIdx === -1) return c.json({ error: "Lesson not found" }, 404);

    const { title, duration, videoUrl, order } = await c.req.json();
    const lesson = mod.lessons[lessonIdx];
    if (title !== undefined) lesson.title = title.trim();
    if (duration !== undefined) lesson.duration = duration.trim();
    if (videoUrl !== undefined) lesson.videoUrl = videoUrl?.trim() || null;
    if (order !== undefined && order !== lessonIdx) {
      mod.lessons.splice(lessonIdx, 1);
      mod.lessons.splice(Math.max(0, Math.min(order, mod.lessons.length)), 0, lesson);
    }
    await kv.set("course:structure", { ...structure, updatedAt: new Date().toISOString() });
    invalidateCourseCache();
    return c.json({ success: true, structure });
  } catch (err) {
    console.error("[PATCH /admin/modules/:moduleId/lessons/:lessonId] Error:", err);
    return c.json({ error: "Failed to update lesson" }, 500);
  }
});

app.delete("/make-server-623b2a1c/admin/modules/:moduleId/lessons/:lessonId", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const { moduleId, lessonId } = c.req.param();
    const structure = await getCourseStructure();
    const mod = structure.modules.find((m: any) => m.id === moduleId);
    if (!mod) return c.json({ error: "Module not found" }, 404);
    const lessonIdx = mod.lessons.findIndex((l: any) => l.id === lessonId);
    if (lessonIdx === -1) return c.json({ error: "Lesson not found" }, 404);

    const name = mod.lessons[lessonIdx].title;
    mod.lessons.splice(lessonIdx, 1);
    await kv.set("course:structure", { ...structure, updatedAt: new Date().toISOString() });
    invalidateCourseCache();
    logActivity(user.id, user.name, `Deleted lesson: ${name}`);
    return c.json({ success: true, structure });
  } catch (err) {
    console.error("[DELETE /admin/modules/:moduleId/lessons/:lessonId] Error:", err);
    return c.json({ error: "Failed to delete lesson" }, 500);
  }
});

// ── Website Analytics Tracking (public — no auth) ──────────────────────────

app.post("/make-server-623b2a1c/track/visit", async (c) => {
  try {
    const { sessionId, page } = await c.req.json();
    if (!sessionId) return c.json({ ok: false }, 400);
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`page-visit:${id}`, { sessionId, page: page || "landing", timestamp: new Date().toISOString() });
    _statsCache = null;
    _analyticsCache = null;
    return c.json({ ok: true });
  } catch { return c.json({ ok: false }, 500); }
});

app.post("/make-server-623b2a1c/track/section", async (c) => {
  try {
    const { sessionId, section } = await c.req.json();
    if (!sessionId || !section) return c.json({ ok: false }, 400);
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`page-event:${id}`, { sessionId, section, timestamp: new Date().toISOString() });
    _analyticsCache = null;
    return c.json({ ok: true });
  } catch { return c.json({ ok: false }, 500); }
});

app.post("/make-server-623b2a1c/track/cta", async (c) => {
  try {
    const { sessionId, ctaId } = await c.req.json();
    if (!sessionId || !ctaId) return c.json({ ok: false }, 400);
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`cta-click:${id}`, { sessionId, ctaId, timestamp: new Date().toISOString() });
    _analyticsCache = null;
    return c.json({ ok: true });
  } catch { return c.json({ ok: false }, 500); }
});

app.get("/make-server-623b2a1c/admin/website-analytics", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode ?? 401);
  try {
    if (_analyticsCache && Date.now() < _analyticsCache.expiresAt) return c.json(_analyticsCache.data);

    const [visits, events, ctas, allUsers, campaigns] = await Promise.all([
      kv.getByPrefix("page-visit:"),
      kv.getByPrefix("page-event:"),
      kv.getByPrefix("cta-click:"),
      kv.getByPrefix("user:"),
      kv.getByPrefix("email-campaign:"),
    ]);

    // Traffic by day (last 30 days)
    const now = Date.now();
    const byDay: Record<string, number> = {};
    const byHour: Record<number, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now - i * 86400000);
      byDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (let h = 0; h < 24; h++) byHour[h] = 0;

    for (const v of visits) {
      const d = v.timestamp?.slice(0, 10);
      if (d && byDay[d] !== undefined) byDay[d]++;
      const h = new Date(v.timestamp).getHours();
      if (!isNaN(h)) byHour[h] = (byHour[h] || 0) + 1;
    }

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
    const todayVisits = byDay[today] || 0;
    const weekVisits = Object.entries(byDay).filter(([d]) => d >= weekAgo).reduce((s, [, v]) => s + v, 0);
    const monthVisits = Object.values(byDay).reduce((s, v) => s + v, 0);

    // Section counts
    const SECTIONS = ["hero","about","problem","how-it-works","course","social-proof","personality-filter","pricing","final-cta"];
    const sections: Record<string, number> = {};
    for (const s of SECTIONS) sections[s] = 0;
    for (const e of events) { if (e.section && sections[e.section] !== undefined) sections[e.section]++; }

    // CTA counts
    const ctaCounts: Record<string, number> = {};
    for (const c of ctas) { if (c.ctaId) ctaCounts[c.ctaId] = (ctaCounts[c.ctaId] || 0) + 1; }

    // Campaign conversions
    const conversionsByRef: Record<string, number> = {};
    for (const u of allUsers) {
      if (u.campaignRef) conversionsByRef[u.campaignRef] = (conversionsByRef[u.campaignRef] || 0) + 1;
    }

    const analyticsResult = {
      visits: {
        total: visits.length,
        today: todayVisits,
        thisWeek: weekVisits,
        thisMonth: monthVisits,
        byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
        byHour: Object.entries(byHour).map(([hour, count]) => ({ hour: Number(hour), count })).sort((a, b) => a.hour - b.hour),
      },
      sections,
      ctas: ctaCounts,
      conversions: conversionsByRef,
      campaigns: campaigns.map((c: any) => ({ id: c.id, name: c.name || c.subject, refSlug: c.refSlug || null, sentCount: c.sentCount, sentAt: c.sentAt })),
    };
    _analyticsCache = { data: analyticsResult, expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS };
    return c.json(analyticsResult);
  } catch (err) {
    console.error("[GET /admin/website-analytics] Error:", err);
    return c.json({ error: "Failed to fetch analytics" }, 500);
  }
});

app.get("/make-server-623b2a1c/modules", async (c) => {
  try {
    const structure = await getCourseStructure();
    return c.json({ modules: structure.modules.map((m: any) => ({ id: m.id, title: m.title, duration: m.duration })) });
  } catch (err) {
    return c.json({ error: "Failed to fetch modules" }, 500);
  }
});

// ── Email Marketing ────────────────────────────────────────────────────────

app.get("/make-server-623b2a1c/admin/email-contacts", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode ?? 401);
  try {
    const contacts = await kv.getByPrefix("email-contact:");
    contacts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ contacts });
  } catch (err) {
    console.error("[GET /admin/email-contacts] Error:", err);
    return c.json({ error: "Failed to fetch contacts" }, 500);
  }
});

app.post("/make-server-623b2a1c/admin/email-contacts", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode ?? 401);
  try {
    const { email, name, tags } = await c.req.json();
    if (!email || !isValidEmail(email)) return c.json({ error: "Valid email required" }, 400);

    const existing = await kv.get(`email-contact-by-email:${email.toLowerCase()}`);
    if (existing) return c.json({ error: "Email already exists" }, 409);

    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const contact = {
      id,
      email: email.toLowerCase().trim(),
      name: name?.trim() || "",
      tags: tags || [],
      unsubscribed: false,
      createdAt: new Date().toISOString(),
    };

    await Promise.all([
      kv.set(`email-contact:${id}`, contact),
      kv.set(`email-contact-by-email:${email.toLowerCase()}`, { id }),
    ]);

    logActivity(user.id, user.name, `Added email contact: ${email}`);
    return c.json({ contact }, 201);
  } catch (err) {
    console.error("[POST /admin/email-contacts] Error:", err);
    return c.json({ error: "Failed to add contact" }, 500);
  }
});

app.delete("/make-server-623b2a1c/admin/email-contacts/:id", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode ?? 401);
  try {
    const { id } = c.req.param();
    const contact = await kv.get(`email-contact:${id}`);
    if (!contact) return c.json({ error: "Contact not found" }, 404);

    await Promise.all([
      kv.del(`email-contact:${id}`),
      kv.del(`email-contact-by-email:${contact.email}`),
    ]);

    logActivity(user.id, user.name, `Deleted email contact: ${contact.email}`);
    return c.json({ success: true });
  } catch (err) {
    console.error("[DELETE /admin/email-contacts/:id] Error:", err);
    return c.json({ error: "Failed to delete contact" }, 500);
  }
});

app.get("/make-server-623b2a1c/admin/email-campaigns", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode ?? 401);
  try {
    const campaigns = await kv.getByPrefix("email-campaign:");
    campaigns.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ campaigns });
  } catch (err) {
    console.error("[GET /admin/email-campaigns] Error:", err);
    return c.json({ error: "Failed to fetch campaigns" }, 500);
  }
});

app.post("/make-server-623b2a1c/admin/email-campaigns/send", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode ?? 401);
  try {
    const { name, subject, body, fromName, fromEmail, recipientIds, refSlug } = await c.req.json();

    if (!subject?.trim()) return c.json({ error: "Subject is required" }, 400);
    if (!body?.trim()) return c.json({ error: "Email body is required" }, 400);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) return c.json({ error: "Email sending not configured. Add RESEND_API_KEY to Supabase project secrets." }, 500);

    let contacts: any[];
    if (recipientIds && recipientIds.length > 0) {
      const fetched = await kv.mget(recipientIds.map((id: string) => `email-contact:${id}`));
      contacts = fetched.filter(Boolean);
    } else {
      contacts = await kv.getByPrefix("email-contact:");
    }
    contacts = contacts.filter((c: any) => !c.unsubscribed);

    if (contacts.length === 0) return c.json({ error: "No active recipients found" }, 400);

    const platformSettings = await getSettings();
    const senderEmail = fromEmail?.trim() || platformSettings.emailFromEmail || Deno.env.get("FROM_EMAIL") || "noreply@example.com";
    const senderName = fromName?.trim() || platformSettings.emailFromName || "PM Course";

    // Auto-inject tracking ref into signup links in the email body
    let finalBody = body;
    if (refSlug?.trim()) {
      const slug = refSlug.trim();
      const trackedUrl = `https://petermayberry.com/signup?ref=${slug}`;
      // Replace any existing signup links (with or without existing query params)
      finalBody = finalBody
        .replace(/https?:\/\/petermayberry\.com\/signup\?[^"'\s]*/g, trackedUrl)
        .replace(/https?:\/\/petermayberry\.com\/signup(?=[^?a-zA-Z0-9]|$)/g, trackedUrl);
      // If no signup link exists in body, append one at the bottom
      if (!finalBody.includes("petermayberry.com/signup")) {
        finalBody += `\n\n<p style="margin-top:24px;"><a href="${trackedUrl}" style="background:#000;color:#fff;padding:12px 24px;font-weight:bold;text-decoration:none;display:inline-block;">SIGN UP NOW</a></p>`;
      }
    }

    const BATCH = 50;
    const batches: any[][] = [];
    for (let i = 0; i < contacts.length; i += BATCH) batches.push(contacts.slice(i, i + BATCH));

    const batchResults = await Promise.all(batches.map(async (batch) => {
      const to = batch.map((ct: any) => ct.name ? `${ct.name} <${ct.email}>` : ct.email);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `${senderName} <${senderEmail}>`, to, subject, html: finalBody }),
      });
      if (res.ok) return { sent: batch.length, failed: 0 };
      const errData = await res.json().catch(() => ({}));
      console.error("[email-campaigns/send] Resend error:", errData);
      return { sent: 0, failed: batch.length };
    }));

    const sent = batchResults.reduce((s, r) => s + r.sent, 0);
    const failed = batchResults.reduce((s, r) => s + r.failed, 0);

    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const campaign = {
      id,
      name: name?.trim() || subject,
      subject,
      body,
      fromName: senderName,
      fromEmail: senderEmail,
      recipientCount: contacts.length,
      sentCount: sent,
      failedCount: failed,
      status: failed === 0 ? "sent" : sent === 0 ? "failed" : "partial",
      refSlug: refSlug?.trim() || null,
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
    };

    await kv.set(`email-campaign:${id}`, campaign);
    logActivity(user.id, user.name, `Sent email campaign: "${subject}" to ${sent} recipients`);

    return c.json({ campaign, sent, failed });
  } catch (err) {
    console.error("[POST /admin/email-campaigns/send] Error:", err);
    return c.json({ error: "Failed to send campaign" }, 500);
  }
});

// ── Laundromat Database Import ─────────────────────────────────────────────

app.get("/make-server-623b2a1c/admin/laundromat-db/stats", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    if (_laundromatStatsCache && Date.now() < _laundromatStatsCache.expiresAt) {
      return c.json(_laundromatStatsCache.data);
    }
    const all = await kv.getByPrefix("existing-laundromat:");
    const bySource: Record<string, number> = {};
    const byState: Record<string, number> = {};
    let complete = 0;
    let incomplete = 0;
    for (const el of all as any[]) {
      const src = el.source ?? "student";
      bySource[src] = (bySource[src] || 0) + 1;
      if (el.state) byState[el.state.toUpperCase()] = (byState[el.state.toUpperCase()] || 0) + 1;
      const isComplete = !!(el.note?.trim() && el.address?.trim() && el.city?.trim() && el.state?.trim() && el.zip?.trim());
      if (isComplete) complete++; else incomplete++;
    }
    const topStates = Object.entries(byState)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([state, count]) => ({ state, count }));
    const result = { total: (all as any[]).length, complete, incomplete, bySource, topStates };
    _laundromatStatsCache = { data: result, expiresAt: Date.now() + 60_000 };
    return c.json(result);
  } catch (err) {
    return c.json({ error: "Failed to load stats" }, 500);
  }
});

app.get("/make-server-623b2a1c/admin/laundromat-db/list", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);
    const offset  = Math.max(0, parseInt(c.req.query("offset") ?? "0", 10) || 0);
    const limit   = Math.min(200, Math.max(1, parseInt(c.req.query("limit") ?? "25", 10) || 25));
    const flagged = c.req.query("flagged") === "1";
    const state   = c.req.query("state")  ?? "";
    const source  = c.req.query("source") ?? "";
    const search  = c.req.query("search") ?? "";
    const { data, total } = await kv.getByPrefixFiltered(
      "existing-laundromat:", offset, limit, ["state", "city", "zip"],
      { flagged, state: state || undefined, source: source || undefined, search: search || undefined },
    );
    return c.json({ entries: data, total, offset, limit });
  } catch {
    return c.json({ error: "Failed to load entries" }, 500);
  }
});

app.patch("/make-server-623b2a1c/admin/laundromat-db/:id", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const id = c.req.param("id");
    const existing = await kv.get(`existing-laundromat:${id}`);
    if (!existing) return c.json({ error: "Entry not found" }, 404);

    const { note, address, city, state, zip } = await c.req.json();
    const updated = {
      ...(existing as any),
      ...(note    !== undefined ? { note:    note?.toString().trim()    ?? null } : {}),
      ...(address !== undefined ? { address: address?.toString().trim() ?? null } : {}),
      ...(city    !== undefined ? { city:    city?.toString().trim()    ?? null } : {}),
      ...(state   !== undefined ? { state:   state?.toString().trim().toUpperCase() ?? null } : {}),
      ...(zip     !== undefined ? { zip:     zip?.toString().trim()     ?? null } : {}),
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`existing-laundromat:${id}`, updated);
    _locationIntelCache = null; _laundromatStatsCache = null;
    logActivity(user.id, user.name, `Updated laundromat DB entry: ${updated.note || updated.address}`);
    return c.json({ success: true, entry: updated });
  } catch (err) {
    console.error("[PATCH /admin/laundromat-db/:id] Error:", err);
    return c.json({ error: "Update failed" }, 500);
  }
});

app.post("/make-server-623b2a1c/admin/laundromat-db/enrich/:id", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!googleKey) return c.json({ error: "Google Maps API key not configured. Add GOOGLE_MAPS_API_KEY to your Supabase Edge Function secrets." }, 400);

    const id = c.req.param("id");
    const entry = await kv.get(`existing-laundromat:${id}`);
    if (!entry) return c.json({ error: "Entry not found" }, 404);

    const updates: Record<string, any> = {};

    // ── 1. Reverse geocode lat/lon → address ─────────────────────────────────
    if (entry.lat && entry.lon && !entry.address) {
      try {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${entry.lat},${entry.lon}&key=${googleKey}`
        );
        const geo = await geoRes.json();
        if (geo.status === "OK" && geo.results?.[0]) {
          const components: Record<string, string> = {};
          for (const c of geo.results[0].address_components) {
            for (const t of c.types) components[t] = c.short_name;
          }
          const streetNumber = components["street_number"] ?? "";
          const route        = components["route"]         ?? "";
          if (route) updates.address = `${streetNumber} ${route}`.trim();
          if (!entry.city)  updates.city  = components["locality"] || components["sublocality"] || components["administrative_area_level_2"] || "";
          if (!entry.state) updates.state = components["administrative_area_level_1"] ?? "";
          if (!entry.zip)   updates.zip   = components["postal_code"] ?? "";
        }
      } catch { /* skip if geocoding fails */ }
    }

    // ── Helper: parse a Places/Geocode result and fill any missing fields ───────
    function fillFromPlaceResult(top: any) {
      const fa: string = top.formatted_address ?? "";
      // Parse address components if available
      if (top.address_components) {
        const comp: Record<string, string> = {};
        for (const c of top.address_components) {
          for (const t of c.types) comp[t] = c.short_name;
        }
        const streetNumber = comp["street_number"] ?? "";
        const route        = comp["route"]         ?? "";
        const resolvedAddr = updates.address || entry.address;
        if (!resolvedAddr && route) updates.address = `${streetNumber} ${route}`.trim();
        if (!(updates.city  || entry.city))  updates.city  = comp["locality"] || comp["sublocality"] || comp["administrative_area_level_2"] || "";
        if (!(updates.state || entry.state)) updates.state = comp["administrative_area_level_1"] ?? "";
        if (!(updates.zip   || entry.zip))   updates.zip   = comp["postal_code"] ?? "";
      } else if (fa) {
        // Fall back to splitting formatted_address: "123 Main St, Austin, TX 78701, USA"
        const parts = fa.split(",").map((s: string) => s.trim());
        const resolvedAddr = updates.address || entry.address;
        if (!resolvedAddr && parts[0]) updates.address = parts[0];
        if (!(updates.city  || entry.city)  && parts[1]) updates.city  = parts[1];
        if (!(updates.state || entry.state) && parts[2]) {
          const stateZip = parts[2].split(" ").filter(Boolean);
          if (stateZip[0]) updates.state = stateZip[0];
          if (!(updates.zip || entry.zip) && stateZip[1]) updates.zip = stateZip[1];
        }
      }
    }

    // ── 2. Places search — multiple strategies ───────────────────────────────
    const resolvedAddress = updates.address || entry.address;
    const resolvedCity    = updates.city    || entry.city;
    const resolvedState   = updates.state   || entry.state;
    const resolvedName    = entry.note;

    // Strategy A: have name + state (no address) → search by name + state
    if (resolvedName && resolvedState && !resolvedAddress) {
      try {
        const q = encodeURIComponent(`${resolvedName} laundromat ${resolvedState}`);
        const placeRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${googleKey}`
        );
        const places = await placeRes.json();
        if (places.status === "OK" && places.results?.[0]) {
          fillFromPlaceResult(places.results[0]);
        }
      } catch { /* skip */ }
    }

    // Strategy B: have address/city but no name → search for business name
    const nowHasAddress = updates.address || resolvedAddress;
    if (!resolvedName && (nowHasAddress || resolvedCity)) {
      try {
        const q = encodeURIComponent(`laundromat ${nowHasAddress ?? ""} ${resolvedCity ?? ""} ${resolvedState ?? ""}`.trim());
        const placeRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${googleKey}`
        );
        const places = await placeRes.json();
        if (places.status === "OK" && places.results?.[0]) {
          const top = places.results[0];
          if (!resolvedName) updates.note = top.name ?? null;
          fillFromPlaceResult(top);
        }
      } catch { /* skip */ }
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ found: false, message: "No additional data found via Google Maps" });
    }

    const updated = { ...(entry as any), ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`existing-laundromat:${id}`, updated);
    _locationIntelCache = null; _laundromatStatsCache = null;
    logActivity(user.id, user.name, `Auto-enriched laundromat DB entry: ${updated.note || updated.address}`);
    return c.json({ found: true, updates, entry: updated });
  } catch (err) {
    console.error("[enrich] Error:", err);
    return c.json({ error: "Enrichment failed" }, 500);
  }
});

app.post("/make-server-623b2a1c/admin/laundromat-db/import-osm", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const { stateCode } = await c.req.json();
    if (!stateCode?.trim()) return c.json({ error: "stateCode required (e.g. TX)" }, 400);

    const iso = `US-${stateCode.trim().toUpperCase()}`;
    const q = `[out:json][timeout:90];area["ISO3166-2"="${iso}"]->.s;(node["amenity"~"laundry|laundromat"](area.s);way["amenity"~"laundry|laundromat"](area.s);node["shop"="laundry"](area.s);way["shop"="laundry"](area.s););out tags center;`;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(q)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) return c.json({ error: "Overpass query failed — try again shortly" }, 502);
    const data = await res.json();
    const elements: any[] = data.elements ?? [];

    let imported = 0;
    let skipped = 0;
    await Promise.allSettled(elements.map(async (el: any) => {
      const osmId   = `osm_${el.type}_${el.id}`;
      const elLat   = el.lat ?? el.center?.lat ?? null;
      const elLon   = el.lon ?? el.center?.lon ?? null;
      const elName  = el.tags?.name ?? el.tags?.brand ?? null;
      const elAddr  = el.tags?.["addr:housenumber"] && el.tags?.["addr:street"]
        ? `${el.tags["addr:housenumber"]} ${el.tags["addr:street"]}`.trim()
        : null;
      const elCity  = el.tags?.["addr:city"] ?? "";
      const elState = stateCode.trim().toUpperCase();
      // Skip entries with no address
      if (!elAddr) { skipped++; return; }
      // Cross-source dedup check
      const dupId = await dedupCheck(elAddr, elCity, elState);
      if (dupId) { skipped++; return; }
      if (await kv.get(`existing-laundromat:${osmId}`)) { skipped++; return; }
      const entry = {
        id: osmId, address: elAddr, city: elCity, state: elState,
        zip: el.tags?.["addr:postcode"] ?? null,
        lat: elLat != null ? parseFloat(elLat) : null,
        lon: elLon != null ? parseFloat(elLon) : null,
        note: elName ?? null, source: "osm", reportedAt: new Date().toISOString(),
      };
      await kv.set(`existing-laundromat:${osmId}`, entry);
      await dedupRegister(elAddr, elCity, elState, osmId);
      imported++;
    }));

    _locationIntelCache = null; _laundromatStatsCache = null;
    logActivity(user.id, user.name, `Imported ${imported} laundromats from OSM for ${stateCode.toUpperCase()}`);
    return c.json({ imported, skipped, total: elements.length });
  } catch (err) {
    console.error("[import-osm] Error:", err);
    return c.json({ error: "Import failed" }, 500);
  }
});

app.post("/make-server-623b2a1c/admin/laundromat-db/import-csv", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const { records } = await c.req.json();
    if (!Array.isArray(records) || records.length === 0) return c.json({ error: "No records provided" }, 400);
    if (records.length > 10000) return c.json({ error: "Max 10,000 records per import" }, 400);

    let imported = 0;
    let skipped = 0;
    await Promise.allSettled(records.map(async (rec: any) => {
      const cleanAddr  = rec.address?.toString().trim() ?? "";
      const cleanCity  = rec.city?.toString().trim()    ?? "";
      const cleanState = rec.state?.toString().trim().toUpperCase() ?? "";
      if (!cleanAddr) { skipped++; return; }
      // Cross-source dedup check
      const dupId = await dedupCheck(cleanAddr, cleanCity, cleanState);
      if (dupId) { skipped++; return; }
      const dedupeKey = `csv_${normalizeAddr(cleanAddr, cleanCity, cleanState)}`;
      if (await kv.get(`existing-laundromat:${dedupeKey}`)) { skipped++; return; }
      const entry = {
        id: dedupeKey, address: cleanAddr, city: cleanCity, state: cleanState,
        zip: rec.zip?.toString().trim() ?? null,
        lat: rec.lat ? parseFloat(rec.lat) : null,
        lon: rec.lon ? parseFloat(rec.lon) : null,
        note: rec.name?.toString().trim() ?? null,
        source: "csv", reportedAt: new Date().toISOString(),
      };
      await kv.set(`existing-laundromat:${dedupeKey}`, entry);
      await dedupRegister(cleanAddr, cleanCity, cleanState, dedupeKey);
      imported++;
    }));

    _locationIntelCache = null; _laundromatStatsCache = null;
    logActivity(user.id, user.name, `Imported ${imported} laundromats from CSV upload`);
    return c.json({ imported, skipped, total: records.length });
  } catch (err) {
    console.error("[import-csv] Error:", err);
    return c.json({ error: "Import failed" }, 500);
  }
});

// Deduplicates existing DB entries and builds/repairs the dedup index.
// Groups all entries by normalized address, merges duplicates, deletes extras.
app.post("/make-server-623b2a1c/admin/laundromat-db/deduplicate", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const all: any[] = await kv.getByPrefix("existing-laundromat:");

    // Group by normalized address
    const groups = new Map<string, any[]>();
    for (const entry of all) {
      if (!entry.address?.trim()) continue; // skip entries with no address
      const key = normalizeAddr(entry.address, entry.city ?? "", entry.state ?? "");
      if (!key || key.length < 4) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    }

    let merged = 0;
    let deleted = 0;
    let indexed = 0;

    for (const [addrKey, entries] of groups) {
      if (entries.length === 1) {
        // Register in dedup index if missing
        const existing = await kv.get(`dedup:addr_${addrKey}`);
        if (!existing) { await kv.set(`dedup:addr_${addrKey}`, entries[0].id); indexed++; }
        continue;
      }

      // Sort: prefer entries with most fields filled
      entries.sort((a, b) => {
        const score = (e: any) => [e.note, e.address, e.city, e.state, e.zip, e.lat].filter(Boolean).length;
        return score(b) - score(a);
      });

      // Merge all into the best entry
      let best = entries[0];
      for (let i = 1; i < entries.length; i++) {
        best = mergeEntries(best, entries[i]);
      }

      // Save merged entry
      await kv.set(`existing-laundromat:${best.id}`, best);

      // Delete the rest
      for (let i = 1; i < entries.length; i++) {
        if (entries[i].id !== best.id) {
          await kv.del(`existing-laundromat:${entries[i].id}`);
          deleted++;
        }
      }

      // Register/update dedup index
      await kv.set(`dedup:addr_${addrKey}`, best.id);
      merged++;
    }

    _locationIntelCache = null; _laundromatStatsCache = null;
    logActivity(user.id, user.name, `Deduplication: merged ${merged} groups, deleted ${deleted} duplicates, indexed ${indexed} entries`);
    return c.json({ merged, deleted, indexed, total: all.length });
  } catch (err) {
    console.error("[deduplicate] Error:", err);
    return c.json({ error: "Deduplication failed" }, 500);
  }
});

// Deletes all entries that have no address.
app.post("/make-server-623b2a1c/admin/laundromat-db/cleanup-no-address", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const all: any[] = await kv.getByPrefix("existing-laundromat:");
    let deleted = 0;

    for (const entry of all) {
      // Delete if no address AND no coordinates — entry can't be located at all
      const hasAddress = !!entry.address?.trim();
      const hasCoords = entry.lat != null && entry.lon != null;
      if (!hasAddress && !hasCoords) {
        await kv.del(`existing-laundromat:${entry.id}`);
        deleted++;
      }
    }

    _locationIntelCache = null; _laundromatStatsCache = null;
    logActivity(user.id, user.name, `Cleanup: deleted ${deleted} entries with no address (scanned ${all.length} total)`);
    return c.json({ deleted, total: all.length });
  } catch (err) {
    console.error("[cleanup-no-address] Error:", err);
    return c.json({ error: "Cleanup failed" }, 500);
  }
});

// ── R2 Video Upload ────────────────────────────────────────────────────────

// Generates a presigned PUT URL so the browser can upload directly to R2.
// Key format: course-videos/{lessonId}/{timestamp}-{filename}
app.post("/make-server-623b2a1c/admin/upload-video-url", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const { lessonId, filename, contentType } = await c.req.json();
    if (!lessonId || !filename) return c.json({ error: "lessonId and filename are required" }, 400);

    const accountId  = Deno.env.get("R2_ACCOUNT_ID");
    const accessKey  = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretKey  = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");
    const publicUrl  = Deno.env.get("R2_PUBLIC_URL");

    if (!accountId || !accessKey || !secretKey || !bucketName || !publicUrl) {
      return c.json({ error: "R2 credentials not configured" }, 500);
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `course-videos/${lessonId}/${Date.now()}-${safeFilename}`;
    const mime = contentType || "video/mp4";

    // AWS S3-compatible presigned URL (R2 supports this)
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const region = "auto";
    const expiresIn = 3600; // 1 hour

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const credential = `${accessKey}/${credentialScope}`;

    const canonicalUri = `/${bucketName}/${objectKey}`;
    const queryParams = [
      `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
      `X-Amz-Credential=${encodeURIComponent(credential)}`,
      `X-Amz-Date=${amzDate}`,
      `X-Amz-Expires=${expiresIn}`,
      `X-Amz-SignedHeaders=content-type%3Bhost`,
    ].join("&");

    const host = `${accountId}.r2.cloudflarestorage.com`;
    const canonicalHeaders = `content-type:${mime}\nhost:${host}\n`;
    const canonicalRequest = [
      "PUT",
      canonicalUri,
      queryParams,
      canonicalHeaders,
      "content-type;host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const encoder = new TextEncoder();
    const sign = async (key: CryptoKey, data: string) => {
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
      return new Uint8Array(sig);
    };
    const importKey = async (key: ArrayBuffer | Uint8Array) =>
      crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

    const toHex = (buf: Uint8Array) => Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(canonicalRequest)))),
    ].join("\n");

    const kDate    = await sign(await importKey(encoder.encode(`AWS4${secretKey}`)), dateStamp);
    const kRegion  = await sign(await importKey(kDate), region);
    const kService = await sign(await importKey(kRegion), "s3");
    const kSigning = await sign(await importKey(kService), "aws4_request");
    const signature = toHex(await sign(await importKey(kSigning), stringToSign));

    const presignedUrl = `${endpoint}/${bucketName}/${objectKey}?${queryParams}&X-Amz-Signature=${signature}`;
    const finalPublicUrl = `${publicUrl.replace(/\/$/, "")}/course-videos/${lessonId}/${Date.now()}-${safeFilename}`;

    // The public URL is deterministic from the key — return it so frontend can save after upload
    const videoPublicUrl = `${publicUrl.replace(/\/$/, "")}/${objectKey}`;

    logActivity(user.id, user.name, `Generated upload URL for lesson: ${lessonId}`);
    return c.json({ presignedUrl, videoPublicUrl, objectKey, mime });
  } catch (err) {
    console.error("[upload-video-url] Error:", err);
    return c.json({ error: "Failed to generate upload URL", details: err.message }, 500);
  }
});


// Deletes a video from R2 and clears the lesson's videoUrl
app.delete("/make-server-623b2a1c/admin/delete-video/:lessonId", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);

    const lessonId = c.req.param("lessonId");
    const { objectKey, moduleId } = await c.req.json();
    if (!objectKey || !moduleId) return c.json({ error: "objectKey and moduleId are required" }, 400);

    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKey = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("R2_BUCKET_NAME");

    if (!accountId || !accessKey || !secretKey || !bucketName) {
      return c.json({ error: "R2 credentials not configured" }, 500);
    }

    const region = "auto";
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const canonicalUri = `/${bucketName}/${objectKey}`;

    const encoder = new TextEncoder();
    const toHex = (buf: Uint8Array) => Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
    const sign = async (key: CryptoKey, data: string) => new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
    const importKey = async (key: Uint8Array) => crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

    const emptyHash = toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(""))));
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${emptyHash}\nx-amz-date:${amzDate}\n`;
    const canonicalRequest = ["DELETE", canonicalUri, "", canonicalHeaders, "host;x-amz-content-sha256;x-amz-date", emptyHash].join("\n");
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(canonicalRequest))))].join("\n");

    const kDate    = await sign(await importKey(encoder.encode(`AWS4${secretKey}`)), dateStamp);
    const kRegion  = await sign(await importKey(kDate), region);
    const kService = await sign(await importKey(kRegion), "s3");
    const kSigning = await sign(await importKey(kService), "aws4_request");
    const signature = toHex(await sign(await importKey(kSigning), stringToSign));

    const deleteRes = await fetch(`https://${host}/${bucketName}/${objectKey}`, {
      method: "DELETE",
      headers: {
        "Host": host,
        "x-amz-date": amzDate,
        "x-amz-content-sha256": emptyHash,
        "Authorization": `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope},SignedHeaders=host;x-amz-content-sha256;x-amz-date,Signature=${signature}`,
      },
    });

    if (!deleteRes.ok && deleteRes.status !== 204) {
      const body = await deleteRes.text();
      console.error("[delete-video] R2 error:", deleteRes.status, body);
      return c.json({ error: "Failed to delete from R2" }, 500);
    }

    // Clear videoUrl from lesson
    const structure = await getCourseStructure();
    const mod = structure.modules.find((m: any) => m.id === moduleId);
    if (mod) {
      const lesson = mod.lessons.find((l: any) => l.id === lessonId);
      if (lesson) {
        lesson.videoUrl = null;
        await kv.set("course:structure", { ...structure, updatedAt: new Date().toISOString() });
        invalidateCourseCache();
      }
    }

    logActivity(user.id, user.name, `Deleted video for lesson: ${lessonId}`);
    return c.json({ success: true });
  } catch (err) {
    console.error("[delete-video] Error:", err);
    return c.json({ error: "Failed to delete video", details: err.message }, 500);
  }
});

// ── Legal Pages (Privacy Policy & Terms of Service) ─────────────────────────

const DEFAULT_LEGAL: Record<string, string> = {
  privacy: `Privacy Policy

Last updated: January 1, 2026

1. Information We Collect
We collect information you provide directly to us, such as your name, email address, and payment information when you purchase our course.

2. How We Use Your Information
We use the information we collect to provide, maintain, and improve our services, process transactions, and send you related information including purchase confirmations and course access details.

3. Information Sharing
We do not sell, trade, or otherwise transfer your personal information to outside parties except as described in this policy. We may share your information with trusted third parties who assist us in operating our website and conducting our business.

4. Data Security
We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

5. Cookies
We may use cookies to enhance your experience on our site. You can choose to disable cookies through your browser settings.

6. Third-Party Services
We use Stripe for payment processing. Your payment information is handled directly by Stripe and is subject to their privacy policy.

7. Contact Us
If you have questions about this Privacy Policy, please contact us at support@petermayberry.com.`,

  terms: `Terms of Service

Last updated: January 1, 2026

1. Acceptance of Terms
By purchasing and accessing the Mayberry Laundromat Course, you agree to be bound by these Terms of Service.

2. Course Access
Upon successful payment, you will receive lifetime access to the course content. Access is granted to a single user and may not be shared or transferred.

3. Refund Policy
We offer a 30-day money-back guarantee. If you are not satisfied with the course, contact us within 30 days of purchase for a full refund.

4. Intellectual Property
All course content, including videos, documents, and materials, is the intellectual property of Peter Mayberry and may not be reproduced, distributed, or resold without written permission.

5. Disclaimer
The information provided in this course is for educational purposes only. Results are not guaranteed and will vary based on individual effort and market conditions.

6. Limitation of Liability
Peter Mayberry and Mayberry Capital shall not be liable for any indirect, incidental, or consequential damages arising from your use of the course.

7. Governing Law
These terms shall be governed by and construed in accordance with the laws of the United States.

8. Contact
For questions regarding these Terms, contact us at support@petermayberry.com.`,
};

app.get("/make-server-623b2a1c/legal/:page", async (c) => {
  try {
    const page = c.req.param("page");
    if (!["privacy", "terms"].includes(page)) return c.json({ error: "Not found" }, 404);
    const stored = await kv.get(`legal:${page}`);
    const content = stored?.content ?? DEFAULT_LEGAL[page];
    return c.json({ content, updatedAt: stored?.updatedAt ?? null });
  } catch {
    return c.json({ error: "Failed to fetch page" }, 500);
  }
});

app.put("/make-server-623b2a1c/legal/:page", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    const { user, error, statusCode } = await requireAdmin(token);
    if (error) return c.json({ error }, statusCode);
    const page = c.req.param("page");
    if (!["privacy", "terms"].includes(page)) return c.json({ error: "Not found" }, 404);
    const { content } = await c.req.json();
    if (typeof content !== "string" || !content.trim()) return c.json({ error: "Content is required" }, 400);
    const updatedAt = new Date().toISOString();
    await kv.set(`legal:${page}`, { content: content.trim(), updatedAt });
    logActivity(user.id, user.name, `Updated ${page === "privacy" ? "Privacy Policy" : "Terms of Service"}`);
    return c.json({ success: true, updatedAt });
  } catch {
    return c.json({ error: "Failed to update page" }, 500);
  }
});

// ── Inactive Students Cron ───────────────────────────────────────────────────

app.post("/make-server-623b2a1c/cron/inactive-students", async (c) => {
  try {
    // Verify cron secret to prevent unauthorized calls
    const secret = c.req.header("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (expectedSecret && secret !== expectedSecret) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) return c.json({ error: "RESEND_API_KEY not set" }, 500);

    const settings = await getSettings();
    const fromName = settings.emailFromName ?? settings.platformName ?? "Peter Mayberry";
    const fromEmail = settings.emailFromEmail ?? Deno.env.get("FROM_EMAIL") ?? "onboarding@resend.dev";

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const allUsers = await kv.getByPrefix("user:");
    // Only students (non-admin), with access
    const students = allUsers.filter((u: any) => !u.isAdmin && (u.paymentStatus === "paid" || u.paymentStatus === "coupon_free"));

    let sent = 0;
    let skipped = 0;

    for (const user of students) {
      // Determine last active: use lastActiveAt if set, else fall back to createdAt
      const lastActive = user.lastActiveAt ?? user.createdAt;
      if (!lastActive) { skipped++; continue; }

      const inactiveSince = now - new Date(lastActive).getTime();
      if (inactiveSince < SEVEN_DAYS_MS) { skipped++; continue; }

      // Don't re-send if we already sent an inactive email recently (within 7 days)
      if (user.inactiveEmailSentAt) {
        const lastSent = now - new Date(user.inactiveEmailSentAt).getTime();
        if (lastSent < SEVEN_DAYS_MS) { skipped++; continue; }
      }

      const daysSince = Math.floor(inactiveSince / (24 * 60 * 60 * 1000));

      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
          <h2 style="font-size:24px;font-weight:900;margin-bottom:8px;">We miss you, ${user.name?.split(" ")[0] ?? "there"} 👋</h2>
          <p style="color:#555;margin-bottom:16px;">You haven't logged into the <strong>${settings.platformName ?? "Mayberry Laundromat Course"}</strong> in ${daysSince} days.</p>
          <p style="color:#555;margin-bottom:24px;">Your laundromat journey is waiting. Even 15 minutes today keeps the momentum going.</p>
          <a href="${Deno.env.get("SITE_URL") ?? "https://petermayberry.com"}/login" style="display:inline-block;background:#000;color:#fff;padding:14px 28px;font-weight:700;text-decoration:none;font-size:15px;">
            Continue Learning →
          </a>
          <p style="color:#aaa;font-size:12px;margin-top:32px;">You're receiving this because you enrolled in ${settings.platformName ?? "the Mayberry Laundromat Course"}.</p>
        </div>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [user.email],
          subject: `${user.name?.split(" ")[0] ?? "Hey"}, your laundromat course is waiting for you`,
          html,
        }),
      });

      if (res.ok) {
        // Mark email sent so we don't spam them
        await kv.set(`user:${user.id}`, { ...user, inactiveEmailSentAt: new Date().toISOString() });
        sent++;
      } else {
        const err = await res.json().catch(() => ({}));
        console.error(`[cron/inactive-students] Failed to email ${user.email}:`, err);
        skipped++;
      }
    }

    console.log(`[cron/inactive-students] sent=${sent} skipped=${skipped}`);
    return c.json({ success: true, sent, skipped });
  } catch (err) {
    console.error("[cron/inactive-students] Error:", err);
    return c.json({ error: "Cron job failed", details: err.message }, 500);
  }
});

Deno.serve(app.fetch);