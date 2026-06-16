import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "npm:bcryptjs";

const app = new Hono();

const _siteUrl = Deno.env.get("SITE_URL");
app.use("*", cors({
  origin: _siteUrl
    ? [_siteUrl, "http://localhost:5173", "http://localhost:4173"]
    : "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type"],
}));
app.use("*", logger(console.log));

// ── Rate Limiting ─────────────────────────────────────────────────────────
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

// ── In-memory caches (invalidated on mutations) ───────────────────────────
let _courseContentCache: { data: Record<string, unknown>; expiresAt: number } | null = null;
let _structureCache: { data: any; expiresAt: number } | null = null;
let _settingsCache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function invalidateCourseCache() {
  _courseContentCache = null;
  _structureCache = null;
}

// ── Supabase client (service role — bypasses RLS) ─────────────────────────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ── Default course structure ──────────────────────────────────────────────
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

// ── Course structure (Postgres-backed) ───────────────────────────────────
async function getCourseStructure() {
  if (_structureCache && Date.now() < _structureCache.expiresAt) return _structureCache.data;

  const { data } = await supabase.from("course_structure").select("structure").eq("id", 1).single();

  if (data?.structure?.modules?.length > 0) {
    _structureCache = { data: data.structure, expiresAt: Date.now() + CACHE_TTL_MS };
    return data.structure;
  }

  // Seed default on first run
  const structure = JSON.parse(JSON.stringify(DEFAULT_COURSE_STRUCTURE));
  await supabase.from("course_structure").upsert({ id: 1, structure: { ...structure, updatedAt: new Date().toISOString() } });
  _structureCache = { data: structure, expiresAt: Date.now() + CACHE_TTL_MS };
  return structure;
}

async function saveCourseStructure(structure: any) {
  await supabase.from("course_structure").upsert({ id: 1, structure: { ...structure, updatedAt: new Date().toISOString() } });
  invalidateCourseCache();
}

// ── Settings (Postgres-backed) ────────────────────────────────────────────
const DEFAULT_SETTINGS = { platformName: "Mayberry Laundromat Course", coursePrice: "$997" };

async function getSettings() {
  if (_settingsCache && Date.now() < _settingsCache.expiresAt) return _settingsCache.data;
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  const s = data ?? DEFAULT_SETTINGS;
  const mapped = { platformName: s.platform_name ?? DEFAULT_SETTINGS.platformName, coursePrice: s.course_price ?? DEFAULT_SETTINGS.coursePrice };
  _settingsCache = { data: mapped, expiresAt: Date.now() + CACHE_TTL_MS };
  return mapped;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function generateId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 64; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

function createSessionToken(userId: string): string {
  return `${userId}|${generateId()}`;
}

function parseUserIdFromToken(token: string): string | null {
  const sep = token.indexOf("|");
  if (sep < 1) return null;
  return token.substring(0, sep);
}

// bcrypt — secure password hashing (replaces SHA-256)
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 6) return { valid: false, error: "Password must be at least 6 characters" };
  return { valid: true };
}

// ── Auth helpers ──────────────────────────────────────────────────────────
async function authenticateUser(token: string | undefined) {
  if (!token) return { user: null, error: "No token provided" };
  try {
    const userId = parseUserIdFromToken(token);
    if (!userId) return { user: null, error: "Invalid session" };

    const [{ data: session }, { data: user }] = await Promise.all([
      supabase.from("sessions").select("user_id, created_at").eq("token", token).maybeSingle(),
      supabase.from("users").select("*").eq("id", userId).maybeSingle(),
    ]);

    if (!session) return { user: null, error: "Invalid session" };

    const sessionAge = Date.now() - new Date(session.created_at).getTime();
    if (sessionAge > 24 * 60 * 60 * 1000) {
      supabase.from("sessions").delete().eq("token", token).then(() => {});
      return { user: null, error: "Session expired" };
    }

    if (!user) return { user: null, error: "User not found" };
    return { user: dbUserToApi(user), error: null };
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

// Map DB snake_case columns → camelCase API shape
function dbUserToApi(u: any) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    isAdmin: u.is_admin,
    paymentStatus: u.payment_status,
    completedModules: u.completed_modules ?? [],
    completedLessons: u.completed_lessons ?? [],
    enrolledAt: u.enrolled_at,
  };
}

function logActivity(userId: string, userName: string, action: string): void {
  const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  supabase.from("activity").insert({ id, user_id: userId, user_name: userName, action })
    .then(() => {}).catch((err: any) => console.error("[logActivity] Failed:", err));
}

// ── R2 Helpers (unchanged — no KV involved) ───────────────────────────────
function _r2Hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function _r2Sha256(data: string): Promise<string> {
  return _r2Hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)));
}
async function _r2Hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
}
async function createR2PresignedUrl(method: string, objectKey: string, expiresIn = 3600): Promise<string> {
  const accountId = Deno.env.get("R2_ACCOUNT_ID") ?? "";
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
  const secretKey = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
  const bucket = Deno.env.get("R2_BUCKET_NAME") ?? "";
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const region = "auto"; const service = "s3";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${scope}`;
  const uri = `/${bucket}/${objectKey}`;
  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate, "X-Amz-Expires": String(expiresIn), "X-Amz-SignedHeaders": "host",
  };
  const qs = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&");
  const canonicalReq = [method, uri, qs, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await _r2Sha256(canonicalReq)].join("\n");
  const kDate = await _r2Hmac(new TextEncoder().encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await _r2Hmac(kDate, region);
  const kService = await _r2Hmac(kRegion, service);
  const kSigning = await _r2Hmac(kService, "aws4_request");
  const sig = _r2Hex(await _r2Hmac(kSigning, stringToSign));
  return `https://${host}${uri}?${qs}&X-Amz-Signature=${sig}`;
}

// ── Health ────────────────────────────────────────────────────────────────
app.get("/make-server-623b2a1c/health", (c) => c.json({ status: "ok" }));
app.get("/make-server-623b2a1c/debug/config", (c) =>
  c.json({
    hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
    hasServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  })
);

// ── Signup ────────────────────────────────────────────────────────────────
app.post("/make-server-623b2a1c/signup", async (c) => {
  const ip = c.req.header("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip, 10, 60_000)) return c.json({ error: "Too many attempts. Please try again later." }, 429);

  try {
    const { email, password, name, couponCode } = await c.req.json();
    if (!isValidEmail(email)) return c.json({ error: "Invalid email format" }, 400);
    const pv = isValidPassword(password);
    if (!pv.valid) return c.json({ error: pv.error }, 400);
    if (!name?.trim()) return c.json({ error: "Name is required" }, 400);

    const emailLower = email.toLowerCase();

    // Check duplicate
    const { data: existing } = await supabase.from("users").select("id").eq("email", emailLower).maybeSingle();
    if (existing) return c.json({ error: "A user with this email already exists" }, 400);

    // Validate coupon
    let coupon: any = null;
    if (couponCode) {
      const { data: c_ } = await supabase.from("coupons").select("*").eq("code", couponCode.toUpperCase().trim()).maybeSingle();
      if (!c_ || !c_.active || c_.discount_type !== "free") return c.json({ error: "Invalid or non-free coupon code" }, 400);
      if (c_.expires_at && new Date() > new Date(c_.expires_at)) return c.json({ error: "Coupon has expired" }, 400);
      if (c_.max_uses !== null && c_.used_count >= c_.max_uses) return c.json({ error: "Coupon usage limit reached" }, 400);
      coupon = c_;
    }

    const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
    const isFirstUser = (count ?? 0) === 0;
    const settings = await getSettings();
    const priceNum = parseFloat(String(settings.coursePrice).replace(/[^0-9.]/g, "")) || 997;

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const passwordHash = await hashPassword(password);

    await supabase.from("users").insert({
      id: userId, email: emailLower, name: name.trim(),
      is_admin: isFirstUser,
      payment_status: coupon ? "coupon_free" : "direct",
      completed_modules: [], completed_lessons: [],
    });
    await supabase.from("user_auth").insert({ user_id: userId, password_hash: passwordHash });

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await supabase.from("payments").insert({
      id: paymentId, user_id: userId, user_name: name.trim(), user_email: emailLower,
      original_amount: priceNum, final_amount: 0, discount_amount: priceNum,
      coupon_code: coupon?.code ?? null, status: coupon ? "coupon_free" : "direct",
    });

    if (coupon) {
      await supabase.from("coupons").update({ used_count: coupon.used_count + 1 }).eq("code", coupon.code);
    }

    const sessionToken = createSessionToken(userId);
    await supabase.from("sessions").insert({ token: sessionToken, user_id: userId });

    const userData = { id: userId, email: emailLower, name: name.trim(), isAdmin: isFirstUser, completedModules: [], completedLessons: [], paymentStatus: coupon ? "coupon_free" : "direct" };
    logActivity(userId, userData.name, coupon ? `Signed up with coupon: ${coupon.code}` : "Signed up");
    return c.json({ success: true, token: sessionToken, user: userData });
  } catch (err) {
    console.error("[/signup] Error:", err);
    return c.json({ error: "Signup failed", details: err.message }, 500);
  }
});

// ── Login ─────────────────────────────────────────────────────────────────
app.post("/make-server-623b2a1c/login", async (c) => {
  const ip = c.req.header("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip, 10, 60_000)) return c.json({ error: "Too many attempts. Please try again later." }, 429);

  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: "Email and password are required" }, 400);

    const emailLower = email.toLowerCase();
    const [{ data: user }, ] = await Promise.all([
      supabase.from("users").select("*").eq("email", emailLower).maybeSingle(),
    ]);

    if (!user) return c.json({ error: "Invalid credentials" }, 401);

    const { data: auth } = await supabase.from("user_auth").select("password_hash").eq("user_id", user.id).maybeSingle();
    if (!auth?.password_hash) return c.json({ error: "Invalid credentials" }, 401);

    const valid = await verifyPassword(password, auth.password_hash);
    if (!valid) return c.json({ error: "Invalid credentials" }, 401);

    const sessionToken = createSessionToken(user.id);
    await supabase.from("sessions").insert({ token: sessionToken, user_id: user.id });

    const apiUser = dbUserToApi(user);
    logActivity(user.id, user.name, "Logged in");
    return c.json({ success: true, token: sessionToken, user: apiUser });
  } catch (err) {
    console.error("[/login] Error:", err);
    return c.json({ error: "Login failed", details: err.message }, 500);
  }
});

// ── Logout ────────────────────────────────────────────────────────────────
app.post("/make-server-623b2a1c/logout", async (c) => {
  try {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (token) await supabase.from("sessions").delete().eq("token", token);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: "Logout failed", details: err.message }, 500);
  }
});

// ── Get / sync user ───────────────────────────────────────────────────────
app.post("/make-server-623b2a1c/sync-user", async (c) => {
  const { user, error } = await authenticateUser(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);
  return c.json({ user });
});

app.get("/make-server-623b2a1c/user", async (c) => {
  const { user, error } = await authenticateUser(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);
  return c.json({ user });
});

// ── Update profile ────────────────────────────────────────────────────────
app.put("/make-server-623b2a1c/user/profile", async (c) => {
  const { user, error } = await authenticateUser(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);
  const { name } = await c.req.json();
  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);
  await supabase.from("users").update({ name: name.trim() }).eq("id", user.id);
  logActivity(user.id, name.trim(), "Updated profile");
  return c.json({ success: true, user: { ...user, name: name.trim() } });
});

// ── Complete module ───────────────────────────────────────────────────────
app.post("/make-server-623b2a1c/complete-module", async (c) => {
  const { user, error } = await authenticateUser(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

  const { moduleId } = await c.req.json();
  const structure = await getCourseStructure();
  if (!moduleId || !structure.modules.find((m: any) => m.id === moduleId)) return c.json({ error: "Invalid module ID" }, 400);

  if (!user.completedModules.includes(moduleId)) {
    const updated = [...user.completedModules, moduleId];
    await supabase.from("users").update({ completed_modules: updated }).eq("id", user.id);
    logActivity(user.id, user.name, `Completed ${moduleId}`);
    return c.json({ completedModules: updated });
  }
  return c.json({ completedModules: user.completedModules });
});

// ── Locations ─────────────────────────────────────────────────────────────
app.post("/make-server-623b2a1c/locations", async (c) => {
  const { user, error } = await authenticateUser(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

  const { address, city, state, notes, dealScore, status } = await c.req.json();
  if (!address?.trim() || !city?.trim() || !state?.trim()) return c.json({ error: "Address, city, and state are required" }, 400);

  const locationId = `loc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const location = {
    id: locationId, user_id: user.id, user_name: user.name,
    address: address.trim(), city: city.trim(), state: state.trim(),
    notes: notes?.trim() ?? "",
    deal_score: Math.min(10, Math.max(0, Number(dealScore) || 5)),
    status: status ?? "researching",
  };
  await supabase.from("locations").insert(location);
  logActivity(user.id, user.name, `Added location: ${address}, ${city}`);
  return c.json({ success: true, location: { ...location, dealScore: location.deal_score, userId: location.user_id } });
});

app.get("/make-server-623b2a1c/locations/my", async (c) => {
  const { user, error } = await authenticateUser(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);
  const { data } = await supabase.from("locations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return c.json({ locations: data ?? [] });
});

app.put("/make-server-623b2a1c/locations/:id", async (c) => {
  const { user, error } = await authenticateUser(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

  const locationId = c.req.param("id");
  const { data: location } = await supabase.from("locations").select("*").eq("id", locationId).maybeSingle();
  if (!location) return c.json({ error: "Location not found" }, 404);
  if (location.user_id !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);

  const { address, city, state, notes, dealScore, status } = await c.req.json();
  const updates: any = {};
  if (address !== undefined) updates.address = address.trim();
  if (city !== undefined) updates.city = city.trim();
  if (state !== undefined) updates.state = state.trim();
  if (notes !== undefined) updates.notes = notes.trim();
  if (dealScore !== undefined) updates.deal_score = Math.min(10, Math.max(0, Number(dealScore)));
  if (status !== undefined) updates.status = status;

  const { data: updated } = await supabase.from("locations").update(updates).eq("id", locationId).select().single();
  return c.json({ success: true, location: updated });
});

app.delete("/make-server-623b2a1c/locations/:id", async (c) => {
  const { user, error } = await authenticateUser(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

  const locationId = c.req.param("id");
  const { data: location } = await supabase.from("locations").select("*").eq("id", locationId).maybeSingle();
  if (!location) return c.json({ error: "Location not found" }, 404);
  if (location.user_id !== user.id && !user.isAdmin) return c.json({ error: "Forbidden" }, 403);

  await supabase.from("locations").delete().eq("id", locationId);
  logActivity(user.id, user.name, `Deleted location: ${location.address}, ${location.city}`);
  return c.json({ success: true });
});

app.get("/make-server-623b2a1c/admin/all-locations", async (c) => {
  const { error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);
  const { data } = await supabase.from("locations").select("*").order("created_at", { ascending: false });
  return c.json({ locations: data ?? [] });
});

// ── Activity ──────────────────────────────────────────────────────────────
app.get("/make-server-623b2a1c/admin/activity", async (c) => {
  const { error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);
  const { data } = await supabase.from("activity").select("*").order("created_at", { ascending: false }).limit(100);
  return c.json({ activity: (data ?? []).map(a => ({ ...a, timestamp: a.created_at })) });
});

// ── Settings ──────────────────────────────────────────────────────────────
app.get("/make-server-623b2a1c/settings", async (c) => {
  return c.json({ settings: await getSettings() });
});

app.put("/make-server-623b2a1c/settings", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const { platformName, coursePrice } = await c.req.json();
  const settings = {
    platform_name: platformName?.trim() ?? "Mayberry Laundromat Course",
    course_price: coursePrice?.trim() ?? "$997",
  };
  await supabase.from("settings").upsert({ id: 1, ...settings });
  _settingsCache = null;
  logActivity(user.id, user.name, "Updated platform settings");
  return c.json({ success: true, settings: { platformName: settings.platform_name, coursePrice: settings.course_price } });
});

// ── Admin users ───────────────────────────────────────────────────────────
app.get("/make-server-623b2a1c/admin/users", async (c) => {
  const { error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);
  const { data } = await supabase.from("users").select("*").order("enrolled_at", { ascending: false });
  return c.json({ users: (data ?? []).map(dbUserToApi) });
});

app.get("/make-server-623b2a1c/admin/stats", async (c) => {
  const { error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const [{ data: allUsers }, structure] = await Promise.all([
    supabase.from("users").select("*").order("enrolled_at", { ascending: false }),
    getCourseStructure(),
  ]);

  const users = allUsers ?? [];
  const moduleCompletions: Record<string, number> = {};
  for (const m of structure.modules) moduleCompletions[m.id] = 0;
  for (const u of users) {
    for (const m of (u.completed_modules ?? [])) {
      if (moduleCompletions[m] !== undefined) moduleCompletions[m]++;
    }
  }

  return c.json({
    stats: {
      totalUsers: users.length,
      totalAdmins: users.filter((u: any) => u.is_admin).length,
      totalStudents: users.filter((u: any) => !u.is_admin).length,
      moduleCompletions,
      recentUsers: users.slice(0, 5).map(dbUserToApi),
    },
  });
});

app.post("/make-server-623b2a1c/admin/toggle-admin", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const { userId } = await c.req.json();
  if (!userId) return c.json({ error: "User ID is required" }, 400);
  if (user.id === userId) return c.json({ error: "You cannot remove your own admin privileges" }, 400);

  const { data: target } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  if (!target) return c.json({ error: "User not found" }, 404);

  const newAdmin = !target.is_admin;
  await supabase.from("users").update({ is_admin: newAdmin }).eq("id", userId);
  logActivity(user.id, user.name, `${newAdmin ? "Granted" : "Revoked"} admin for ${target.name}`);
  return c.json({ success: true, user: dbUserToApi({ ...target, is_admin: newAdmin }) });
});

app.delete("/make-server-623b2a1c/admin/users/:userId", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const userIdToDelete = c.req.param("userId");
  if (user.id === userIdToDelete) return c.json({ error: "You cannot delete your own account" }, 400);

  const { data: target } = await supabase.from("users").select("name").eq("id", userIdToDelete).maybeSingle();
  if (!target) return c.json({ error: "User not found" }, 404);

  // Cascade deletes user_auth and sessions via FK on delete cascade
  await supabase.from("users").delete().eq("id", userIdToDelete);
  logActivity(user.id, user.name, `Deleted user: ${target.name}`);
  return c.json({ success: true });
});

app.put("/make-server-623b2a1c/admin/users/:userId/modules", async (c) => {
  const { error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const userId = c.req.param("userId");
  const { completedModules } = await c.req.json();
  if (!Array.isArray(completedModules)) return c.json({ error: "completedModules must be an array" }, 400);

  const [{ data: target }, structure] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).maybeSingle(),
    getCourseStructure(),
  ]);
  if (!target) return c.json({ error: "User not found" }, 404);

  const validIds = new Set(structure.modules.map((m: any) => m.id));
  const invalid = completedModules.filter((m: string) => !validIds.has(m));
  if (invalid.length > 0) return c.json({ error: `Invalid module IDs: ${invalid.join(", ")}` }, 400);

  await supabase.from("users").update({ completed_modules: completedModules }).eq("id", userId);
  return c.json({ success: true, user: dbUserToApi({ ...target, completed_modules: completedModules }) });
});

// ── Course content ────────────────────────────────────────────────────────
app.get("/make-server-623b2a1c/course/content", async (c) => {
  if (_courseContentCache && Date.now() < _courseContentCache.expiresAt) return c.json(_courseContentCache.data);
  const structure = await getCourseStructure();
  const videoMap: Record<string, any> = {};
  for (const mod of structure.modules) for (const lesson of mod.lessons) videoMap[lesson.id] = lesson;
  const result = { lessons: videoMap };
  _courseContentCache = { data: result, expiresAt: Date.now() + CACHE_TTL_MS };
  return c.json(result);
});

app.post("/make-server-623b2a1c/complete-lesson", async (c) => {
  const { user, error } = await authenticateUser(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error || !user) return c.json({ error: error || "Unauthorized" }, 401);

  const { lessonId } = await c.req.json();
  const structure = await getCourseStructure();
  const parentModule = structure.modules.find((m: any) => m.lessons.some((l: any) => l.id === lessonId));
  if (!lessonId || !parentModule) return c.json({ error: "Invalid lesson ID" }, 400);

  let completedLessons = [...(user.completedLessons ?? [])];
  let completedModules = [...(user.completedModules ?? [])];
  let moduleCompleted: string | null = null;

  if (!completedLessons.includes(lessonId)) {
    completedLessons.push(lessonId);
    const allDone = parentModule.lessons.every((l: any) => completedLessons.includes(l.id));
    if (allDone && !completedModules.includes(parentModule.id)) {
      completedModules.push(parentModule.id);
      moduleCompleted = parentModule.id;
      logActivity(user.id, user.name, `Completed module: ${parentModule.title}`);
    }
    await supabase.from("users").update({ completed_lessons: completedLessons, completed_modules: completedModules }).eq("id", user.id);
    logActivity(user.id, user.name, `Completed lesson: ${lessonId}`);
  }

  return c.json({ completedLessons, completedModules, moduleCompleted });
});

app.put("/make-server-623b2a1c/admin/lessons/:lessonId", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const lessonId = c.req.param("lessonId");
  const structure = await getCourseStructure();
  const parentMod = structure.modules.find((m: any) => m.lessons.some((l: any) => l.id === lessonId));
  if (!parentMod) return c.json({ error: "Invalid lesson ID" }, 400);

  const { videoUrl, duration } = await c.req.json();
  const lesson = parentMod.lessons.find((l: any) => l.id === lessonId);
  if (videoUrl !== undefined) lesson.videoUrl = videoUrl || null;
  if (duration !== undefined) lesson.duration = duration;
  await saveCourseStructure(structure);
  logActivity(user.id, user.name, `Updated lesson: ${lessonId}`);
  return c.json({ success: true, lesson });
});

app.get("/make-server-623b2a1c/admin/course/status", async (c) => {
  const { error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);
  const structure = await getCourseStructure();
  const videoMap: Record<string, any> = {};
  const allLessons = structure.modules.flatMap((m: any) => m.lessons);
  for (const lesson of allLessons) videoMap[lesson.id] = lesson;
  return c.json({ lessons: videoMap, totalLessons: allLessons.length, uploadedCount: allLessons.filter((l: any) => l.videoUrl).length });
});

// ── Password reset ────────────────────────────────────────────────────────
function generateResetToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

app.post("/make-server-623b2a1c/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email || !isValidEmail(email)) return c.json({ success: true });

    const emailLower = email.toLowerCase();
    const { data: user } = await supabase.from("users").select("id, name, email").eq("email", emailLower).maybeSingle();
    if (!user) return c.json({ success: true });

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await supabase.from("password_resets").insert({ token, user_id: user.id, expires_at: expiresAt });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://mayberrylaundromat.com";
    const resetLink = `${siteUrl}/reset-password?token=${token}`;

    if (resendApiKey) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: Deno.env.get("FROM_EMAIL") ?? "onboarding@resend.dev",
          to: [user.email],
          subject: "Reset your password",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;">
  <h1 style="font-size:28px;font-weight:900;margin:0 0 8px;">Reset Your Password</h1>
  <p style="color:#525252;margin:0 0 24px;">Hi ${user.name},</p>
  <p style="color:#525252;margin:0 0 32px;">Click the link below to reset your password. Expires in <strong>1 hour</strong>.</p>
  <a href="${resetLink}" style="display:inline-block;background:#000;color:#fff;padding:14px 32px;font-weight:700;text-decoration:none;">RESET PASSWORD</a>
  <p style="color:#a3a3a3;font-size:13px;margin:32px 0 0;">If you didn't request this, ignore this email.</p>
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

    const { data: reset } = await supabase.from("password_resets").select("*").eq("token", token).maybeSingle();
    if (!reset) return c.json({ error: "Invalid or expired reset link" }, 400);
    if (new Date() > new Date(reset.expires_at)) {
      await supabase.from("password_resets").delete().eq("token", token);
      return c.json({ error: "This reset link has expired. Please request a new one." }, 400);
    }

    const { data: user } = await supabase.from("users").select("name").eq("id", reset.user_id).maybeSingle();
    if (!user) return c.json({ error: "User not found" }, 400);

    const newHash = await hashPassword(password);
    await Promise.all([
      supabase.from("user_auth").upsert({ user_id: reset.user_id, password_hash: newHash }),
      supabase.from("password_resets").delete().eq("token", token),
    ]);

    logActivity(reset.user_id, user.name, "Reset password");
    return c.json({ success: true });
  } catch (err) {
    console.error("[/reset-password] Error:", err);
    return c.json({ error: "Failed to reset password" }, 500);
  }
});

// ── Seed demo users ───────────────────────────────────────────────────────
app.post("/make-server-623b2a1c/seed-demo-users", async (c) => {
  try {
    const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) return c.json({ error: "Seed disabled: users already exist" }, 403);

    const demoUsers = [
      { email: "admin@laundromat.com", password: "Admin123!", name: "Peter Mayberry", isAdmin: true },
      { email: "student@laundromat.com", password: "Student123!", name: "John Student", isAdmin: false },
    ];

    const results = [];
    for (const demo of demoUsers) {
      const userId = `user_${demo.email.split("@")[0]}_${Date.now()}`;
      const passwordHash = await hashPassword(demo.password);
      await supabase.from("users").insert({
        id: userId, email: demo.email, name: demo.name, is_admin: demo.isAdmin,
        completed_modules: demo.isAdmin ? ["module-1", "module-2"] : ["module-1"],
        completed_lessons: [], payment_status: "direct",
      });
      await supabase.from("user_auth").insert({ user_id: userId, password_hash: passwordHash });
      results.push({ email: demo.email, status: "created" });
    }

    return c.json({ success: true, message: "Demo users seeded", results,
      credentials: { admin: { email: "admin@laundromat.com", password: "Admin123!" }, student: { email: "student@laundromat.com", password: "Student123!" } },
    });
  } catch (err) {
    return c.json({ error: "Failed to seed demo users" }, 500);
  }
});

// ── Coupons ───────────────────────────────────────────────────────────────
app.post("/make-server-623b2a1c/admin/coupons", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const { code, discountType, discountValue, maxUses, expiresAt } = await c.req.json();
  if (!code || !discountType) return c.json({ error: "code and discountType are required" }, 400);
  if (!["free", "percent", "fixed"].includes(discountType)) return c.json({ error: "discountType must be free, percent, or fixed" }, 400);
  if (discountType !== "free" && (!discountValue || Number(discountValue) <= 0)) return c.json({ error: "discountValue required for non-free coupons" }, 400);

  const upperCode = code.toUpperCase().trim().replace(/\s+/g, "");
  const { data: existing } = await supabase.from("coupons").select("code").eq("code", upperCode).maybeSingle();
  if (existing) return c.json({ error: "Coupon code already exists" }, 400);

  const coupon = {
    code: upperCode, discount_type: discountType,
    discount_value: discountType === "free" ? 100 : Number(discountValue),
    max_uses: maxUses ? Number(maxUses) : null,
    used_count: 0, expires_at: expiresAt ?? null, active: true, created_by: user.id,
  };
  await supabase.from("coupons").insert(coupon);
  logActivity(user.id, user.name, `Created coupon: ${upperCode}`);
  return c.json({ success: true, coupon });
});

app.get("/make-server-623b2a1c/admin/coupons", async (c) => {
  const { error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);
  const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
  return c.json({ coupons: data ?? [] });
});

app.patch("/make-server-623b2a1c/admin/coupons/:code", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const code = c.req.param("code").toUpperCase();
  const { data: coupon } = await supabase.from("coupons").select("*").eq("code", code).maybeSingle();
  if (!coupon) return c.json({ error: "Coupon not found" }, 404);

  const updates = await c.req.json();
  const { data: updated } = await supabase.from("coupons").update(updates).eq("code", code).select().single();
  logActivity(user.id, user.name, `Updated coupon: ${code}`);
  return c.json({ success: true, coupon: updated });
});

app.delete("/make-server-623b2a1c/admin/coupons/:code", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const code = c.req.param("code").toUpperCase();
  const { data: coupon } = await supabase.from("coupons").select("code").eq("code", code).maybeSingle();
  if (!coupon) return c.json({ error: "Coupon not found" }, 404);

  await supabase.from("coupons").delete().eq("code", code);
  logActivity(user.id, user.name, `Deleted coupon: ${code}`);
  return c.json({ success: true });
});

app.post("/make-server-623b2a1c/validate-coupon", async (c) => {
  const ip = c.req.header("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip, 10, 60_000)) return c.json({ valid: false, error: "Too many requests." });

  const { code } = await c.req.json();
  if (!code) return c.json({ valid: false, error: "No code provided" });

  const upperCode = code.toUpperCase().trim();
  const { data: coupon } = await supabase.from("coupons").select("*").eq("code", upperCode).maybeSingle();
  if (!coupon) return c.json({ valid: false, error: "Invalid coupon code" });
  if (!coupon.active) return c.json({ valid: false, error: "This coupon is no longer active" });
  if (coupon.expires_at && new Date() > new Date(coupon.expires_at)) return c.json({ valid: false, error: "This coupon has expired" });
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return c.json({ valid: false, error: "This coupon has reached its usage limit" });

  return c.json({ valid: true, coupon: { code: coupon.code, discountType: coupon.discount_type, discountValue: coupon.discount_value } });
});

// ── Stripe payments ───────────────────────────────────────────────────────
app.post("/make-server-623b2a1c/create-checkout-session", async (c) => {
  const ip = c.req.header("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip, 5, 60_000)) return c.json({ error: "Too many requests." }, 429);

  const { name, email, password, couponCode } = await c.req.json();
  if (!isValidEmail(email)) return c.json({ error: "Invalid email format" }, 400);
  const pv = isValidPassword(password);
  if (!pv.valid) return c.json({ error: pv.error }, 400);
  if (!name?.trim()) return c.json({ error: "Name is required" }, 400);

  const emailLower = email.toLowerCase();
  const { data: existing } = await supabase.from("users").select("id").eq("email", emailLower).maybeSingle();
  if (existing) return c.json({ error: "An account with this email already exists" }, 400);

  let coupon: any = null;
  if (couponCode) {
    const upperCode = couponCode.toUpperCase().trim();
    const { data: c_ } = await supabase.from("coupons").select("*").eq("code", upperCode).maybeSingle();
    if (!c_ || !c_.active) return c.json({ error: "Invalid coupon code" }, 400);
    if (c_.expires_at && new Date() > new Date(c_.expires_at)) return c.json({ error: "Coupon has expired" }, 400);
    if (c_.max_uses !== null && c_.used_count >= c_.max_uses) return c.json({ error: "Coupon usage limit reached" }, 400);
    coupon = c_;
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY_TEST");
  if (!stripeKey) return c.json({ error: "Payment system not configured" }, 500);

  const settings = await getSettings();
  const priceNum = parseFloat(String(settings.coursePrice).replace(/[^0-9.]/g, "")) || 997;
  let finalPrice = priceNum;
  if (coupon?.discount_type === "percent") finalPrice = priceNum * (1 - coupon.discount_value / 100);
  if (coupon?.discount_type === "fixed") finalPrice = Math.max(0, priceNum - coupon.discount_value);
  finalPrice = Math.round(finalPrice * 100) / 100;

  const passwordHash = await hashPassword(password);
  const pendingId = generateId();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

  await supabase.from("pending_checkouts").insert({
    id: pendingId, name: name.trim(), email: emailLower,
    password_hash: passwordHash, coupon_code: coupon?.code ?? null,
    original_price: priceNum, final_price: finalPrice, expires_at: expiresAt,
  });

  const siteUrl = Deno.env.get("SITE_URL") ?? "https://mayberrylaundromat.com";
  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
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
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
  if (!webhookSecret) return c.json({ error: "Not configured" }, 500);

  const body = await c.req.text();
  const signature = c.req.header("stripe-signature") ?? "";

  let event: any;
  try {
    const parts = signature.split(",").reduce((acc: any, part) => {
      const [k, v] = part.split("="); acc[k] = v; return acc;
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

    const { data: pending } = await supabase.from("pending_checkouts").select("*").eq("id", pendingId).maybeSingle();
    if (!pending) return c.json({ received: true });

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const sessionToken = createSessionToken(userId);
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await Promise.all([
      supabase.from("users").insert({
        id: userId, email: pending.email, name: pending.name,
        is_admin: false, payment_status: "paid",
        completed_modules: [], completed_lessons: [],
      }),
      supabase.from("user_auth").insert({ user_id: userId, password_hash: pending.password_hash }),
      supabase.from("sessions").insert({ token: sessionToken, user_id: userId }),
      supabase.from("payments").insert({
        id: paymentId, user_id: userId, user_name: pending.name, user_email: pending.email,
        original_amount: pending.original_price, final_amount: pending.final_price,
        discount_amount: Math.round((pending.original_price - pending.final_price) * 100) / 100,
        coupon_code: pending.coupon_code,
        stripe_session_id: session.id, stripe_payment_intent_id: session.payment_intent ?? null,
        status: "paid",
      }),
      supabase.from("checkout_results").insert({
        pending_id: pendingId, token: sessionToken, user_id: userId, status: "complete",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      }),
      supabase.from("pending_checkouts").delete().eq("id", pendingId),
    ]);

    if (pending.coupon_code) {
      const { data: coupon } = await supabase.from("coupons").select("used_count").eq("code", pending.coupon_code).maybeSingle();
      if (coupon) await supabase.from("coupons").update({ used_count: coupon.used_count + 1 }).eq("code", pending.coupon_code);
    }

    logActivity(userId, pending.name, "Enrolled via Stripe payment");
  }

  return c.json({ received: true });
});

app.get("/make-server-623b2a1c/checkout/status", async (c) => {
  const pendingId = c.req.query("session");
  if (!pendingId) return c.json({ status: "not_found" });

  const { data: result } = await supabase.from("checkout_results").select("*").eq("pending_id", pendingId).maybeSingle();
  if (!result) {
    const { data: pending } = await supabase.from("pending_checkouts").select("id").eq("id", pendingId).maybeSingle();
    return c.json({ status: pending ? "pending" : "not_found" });
  }

  if (new Date() > new Date(result.expires_at)) {
    await supabase.from("checkout_results").delete().eq("pending_id", pendingId);
    return c.json({ status: "expired" });
  }

  const { data: user } = await supabase.from("users").select("*").eq("id", result.user_id).single();
  await supabase.from("checkout_results").delete().eq("pending_id", pendingId);
  return c.json({ status: "complete", token: result.token, user: user ? dbUserToApi(user) : null });
});

// ── Admin payments ────────────────────────────────────────────────────────
app.get("/make-server-623b2a1c/admin/payments", async (c) => {
  const { error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);
  const { data } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
  return c.json({ payments: data ?? [] });
});

// ── Course structure CRUD ─────────────────────────────────────────────────
app.get("/make-server-623b2a1c/course/structure", async (c) => {
  return c.json(await getCourseStructure());
});

app.post("/make-server-623b2a1c/admin/modules", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const { title, description } = await c.req.json();
  if (!title?.trim()) return c.json({ error: "title is required" }, 400);

  const structure = await getCourseStructure();
  if (!Array.isArray(structure.modules)) structure.modules = [];

  const newModule = {
    id: `module-${Date.now()}`, title: title.trim(),
    description: description?.trim() ?? "", duration: "0 min",
    order: structure.modules.length, lessons: [],
  };
  structure.modules.push(newModule);
  await saveCourseStructure(structure);
  logActivity(user.id, user.name, `Added module: ${title}`);
  return c.json({ success: true, structure });
});

app.patch("/make-server-623b2a1c/admin/modules/:moduleId", async (c) => {
  const { error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
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
  await saveCourseStructure(structure);
  return c.json({ success: true, structure });
});

app.delete("/make-server-623b2a1c/admin/modules/:moduleId", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const moduleId = c.req.param("moduleId");
  const structure = await getCourseStructure();
  const idx = structure.modules.findIndex((m: any) => m.id === moduleId);
  if (idx === -1) return c.json({ error: "Module not found" }, 404);

  const name = structure.modules[idx].title;
  structure.modules.splice(idx, 1);
  await saveCourseStructure(structure);
  logActivity(user.id, user.name, `Deleted module: ${name}`);
  return c.json({ success: true, structure });
});

app.post("/make-server-623b2a1c/admin/modules/:moduleId/lessons", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const moduleId = c.req.param("moduleId");
  const structure = await getCourseStructure();
  const mod = structure.modules.find((m: any) => m.id === moduleId);
  if (!mod) return c.json({ error: "Module not found" }, 404);

  const { title, duration } = await c.req.json();
  if (!title?.trim()) return c.json({ error: "title is required" }, 400);

  const newLesson = { id: `${moduleId}-lesson-${Date.now()}`, title: title.trim(), duration: duration?.trim() ?? "0:00", order: mod.lessons.length, videoUrl: null };
  mod.lessons.push(newLesson);
  await saveCourseStructure(structure);
  logActivity(user.id, user.name, `Added lesson: ${title}`);
  return c.json({ success: true, structure });
});

app.patch("/make-server-623b2a1c/admin/modules/:moduleId/lessons/:lessonId", async (c) => {
  const { error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
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
  await saveCourseStructure(structure);
  return c.json({ success: true, structure });
});

app.delete("/make-server-623b2a1c/admin/modules/:moduleId/lessons/:lessonId", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const { moduleId, lessonId } = c.req.param();
  const structure = await getCourseStructure();
  const mod = structure.modules.find((m: any) => m.id === moduleId);
  if (!mod) return c.json({ error: "Module not found" }, 404);
  const lessonIdx = mod.lessons.findIndex((l: any) => l.id === lessonId);
  if (lessonIdx === -1) return c.json({ error: "Lesson not found" }, 404);

  const name = mod.lessons[lessonIdx].title;
  mod.lessons.splice(lessonIdx, 1);
  await saveCourseStructure(structure);
  logActivity(user.id, user.name, `Deleted lesson: ${name}`);
  return c.json({ success: true, structure });
});

app.get("/make-server-623b2a1c/modules", async (c) => {
  const structure = await getCourseStructure();
  return c.json({ modules: structure.modules.map((m: any) => ({ id: m.id, title: m.title, duration: m.duration })) });
});

// ── R2 Video upload ───────────────────────────────────────────────────────
app.post("/make-server-623b2a1c/admin/upload-url", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const { moduleId, lessonId, fileName } = await c.req.json();
  if (!moduleId || !lessonId || !fileName) return c.json({ error: "moduleId, lessonId, and fileName are required" }, 400);

  const structure = await getCourseStructure();
  const mod = structure.modules.find((m: any) => m.id === moduleId);
  if (!mod) return c.json({ error: "Module not found" }, 404);
  const lesson = mod.lessons.find((l: any) => l.id === lessonId);
  if (!lesson) return c.json({ error: "Lesson not found" }, 404);

  const ext = fileName.split(".").pop()?.toLowerCase() || "mp4";
  const objectKey = `course-videos/${moduleId}/${lessonId}.${ext}`;
  const r2PublicUrl = Deno.env.get("R2_PUBLIC_URL") ?? "";
  if (!r2PublicUrl) return c.json({ error: "R2_PUBLIC_URL not configured" }, 500);

  const uploadUrl = await createR2PresignedUrl("PUT", objectKey, 7200);
  const publicUrl = `${r2PublicUrl.replace(/\/$/, "")}/${objectKey}`;
  return c.json({ uploadUrl, publicUrl, objectKey });
});

app.post("/make-server-623b2a1c/admin/confirm-video-upload", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const { moduleId, lessonId, publicUrl } = await c.req.json();
  if (!moduleId || !lessonId || !publicUrl) return c.json({ error: "moduleId, lessonId, and publicUrl are required" }, 400);

  const structure = await getCourseStructure();
  const mod = structure.modules.find((m: any) => m.id === moduleId);
  if (!mod) return c.json({ error: "Module not found" }, 404);
  const lesson = mod.lessons.find((l: any) => l.id === lessonId);
  if (!lesson) return c.json({ error: "Lesson not found" }, 404);

  lesson.videoUrl = publicUrl;
  await saveCourseStructure(structure);
  logActivity(user.id, user.name, `Uploaded video for: ${lesson.title}`);
  return c.json({ success: true, lesson });
});

app.delete("/make-server-623b2a1c/admin/video/:moduleId/:lessonId", async (c) => {
  const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  if (error) return c.json({ error }, statusCode);

  const moduleId = c.req.param("moduleId");
  const lessonId = c.req.param("lessonId");
  const structure = await getCourseStructure();
  const mod = structure.modules.find((m: any) => m.id === moduleId);
  if (!mod) return c.json({ error: "Module not found" }, 404);
  const lesson = mod.lessons.find((l: any) => l.id === lessonId);
  if (!lesson) return c.json({ error: "Lesson not found" }, 404);

  const r2PublicUrl = Deno.env.get("R2_PUBLIC_URL") ?? "";
  if (lesson.videoUrl && r2PublicUrl && lesson.videoUrl.startsWith(r2PublicUrl)) {
    const objectKey = lesson.videoUrl.replace(`${r2PublicUrl.replace(/\/$/, "")}/`, "");
    try {
      const delUrl = await createR2PresignedUrl("DELETE", objectKey, 60);
      await fetch(delUrl, { method: "DELETE" });
    } catch (e) { console.error("[R2 delete] best-effort failed:", e); }
  }

  lesson.videoUrl = null;
  await saveCourseStructure(structure);
  logActivity(user.id, user.name, `Removed video from: ${lesson.title}`);
  return c.json({ success: true });
});

app.post("/make-server-623b2a1c/admin/migrate-kv", async (c) => {
  // const { user, error, statusCode } = await requireAdmin(c.req.header("Authorization")?.replace("Bearer ", ""));
  // if (error) return c.json({ error }, statusCode);


   const secret = c.req.header("x-migrate-secret");
  if (secret !== "SOME_RANDOM_STRING_YOU_CHOOSE") return c.json({ error: "Unauthorized" }, 401);

  
  try {
    const results: any = { users: 0, payments: 0, locations: 0, coupons: 0, activity: 0, settings: false, structure: false };

    // Import kv store
    const kv = await import("./kv_store.tsx");

    // ── Users + Auth ──────────────────────────────────────────────────────
    const allUsers = await kv.getByPrefix("user:");
    for (const u of allUsers) {
      const auth = await kv.get(`auth:${u.id}`);
      const { error: uErr } = await supabase.from("users").upsert({
        id: u.id, email: u.email, name: u.name,
        is_admin: u.isAdmin ?? false,
        payment_status: u.paymentStatus ?? "direct",
        completed_modules: u.completedModules ?? [],
        completed_lessons: u.completedLessons ?? [],
        enrolled_at: u.enrolledAt ?? new Date().toISOString(),
      }, { onConflict: "id" });
      if (!uErr && auth?.passwordHash) {
        await supabase.from("user_auth").upsert({ user_id: u.id, password_hash: auth.passwordHash }, { onConflict: "user_id" });
      }
      if (!uErr) results.users++;
    }

    // ── Payments ──────────────────────────────────────────────────────────
    const allPayments = await kv.getByPrefix("payment:");
    for (const p of allPayments) {
      await supabase.from("payments").upsert({
        id: p.id, user_id: p.userId, user_name: p.userName, user_email: p.userEmail,
        original_amount: p.originalAmount, final_amount: p.finalAmount,
        discount_amount: p.discountAmount ?? 0, coupon_code: p.couponCode ?? null,
        stripe_session_id: p.stripeSessionId ?? null,
        stripe_payment_intent_id: p.stripePaymentIntentId ?? null,
        status: p.status, created_at: p.createdAt,
      }, { onConflict: "id" });
      results.payments++;
    }

    // ── Locations ─────────────────────────────────────────────────────────
    const allLocations = await kv.getByPrefix("location:");
    for (const l of allLocations) {
      await supabase.from("locations").upsert({
        id: l.id, user_id: l.userId, user_name: l.userName,
        address: l.address, city: l.city, state: l.state,
        notes: l.notes ?? "", deal_score: l.dealScore ?? 5,
        status: l.status ?? "researching", created_at: l.createdAt,
      }, { onConflict: "id" });
      results.locations++;
    }

    // ── Coupons ───────────────────────────────────────────────────────────
    const allCoupons = await kv.getByPrefix("coupon:");
    for (const c_ of allCoupons) {
      await supabase.from("coupons").upsert({
        code: c_.code, discount_type: c_.discountType,
        discount_value: c_.discountValue, max_uses: c_.maxUses ?? null,
        used_count: c_.usedCount ?? 0, expires_at: c_.expiresAt ?? null,
        active: c_.active ?? true, created_by: c_.createdBy ?? null,
        created_at: c_.createdAt,
      }, { onConflict: "code" });
      results.coupons++;
    }

    // ── Activity ──────────────────────────────────────────────────────────
    const allActivity = await kv.getByPrefix("activity:");
    for (const a of allActivity) {
      await supabase.from("activity").upsert({
        id: a.id, user_id: a.userId, user_name: a.userName,
        action: a.action, created_at: a.timestamp,
      }, { onConflict: "id" });
      results.activity++;
    }

    // ── Settings ──────────────────────────────────────────────────────────
    const settings = await kv.get("settings:platform");
    if (settings) {
      await supabase.from("settings").upsert({
        id: 1, platform_name: settings.platformName, course_price: settings.coursePrice,
      }, { onConflict: "id" });
      results.settings = true;
    }

    // ── Course structure ──────────────────────────────────────────────────
    const structure = await kv.get("course:structure");
    if (structure?.modules) {
      await supabase.from("course_structure").upsert({
        id: 1, structure,
      }, { onConflict: "id" });
      results.structure = true;
    }

    return c.json({ success: true, migrated: results });
  } catch (err) {
    console.error("[migrate-kv] Error:", err);
    return c.json({ error: "Migration failed", details: err.message }, 500);
  }
});

Deno.serve(app.fetch);