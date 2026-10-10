"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { FONT } from "./helpers";

const MAROON = "#7b1113";

const CATEGORIES = ["Electronics", "Clothing", "ID", "Bag", "Books", "Others"];
const STATUSES   = ["UNCLAIMED", "CLAIMED", "TURNED_OVER"] as const;
type Status = typeof STATUSES[number];

const STATUS_LABEL: Record<Status, string> = {
  UNCLAIMED:    "Unclaimed",
  CLAIMED:      "Claimed",
  TURNED_OVER:  "Turned Over",
};

const STATUS_COLOR: Record<Status, { bg: string; color: string }> = {
  UNCLAIMED:   { bg: "#fef3c7", color: "#92400e" },
  CLAIMED:     { bg: "#dcfce7", color: "#166534" },
  TURNED_OVER: { bg: "#f3f4f6", color: "#374151" },
};

const input: React.CSSProperties = {
  border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px",
  fontSize: 13, fontFamily: FONT, outline: "none", background: "#fff",
};
const btn: React.CSSProperties = {
  border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 14px",
  fontSize: 13, fontFamily: FONT, background: "#fff", cursor: "pointer", color: "#374151",
};
const btnPrimary: React.CSSProperties = {
  border: "none", borderRadius: 8, padding: "6px 14px",
  fontSize: 13, fontFamily: FONT, background: MAROON, cursor: "pointer", color: "#fff", fontWeight: 700,
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function toLocalISO(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

interface LostFoundItem {
  id:            string;
  itemName:      string;
  description:   string | null;
  category:      string;
  dateFound:     string;
  locationFound: string | null;
  foundBy:       string | null;
  status:        Status;
  claimerName:   string | null;
  claimedAt:     string | null;
  photoUrl:      string | null;
  createdAt:     string;
  recordedByUser: { id: string; name: string } | null;
}

// ─── Form Modal ───────────────────────────────────────────────────────────────
function ItemFormModal({
  base,
  initial,
  onClose,
  onSaved,
}: {
  base:     string;
  initial?: LostFoundItem;
  onClose:  () => void;
  onSaved:  (item: LostFoundItem) => void;
}) {
  const isEdit = !!initial;
  const [itemName,      setItemName]      = useState(initial?.itemName      ?? "");
  const [description,   setDescription]   = useState(initial?.description   ?? "");
  const [category,      setCategory]      = useState(initial?.category      ?? "Others");
  const [dateFound,     setDateFound]     = useState(initial ? toLocalISO(initial.dateFound) : toLocalISO(new Date()));
  const [locationFound, setLocationFound] = useState(initial?.locationFound ?? "");
  const [foundBy,       setFoundBy]       = useState(initial?.foundBy       ?? "");
  const [photoUrl,      setPhotoUrl]      = useState(initial?.photoUrl      ?? "");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  async function handleSave() {
    if (!itemName.trim()) { setError("Item name is required."); return; }
    if (!dateFound)       { setError("Date found is required."); return; }
    setSaving(true); setError("");
    try {
      const url    = isEdit ? `${base}/lost-found/${initial!.id}` : `${base}/lost-found`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName:      itemName.trim(),
          description:   description.trim()   || null,
          category,
          dateFound,
          locationFound: locationFound.trim() || null,
          foundBy:       foundBy.trim()       || null,
          photoUrl:      photoUrl.trim()      || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      onSaved(data.item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 4 };
  const field: React.CSSProperties = { ...input, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480, fontFamily: FONT, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ background: MAROON, color: "#fff", padding: "14px 18px", fontWeight: 800, fontSize: 14 }}>
          {isEdit ? "Edit Item" : "Log Lost & Found Item"}
        </div>
        <div style={{ padding: 18, overflowY: "auto", display: "grid", gap: 12 }}>
          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#b91c1c" }}>{error}</div>}

          <div>
            <label style={label}>Item Name *</label>
            <input style={field} value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g., Black wallet" />
          </div>
          <div>
            <label style={label}>Description</label>
            <textarea style={{ ...field, resize: "vertical", minHeight: 64 }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional details about the item…" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={label}>Category</label>
              <select style={field} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Date Found *</label>
              <input type="date" style={field} value={dateFound} onChange={e => setDateFound(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={label}>Location Found</label>
            <input style={field} value={locationFound} onChange={e => setLocationFound(e.target.value)} placeholder="e.g., Canteen, Room 201…" />
          </div>
          <div>
            <label style={label}>Found By</label>
            <input style={field} value={foundBy} onChange={e => setFoundBy(e.target.value)} placeholder="Name of person who turned it in" />
          </div>
          <div>
            <label style={label}>Photo URL</label>
            <input style={field} value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
          <button style={{ ...btn, flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Log Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Claim Modal ──────────────────────────────────────────────────────────────
function ClaimModal({
  base,
  item,
  onClose,
  onSaved,
}: {
  base:    string;
  item:    LostFoundItem;
  onClose: () => void;
  onSaved: (item: LostFoundItem) => void;
}) {
  const [claimerName, setClaimerName] = useState(item.claimerName ?? "");
  const [status,      setStatus]      = useState<Status>(item.status === "UNCLAIMED" ? "CLAIMED" : item.status);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  async function handleSave() {
    if (status === "CLAIMED" && !claimerName.trim()) { setError("Claimer name is required."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`${base}/lost-found/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          claimerName: claimerName.trim() || null,
          claimedAt:   status === "CLAIMED" ? new Date().toISOString() : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onSaved(data.item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".04em", display: "block", marginBottom: 4 };
  const field: React.CSSProperties = { ...input, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 400, fontFamily: FONT, overflow: "hidden" }}>
        <div style={{ background: MAROON, color: "#fff", padding: "14px 18px", fontWeight: 800, fontSize: 14 }}>
          Update Status — {item.itemName}
        </div>
        <div style={{ padding: 18, display: "grid", gap: 12 }}>
          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#b91c1c" }}>{error}</div>}
          <div>
            <label style={label}>Status</label>
            <select style={field} value={status} onChange={e => setStatus(e.target.value as Status)}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          {status === "CLAIMED" && (
            <div>
              <label style={label}>Claimer Name *</label>
              <input style={field} value={claimerName} onChange={e => setClaimerName(e.target.value)} placeholder="Full name of claimer" />
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
          <button style={{ ...btn, flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Update Status"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function ItemDetailDrawer({
  base,
  item,
  isHead,
  onClose,
  onChanged,
}: {
  base:      string;
  item:      LostFoundItem;
  isHead:    boolean;
  onClose:   () => void;
  onChanged: () => void;
}) {
  const [showEdit,  setShowEdit]  = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${item.itemName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`${base}/lost-found/${item.id}`, { method: "DELETE" });
      onChanged(); onClose();
    } finally {
      setDeleting(false);
    }
  }

  const row = (label: string, value: string | null | undefined) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#111827" }}>{value || "—"}</span>
    </div>
  );

  const sc = STATUS_COLOR[item.status] ?? { bg: "#f3f4f6", color: "#374151" };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.25)", zIndex: 200 }} onClick={onClose} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px, 100vw)", background: "#fff", zIndex: 201, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,.1)", fontFamily: FONT }}>
        <div style={{ background: MAROON, color: "#fff", padding: "14px 18px", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Item Details</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "grid", gap: 14 }}>
          {item.photoUrl && (
            <img src={item.photoUrl} alt={item.itemName}
              style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }} />
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#111827", flex: 1 }}>{item.itemName}</span>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {row("Category",      item.category)}
            {row("Date Found",    fmtDate(item.dateFound))}
            {row("Location",      item.locationFound)}
            {row("Found By",      item.foundBy)}
          </div>

          {item.description && (
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#374151" }}>
              {item.description}
            </div>
          )}

          {item.status === "CLAIMED" && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", display: "grid", gap: 8 }}>
              {row("Claimed By", item.claimerName)}
              {row("Claimed At", fmtDate(item.claimedAt))}
            </div>
          )}

          <div style={{ display: "grid", gap: 6 }}>
            {row("Logged By",  item.recordedByUser?.name)}
            {row("Logged At",  fmtDate(item.createdAt))}
          </div>
        </div>

        {isHead && (
          <div style={{ padding: "12px 18px", borderTop: "1px solid #f3f4f6", background: "#fafafa", display: "flex", gap: 8 }}>
            <button style={{ ...btn, flex: 1 }} onClick={() => setShowEdit(true)}>Edit</button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={() => setShowClaim(true)}>Update Status</button>
            <button style={{ ...btn, color: "#b91c1c", borderColor: "#fecaca", flex: "0 0 auto" }}
              onClick={handleDelete} disabled={deleting}>
              {deleting ? "…" : "Delete"}
            </button>
          </div>
        )}
      </div>

      {showEdit && (
        <ItemFormModal
          base={base}
          initial={item}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); onChanged(); onClose(); }}
        />
      )}
      {showClaim && (
        <ClaimModal
          base={base}
          item={item}
          onClose={() => setShowClaim(false)}
          onSaved={() => { setShowClaim(false); onChanged(); onClose(); }}
        />
      )}
    </>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────
export default function CourseLostFoundTab({
  courseId,
  isHead,
}: {
  courseId: string;
  isHead:   boolean;
}) {
  const base = `/api/courses/${courseId}/osa`;

  const [items,    setItems]    = useState<LostFoundItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [q,        setQ]        = useState("");
  const [status,   setStatus]   = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [sortDir,  setSortDir]  = useState<"desc" | "asc">("desc");
  const [showForm, setShowForm] = useState(false);
  const [openItem, setOpenItem] = useState<LostFoundItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const sp = new URLSearchParams();
      if (q.trim())  sp.set("q",        q.trim());
      if (status)    sp.set("status",   status);
      if (category)  sp.set("category", category);
      if (dateFrom)  sp.set("dateFrom", dateFrom);
      if (dateTo)    sp.set("dateTo",   dateTo);
      const res  = await fetch(`${base}/lost-found?${sp.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [base, q, status, category, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const displayed = useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      const diff = new Date(a.dateFound).getTime() - new Date(b.dateFound).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
    return list;
  }, [items, sortDir]);

  const hasFilter = !!(dateFrom || dateTo || category || status);

  const presets = [
    { label: "Today",      fn: () => { const d = toLocalISO(new Date()); setDateFrom(d); setDateTo(d); } },
    { label: "This Week",  fn: () => { const x = new Date(); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); setDateFrom(toLocalISO(x)); setDateTo(toLocalISO(new Date())); } },
    { label: "This Month", fn: () => { const n = new Date(); setDateFrom(toLocalISO(new Date(n.getFullYear(), n.getMonth(), 1))); setDateTo(toLocalISO(n)); } },
  ];

  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 800, color: "#374151", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "9px 10px", fontSize: 12.5, borderTop: "1px solid #f3f4f6" };

  return (
    <div style={{ padding: 24, fontFamily: FONT }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Lost & Found</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>{displayed.length} item(s)</p>
        </div>
        <input style={{ ...input, width: 220 }} placeholder="Search item, location, found by…" value={q} onChange={e => setQ(e.target.value)} />
        <select style={{ ...input, width: 140 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        {isHead && (
          <button style={btnPrimary} onClick={() => setShowForm(true)}>+ Log Item</button>
        )}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select style={{ ...input, width: 160 }} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "#6b7280" }}>From</span>
        <input type="date" style={{ ...input, width: 150 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span style={{ fontSize: 12, color: "#6b7280" }}>To</span>
        <input type="date" style={{ ...input, width: 150 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        {presets.map(p => (
          <button key={p.label} onClick={p.fn}
            style={{ padding: "5px 9px", fontSize: 11, fontWeight: 700, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#6b7280", cursor: "pointer" }}>
            {p.label}
          </button>
        ))}
        {hasFilter && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); setCategory(""); setStatus(""); }}
            style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: MAROON }}>
            Clear filters
          </button>
        )}
      </div>

      {error && <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      {/* ── Table ── */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Item</th>
              <th style={th}>Category</th>
              <th style={th}>
                <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: 0, cursor: "pointer", padding: 0, font: "inherit", color: "inherit" }}>
                  Date Found <ArrowUpDown size={12} />
                </button>
              </th>
              <th style={th}>Location</th>
              <th style={th}>Found By</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={{ ...td, color: "#9ca3af" }} colSpan={6}>Loading…</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td style={{ ...td, color: "#9ca3af" }} colSpan={6}>Walang nahanap na item.</td></tr>
            ) : displayed.map(item => {
              const sc = STATUS_COLOR[item.status] ?? { bg: "#f3f4f6", color: "#374151" };
              return (
                <tr key={item.id} onClick={() => setOpenItem(item)} style={{ cursor: "pointer" }}>
                  <td style={td}>
                    <b>{item.itemName}</b>
                    {item.description && (
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                        {item.description.length > 60 ? item.description.slice(0, 60) + "…" : item.description}
                      </div>
                    )}
                  </td>
                  <td style={td}>{item.category}</td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(item.dateFound)}</td>
                  <td style={td}>{item.locationFound ?? "—"}</td>
                  <td style={td}>{item.foundBy ?? "—"}</td>
                  <td style={td}>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ItemFormModal
          base={base}
          onClose={() => setShowForm(false)}
          onSaved={item => { setShowForm(false); setItems(prev => [item, ...prev]); }}
        />
      )}

      {openItem && (
        <ItemDetailDrawer
          base={base}
          item={openItem}
          isHead={isHead}
          onClose={() => setOpenItem(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}