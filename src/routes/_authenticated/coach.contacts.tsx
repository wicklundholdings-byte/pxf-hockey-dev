import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, X, Mail, Phone, Tag, Plus, Calendar, DollarSign, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/contacts")({
  component: ContactsPage,
});

type Contact = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  subscribed: boolean;
  tags: string[];
  notes: string | null;
  created_at: string;
};
type Attendee = { id: string; full_name: string | null; contact_id: string | null; position: string | null; skill_level: string | null };
type RegHistory = {
  id: string;
  status: string;
  amount_cents: number | null;
  created_at: string;
  camps: { name: string | null; start_date: string | null } | null;
};

function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [attendeesByContact, setAttendeesByContact] = useState<Record<string, Attendee[]>>({});
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("attendees").select("id,full_name,contact_id,position,skill_level"),
    ]);
    setContacts((c ?? []) as Contact[]);
    const grouped: Record<string, Attendee[]> = {};
    (a ?? []).forEach((row) => {
      if (!row.contact_id) return;
      (grouped[row.contact_id] ??= []).push(row as Attendee);
    });
    setAttendeesByContact(grouped);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach((c) => c.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return contacts.filter((c) => {
      if (tagFilter && !(c.tags ?? []).includes(tagFilter)) return false;
      if (!term) return true;
      return (
        (c.full_name ?? "").toLowerCase().includes(term) ||
        (c.email ?? "").toLowerCase().includes(term) ||
        (c.phone ?? "").toLowerCase().includes(term) ||
        (attendeesByContact[c.id] ?? []).some((a) => (a.full_name ?? "").toLowerCase().includes(term))
      );
    });
  }, [contacts, q, tagFilter, attendeesByContact]);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CRM</p>
          <h2 className="font-display text-lg font-bold text-foreground">Contacts</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-foreground">
            {contacts.length}
          </span>
          <Link
            to="/coach/email"
            className="flex items-center gap-1 rounded-full bg-teal px-3 py-1.5 text-[11px] font-bold text-black"
          >
            <Mail size={12} /> Broadcast Email
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, phone, athlete…"
          className="w-full rounded-full border border-border bg-card py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
        />
      </div>

      {allTags.length > 0 && (
        <div className="-mx-5 overflow-x-auto px-5">
          <div className="flex gap-2">
            <button
              onClick={() => setTagFilter(null)}
              className={
                "whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-semibold " +
                (!tagFilter ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
              }
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(t === tagFilter ? null : t)}
                className={
                  "whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-semibold " +
                  (tagFilter === t ? "border-teal bg-teal/10 text-teal" : "border-border bg-card text-muted-foreground")
                }
              >
                #{t}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Users size={28} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">
            {contacts.length === 0 ? "No contacts yet. They appear here as parents register." : "No matches."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => {
            const kids = attendeesByContact[c.id] ?? [];
            const initials = (c.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <li key={c.id}>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal/15 text-[11px] font-bold text-teal">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{c.full_name ?? "Unnamed"}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {c.email ?? c.phone ?? "—"}
                        {kids.length > 0 && <span> · {kids.length} athlete{kids.length > 1 ? "s" : ""}</span>}
                      </p>
                      {(c.tags?.length ?? 0) > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] text-muted-foreground">#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface text-teal"
                      aria-label={`Email ${c.full_name ?? "contact"}`}
                    >
                      <Mail size={14} />
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <ContactDrawer
          contact={selected}
          attendees={attendeesByContact[selected.id] ?? []}
          onClose={() => setSelectedId(null)}
          onSaved={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

function ContactDrawer({ contact, attendees, onClose, onSaved }: {
  contact: Contact;
  attendees: Attendee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tags, setTags] = useState<string[]>(contact.tags ?? []);
  const [newTag, setNewTag] = useState("");
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [history, setHistory] = useState<RegHistory[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("registrations")
        .select("id,status,amount_cents,created_at, camps(name,start_date)")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false });
      setHistory((data ?? []) as unknown as RegHistory[]);
    })();
  }, [contact.id]);

  async function addTag() {
    const t = newTag.trim().toLowerCase();
    if (!t || tags.includes(t)) return setNewTag("");
    const next = [...tags, t];
    setTags(next);
    setNewTag("");
    await supabase.from("contacts").update({ tags: next }).eq("id", contact.id);
    onSaved();
  }
  async function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    await supabase.from("contacts").update({ tags: next }).eq("id", contact.id);
    onSaved();
  }
  async function saveNotes() {
    setSaving(true);
    await supabase.from("contacts").update({ notes }).eq("id", contact.id);
    setSaving(false);
    onSaved();
  }

  const initials = (contact.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const totalSpend = history.filter((h) => h.status === "paid").reduce((s, h) => s + (h.amount_cents ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border-t border-border bg-background p-5"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-teal/15 text-sm font-bold text-teal">
              {initials}
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">{contact.full_name ?? "Unnamed"}</h2>
              <p className="text-[10px] text-muted-foreground">
                Joined {new Date(contact.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-surface p-1.5 text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-xs text-foreground">
              <Mail size={12} className="text-teal" /> {contact.email}
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-xs text-foreground">
              <Phone size={12} className="text-teal" /> {contact.phone}
            </a>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Mini icon={Calendar} label="Camps" value={String(history.length)} />
          <Mini icon={DollarSign} label="Spend" value={`$${(totalSpend / 100).toFixed(0)}`} />
        </div>

        {/* Tags */}
        <Block title="Tags" icon={Tag}>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-semibold text-teal">
                #{t}
                <button onClick={() => removeTag(t)} className="text-teal/70 hover:text-teal">
                  <X size={10} />
                </button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="Add tag"
                className="w-20 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-foreground focus:border-teal focus:outline-none"
              />
              <button onClick={addTag} className="rounded-full bg-surface p-1 text-teal">
                <Plus size={12} />
              </button>
            </div>
          </div>
        </Block>

        {/* Athletes */}
        <Block title="Athletes" icon={Users}>
          {attendees.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No athletes linked.</p>
          ) : (
            <ul className="space-y-1.5">
              {attendees.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-xs">
                  <span className="font-semibold text-foreground">{a.full_name ?? "—"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {a.position ?? "—"} · {a.skill_level ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* History */}
        <Block title="Registration history" icon={Calendar}>
          {history.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No registrations yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{h.camps?.name ?? "Camp"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {h.camps?.start_date ? new Date(h.camps.start_date + "T00:00:00").toLocaleDateString() : new Date(h.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={
                      "text-[10px] font-bold uppercase " +
                      (h.status === "paid" ? "text-emerald-400" : h.status === "pending" ? "text-amber-400" : "text-muted-foreground")
                    }>
                      {h.status}
                    </p>
                    <p className="text-[10px] text-foreground">${((h.amount_cents ?? 0) / 100).toFixed(0)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Notes */}
        <Block title="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Private notes about this contact…"
            rows={3}
            className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-teal focus:outline-none"
          />
          {saving && <p className="mt-1 text-[10px] text-muted-foreground">Saving…</p>}
        </Block>

        <button
          onClick={async () => {
            if (!confirm("Delete this contact? This cannot be undone.")) return;
            await supabase.from("contacts").delete().eq("id", contact.id);
            onSaved();
            onClose();
          }}
          className="mt-4 flex w-full items-center justify-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 py-2.5 text-[11px] font-semibold text-red-400"
        >
          <Trash2 size={12} /> Delete contact
        </button>
      </div>
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5">
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <Icon size={10} /> {label}
      </p>
      <p className="mt-0.5 font-display text-base font-bold text-foreground">{value}</p>
    </div>
  );
}

function Block({ title, icon: Icon, children }: { title: string; icon?: typeof Tag; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-3">
      <h3 className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
        {Icon && <Icon size={11} />} {title}
      </h3>
      {children}
    </div>
  );
}