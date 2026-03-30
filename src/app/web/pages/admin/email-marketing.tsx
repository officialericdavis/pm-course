import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "../../components/layouts/admin-layout";
import { projectId } from "/utils/supabase/info";
import { toast } from "sonner";
import { Mail, Plus, Trash2, Send, Users, X, ChevronDown, ChevronUp, Upload } from "lucide-react";
import * as XLSX from "xlsx";

const API = `https://${projectId}.supabase.co/functions/v1/make-server-623b2a1c`;

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── Contacts Tab ────────────────────────────────────────────────────────────

function ContactsTab() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<{ email: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchContacts(); }, []);

  async function fetchContacts() {
    try {
      const r = await fetch(`${API}/admin/email-contacts`, { headers: authHeaders() });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setContacts(data.contacts || []);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const r = await fetch(`${API}/admin/email-contacts`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email: newEmail, name: newName }),
      });
      const data = await r.json();
      if (!r.ok) { toast.error(data.error || "Failed to add contact"); return; }
      setContacts(prev => [data.contact, ...prev]);
      setNewEmail("");
      setNewName("");
      setShowAdd(false);
      toast.success("Contact added");
    } catch {
      toast.error("Failed to add contact");
    } finally {
      setAdding(false);
    }
  }

  async function deleteContact(id: string, email: string) {
    if (!confirm(`Remove ${email}?`)) return;
    try {
      const r = await fetch(`${API}/admin/email-contacts/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!r.ok) { toast.error("Failed to delete"); return; }
      setContacts(prev => prev.filter(c => c.id !== id));
      toast.success("Contact removed");
    } catch {
      toast.error("Failed to delete");
    }
  }

  function parseRowsFromText(text: string): { email: string; name: string }[] {
    return text.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split(",").map(p => p.trim());
      return { email: parts[0] || "", name: parts[1] || "" };
    }).filter(r => r.email);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        // Try to detect email/name columns from header row
        const header = rows[0]?.map((h: any) => String(h).toLowerCase().trim());
        const emailCol = header ? header.findIndex((h: string) => h.includes("email")) : 0;
        const nameCol = header ? header.findIndex((h: string) => h.includes("name")) : 1;
        const startRow = header && emailCol !== -1 ? 1 : 0;
        const parsed = rows.slice(startRow).map((row: any) => ({
          email: String(row[emailCol !== -1 ? emailCol : 0] || "").trim(),
          name: String(row[nameCol !== -1 ? nameCol : 1] || "").trim(),
        })).filter(r => r.email && r.email !== "undefined");
        setParsedRows(parsed);
        setBulkText("");
        toast.success(`Found ${parsed.length} rows in file`);
      } catch {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }

  async function importBulk() {
    const rows = parsedRows.length > 0 ? parsedRows : parseRowsFromText(bulkText);
    if (rows.length === 0) return;
    setImporting(true);
    let added = 0;
    let skipped = 0;
    for (const { email, name } of rows) {
      const r = await fetch(`${API}/admin/email-contacts`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email, name }),
      });
      if (r.ok) added++;
      else skipped++;
    }
    await fetchContacts();
    setBulkText("");
    setParsedRows([]);
    setShowBulk(false);
    setImporting(false);
    toast.success(`Imported ${added} contacts${skipped > 0 ? `, skipped ${skipped}` : ""}`);
  }

  const filtered = contacts.filter(c =>
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const subscribed = contacts.filter(c => !c.unsubscribed).length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border-2 border-black p-5 text-center">
          <p className="text-3xl font-black">{contacts.length}</p>
          <p className="text-sm text-neutral-600 mt-1">Total Contacts</p>
        </div>
        <div className="bg-white border-2 border-black p-5 text-center">
          <p className="text-3xl font-black">{subscribed}</p>
          <p className="text-sm text-neutral-600 mt-1">Subscribed</p>
        </div>
        <div className="bg-white border-2 border-black p-5 text-center">
          <p className="text-3xl font-black">{contacts.length - subscribed}</p>
          <p className="text-sm text-neutral-600 mt-1">Unsubscribed</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2 border-2 border-black focus:outline-none"
        />
        <button
          onClick={() => { setShowBulk(!showBulk); setShowAdd(false); }}
          className="border-2 border-black px-4 py-2 font-bold hover:bg-neutral-100 transition-colors flex items-center gap-2"
        >
          <Users size={16} /> Bulk Import
        </button>
        <button
          onClick={() => { setShowAdd(!showAdd); setShowBulk(false); }}
          className="bg-black text-white px-4 py-2 font-bold hover:bg-neutral-800 transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Add Contact
        </button>
      </div>

      {/* Add single contact */}
      {showAdd && (
        <form onSubmit={addContact} className="bg-neutral-50 border-2 border-black p-6 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-bold mb-1">Email *</label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 border-2 border-black focus:outline-none"
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-bold mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Full name (optional)"
              className="w-full px-3 py-2 border-2 border-black focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={adding} className="bg-black text-white px-5 py-2 font-bold hover:bg-neutral-800 disabled:opacity-50">
              {adding ? "Adding..." : "Add"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="border-2 border-black px-4 py-2 font-bold hover:bg-neutral-100">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Bulk import */}
      {showBulk && (
        <div className="bg-neutral-50 border-2 border-black p-6 mb-6">
          {/* File Upload */}
          <div
            className="border-2 border-dashed border-black p-8 text-center mb-4 cursor-pointer hover:bg-neutral-100 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const input = fileInputRef.current; if (input) { const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files; handleFileUpload({ target: input } as any); } } }}
          >
            <Upload size={28} className="mx-auto mb-2 text-neutral-400" />
            <p className="font-bold">Drop a CSV or Excel file here, or click to browse</p>
            <p className="text-xs text-neutral-500 mt-1">Columns: Email, Name (header row auto-detected)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* File preview */}
          {parsedRows.length > 0 && (
            <div className="bg-white border-2 border-black p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold text-sm">{parsedRows.length} rows ready to import</p>
                <button onClick={() => setParsedRows([])} className="text-xs text-neutral-400 hover:text-black">Clear</button>
              </div>
              <div className="max-h-32 overflow-y-auto font-mono text-xs space-y-1">
                {parsedRows.slice(0, 8).map((r, i) => (
                  <div key={i} className="text-neutral-600">{r.email}{r.name ? ` — ${r.name}` : ""}</div>
                ))}
                {parsedRows.length > 8 && <div className="text-neutral-400">...and {parsedRows.length - 8} more</div>}
              </div>
            </div>
          )}

          {/* Or paste */}
          {parsedRows.length === 0 && (
            <>
              <p className="text-sm font-bold mb-2">Or paste emails — one per line. Format: <code>email, Name</code></p>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows={5}
                placeholder={"john@example.com, John Smith\njane@example.com\nbob@example.com, Bob Jones"}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none font-mono text-sm mb-3"
              />
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={importBulk}
              disabled={importing || (parsedRows.length === 0 && !bulkText.trim())}
              className="bg-black text-white px-5 py-2 font-bold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? "Importing..." : `Import${parsedRows.length > 0 ? ` ${parsedRows.length} Contacts` : ""}`}
            </button>
            <button onClick={() => { setShowBulk(false); setParsedRows([]); setBulkText(""); }} className="border-2 border-black px-4 py-2 font-bold hover:bg-neutral-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-neutral-500 py-8 text-center">Loading contacts...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border-2 border-black p-12 text-center">
          <Mail size={40} className="mx-auto mb-4 text-neutral-400" />
          <p className="font-bold text-lg">{contacts.length === 0 ? "No contacts yet" : "No results"}</p>
          <p className="text-neutral-500 text-sm mt-1">{contacts.length === 0 ? "Add your first contact above" : "Try a different search"}</p>
        </div>
      ) : (
        <div className="bg-white border-2 border-black overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-100 border-b-2 border-black">
              <tr>
                <th className="px-5 py-3 text-left font-bold text-sm">Email</th>
                <th className="px-5 py-3 text-left font-bold text-sm">Name</th>
                <th className="px-5 py-3 text-left font-bold text-sm">Status</th>
                <th className="px-5 py-3 text-left font-bold text-sm">Added</th>
                <th className="px-5 py-3 text-left font-bold text-sm"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={`${i % 2 === 0 ? "bg-white" : "bg-neutral-50"} border-b border-neutral-200`}>
                  <td className="px-5 py-3 font-medium">{c.email}</td>
                  <td className="px-5 py-3 text-neutral-600">{c.name || "—"}</td>
                  <td className="px-5 py-3">
                    {c.unsubscribed
                      ? <span className="bg-neutral-200 px-2 py-0.5 text-xs font-bold">UNSUBSCRIBED</span>
                      : <span className="bg-black text-white px-2 py-0.5 text-xs font-bold">ACTIVE</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-neutral-500 text-sm">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => deleteContact(c.id, c.email)} className="text-neutral-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-neutral-200 text-sm text-neutral-500">
            Showing {filtered.length} of {contacts.length} contacts
          </div>
        </div>
      )}
    </div>
  );
}

// ── Campaign Composer ───────────────────────────────────────────────────────

function CampaignComposer({ onClose, onSent }: { onClose: () => void; onSent: (c: any) => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [refSlug, setRefSlug] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) { toast.error("Subject and body are required"); return; }
    if (!fromEmail.trim()) { toast.error("From email is required. Set it in Admin → Settings → Email Settings."); return; }
    setSending(true);
    try {
      const r = await fetch(`${API}/admin/email-campaigns/send`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name, subject, body, fromName, fromEmail: fromEmail ? `${fromEmail}@petermayberry.com` : "", refSlug: refSlug.trim() || null }),
      });
      const data = await r.json();
      if (!r.ok) { toast.error(data.error || "Failed to send"); return; }
      toast.success(`Campaign sent to ${data.sent} recipients`);
      onSent(data.campaign);
      onClose();
    } catch {
      toast.error("Failed to send campaign");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b-2 border-black">
          <h2 className="text-2xl font-black">New Campaign</h2>
          <button onClick={onClose} className="hover:bg-neutral-100 p-1 rounded"><X size={20} /></button>
        </div>
        <form onSubmit={send} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold mb-1">Campaign Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. March Newsletter"
              className="w-full px-3 py-2 border-2 border-black focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">From Name *</label>
              <input
                type="text"
                required
                value={fromName}
                onChange={e => setFromName(e.target.value)}
                placeholder="Peter Mayberry"
                className="w-full px-3 py-2 border-2 border-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">From Email *</label>
              <div className="flex border-2 border-black focus-within:ring-2 focus-within:ring-black overflow-hidden">
                <input
                  type="text"
                  required
                  value={fromEmail}
                  onChange={e => setFromEmail(e.target.value.replace(/@.*/, ""))}
                  placeholder="Peter"
                  className="min-w-0 flex-1 px-3 py-2 focus:outline-none"
                />
                <span className="bg-neutral-100 px-2 font-bold text-neutral-500 border-l-2 border-black select-none text-xs whitespace-nowrap shrink-0 flex items-center">
                  @petermayberry.com
                </span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Tracking Ref <span className="text-neutral-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={refSlug}
              onChange={e => setRefSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="march-newsletter"
              className="w-full px-3 py-2 border-2 border-black focus:outline-none mb-1"
            />
            <p className="text-xs text-neutral-500 mt-1">
              {refSlug.trim()
                ? "Signup links in your email will automatically be tracked. If none exist, a signup button is added for you."
                : "Add a ref to automatically track which signups come from this campaign."}
            </p>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Subject *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Your email subject line"
              className="w-full px-3 py-2 border-2 border-black focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Body (HTML supported) *</label>
            <textarea
              required
              rows={12}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={"<h1>Hello!</h1>\n<p>Your message here...</p>"}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none font-mono text-sm"
            />
            <p className="text-xs text-neutral-500 mt-1">Sends to all active (non-unsubscribed) contacts</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={sending || !fromEmail.trim() || !fromName.trim() || !name.trim()}
              className="bg-black text-white px-6 py-3 font-bold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={16} />
              {sending ? "Sending..." : "Send Campaign"}
            </button>
            <button type="button" onClick={onClose} className="border-2 border-black px-6 py-3 font-bold hover:bg-neutral-100">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Campaigns Tab ───────────────────────────────────────────────────────────

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { fetchCampaigns(); }, []);

  async function fetchCampaigns() {
    try {
      const r = await fetch(`${API}/admin/email-campaigns`, { headers: authHeaders() });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setCampaigns(data.campaigns || []);
    } catch {
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  const statusColor: Record<string, string> = {
    sent: "bg-black text-white",
    partial: "bg-yellow-400 text-black",
    failed: "bg-red-500 text-white",
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-neutral-600">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} sent</p>
        </div>
        <button
          onClick={() => setShowComposer(true)}
          className="bg-black text-white px-5 py-2 font-bold hover:bg-neutral-800 flex items-center gap-2"
        >
          <Send size={16} /> New Campaign
        </button>
      </div>

      {showComposer && (
        <CampaignComposer
          onClose={() => setShowComposer(false)}
          onSent={c => setCampaigns(prev => [c, ...prev])}
        />
      )}

      {loading ? (
        <p className="text-neutral-500 py-8 text-center">Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <div className="bg-white border-2 border-black p-12 text-center">
          <Send size={40} className="mx-auto mb-4 text-neutral-400" />
          <p className="font-bold text-lg">No campaigns yet</p>
          <p className="text-neutral-500 text-sm mt-1">Create your first campaign above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white border-2 border-black">
              <div
                className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-neutral-50"
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-black truncate">{c.name || c.subject}</p>
                  <p className="text-sm text-neutral-500">{c.subject}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className={`px-2 py-0.5 text-xs font-bold uppercase ${statusColor[c.status] || "bg-neutral-200"}`}>
                    {c.status}
                  </span>
                  <div className="text-right text-sm">
                    <p className="font-bold">{c.sentCount} sent</p>
                    {c.failedCount > 0 && <p className="text-red-500">{c.failedCount} failed</p>}
                  </div>
                  <p className="text-sm text-neutral-400">{new Date(c.sentAt).toLocaleDateString()}</p>
                  {expanded === c.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
              {expanded === c.id && (
                <div className="px-6 py-4 border-t-2 border-black bg-neutral-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div><p className="font-bold">From</p><p className="text-neutral-600">{c.fromName} &lt;{c.fromEmail}&gt;</p></div>
                    <div><p className="font-bold">Recipients</p><p className="text-neutral-600">{c.recipientCount}</p></div>
                    <div><p className="font-bold">Sent</p><p className="text-neutral-600">{new Date(c.sentAt).toLocaleString()}</p></div>
                    <div><p className="font-bold">Delivery</p><p className="text-neutral-600">{c.sentCount}/{c.recipientCount}</p></div>
                  </div>
                  <div>
                    <p className="font-bold text-sm mb-2">Body Preview</p>
                    <div
                      className="bg-white border border-neutral-200 p-4 text-sm max-h-48 overflow-y-auto prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: c.body }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export function AdminEmailMarketing() {
  const [tab, setTab] = useState<"contacts" | "campaigns">("contacts");

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <Mail size={32} />
          <h1 className="text-4xl font-black">Email Marketing</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-black mb-8">
          {(["contacts", "campaigns"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 font-bold uppercase text-sm transition-colors border-b-4 -mb-0.5 ${
                tab === t ? "border-black" : "border-transparent text-neutral-500 hover:text-black"
              }`}
            >
              {t === "contacts" ? "Contacts" : "Campaigns"}
            </button>
          ))}
        </div>

        {tab === "contacts" ? <ContactsTab /> : <CampaignsTab />}
      </div>
    </AdminLayout>
  );
}
