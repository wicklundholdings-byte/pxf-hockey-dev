import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Plus, X, Send, Clock, Users, Trash2, Eye, ArrowLeft, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coach/email")({
  component: EmailPage,
});

type Campaign = {
  id: string;
  name: string;
  subject: string | null;
  body: string | null;
  template: string | null;
  status: "draft" | "scheduled" | "sent";
  audience_filter: Record<string, unknown> | null;
  scheduled_for: string | null;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
};
type Audience = {
  tag: string | null;
  subscribedOnly: boolean;
  campId: string | null;
};

function EmailPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns((data ?? []) as unknown as Campaign[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const editing = campaigns.find((c) => c.id === editingId) ?? null;

  if (creating || editing) {
    return (
      <CampaignEditor
        campaign={editing}
        onClose={() => { setEditingId(null); setCreating(false); load(); }}
      />
    );
  }

  const drafts = campaigns.filter((c) => c.status === "draft");
  const scheduled = campaigns.filter((c) => c.status === "scheduled");
  const sent = campaigns.filter((c) => c.status === "sent");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Outbound</p>
          <h2 className="font-display text-lg font-bold text-foreground">Email campaigns</h2>
        </div>
        <button onClick={() => setCreating(true)} className="flex items-center gap-1 rounded-full bg-gradient-brand px-3 py-1.5 text-[11px] font-bold text-primary-foreground">
          <Plus size={12} /> New
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-2.5">
        <Info size={12} className="mt-0.5 shrink-0 text-amber-400" />
        <p className="text-[10px] leading-relaxed text-amber-200/90">
          Campaign builder. Connect a marketing email service to actually send — bulk sends aren't supported by built-in app email.
        </p>
      </div>

      {loading ? (
        <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Mail size={28} className="mx-auto text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">No campaigns yet.</p>
          <button onClick={() => setCreating(true)} className="mt-3 rounded-full bg-gradient-brand px-4 py-1.5 text-[11px] font-bold text-primary-foreground">
            Compose first campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.length > 0 && <Group title="Drafts" items={drafts} onOpen={setEditingId} />}
          {scheduled.length > 0 && <Group title="Scheduled" items={scheduled} onOpen={setEditingId} />}
          {sent.length > 0 && <Group title="Sent" items={sent} onOpen={setEditingId} />}
        </div>
      )}
    </div>
  );
}

function Group({ title, items, onOpen }: { title: string; items: Campaign[]; onOpen: (id: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title} ({items.length})</p>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id}>
            <button onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left">
              <div className={
                "grid h-10 w-10 shrink-0 place-items-center rounded-xl " +
                (c.status === "sent" ? "bg-emerald-400/15 text-emerald-400" :
                 c.status === "scheduled" ? "bg-amber-400/15 text-amber-400" : "bg-teal/15 text-teal")
              }>
                <Mail size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {c.subject ?? "No subject"}
                  {c.status === "scheduled" && c.scheduled_for && (
                    <span> · sends {new Date(c.scheduled_for).toLocaleString()}</span>
                  )}
                  {c.status === "sent" && (
                    <span> · {c.sent_count} sent · {c.open_count} opens · {c.click_count} clicks</span>
                  )}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CampaignEditor({ campaign, onClose }: { campaign: Campaign | null; onClose: () => void }) {
  const { user } = useAuth();
  const isNew = !campaign;
  const [name, setName] = useState(campaign?.name ?? "Untitled campaign");
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [body, setBody] = useState(campaign?.body ?? "");
  const initialAudience = (campaign?.audience_filter ?? {}) as Audience;
  const [audience, setAudience] = useState<Audience>({
    tag: initialAudience.tag ?? null,
    subscribedOnly: initialAudience.subscribedOnly ?? true,
    campId: initialAudience.campId ?? null,
  });
  const [scheduledFor, setScheduledFor] = useState(campaign?.scheduled_for?.slice(0, 16) ?? "");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [camps, setCamps] = useState<{ id: string; name: string }[]>([]);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: cmp }] = await Promise.all([
        supabase.from("contacts").select("tags"),
        supabase.from("camps").select("id,name").order("created_at", { ascending: false }),
      ]);
      const tagSet = new Set<string>();
      (cs ?? []).forEach((r) => (r.tags ?? []).forEach((t: string) => tagSet.add(t)));
      setAllTags(Array.from(tagSet).sort());
      setCamps((cmp ?? []) as { id: string; name: string }[]);
    })();
  }, []);

  // Recompute audience count
  useEffect(() => {
    (async () => {
      let query = supabase.from("contacts").select("id, tags", { count: "exact", head: false });
      if (audience.subscribedOnly) query = query.eq("subscribed", true);
      if (audience.tag) query = query.contains("tags", [audience.tag]);

      if (audience.campId) {
        const { data: regs } = await supabase
          .from("registrations")
          .select("contact_id")
          .eq("camp_id", audience.campId);
        const ids = Array.from(new Set((regs ?? []).map((r) => r.contact_id).filter(Boolean))) as string[];
        if (ids.length === 0) { setAudienceCount(0); return; }
        query = query.in("id", ids);
      }

      const { count } = await query;
      setAudienceCount(count ?? 0);
    })();
  }, [audience.subscribedOnly, audience.tag, audience.campId]);

  async function save(nextStatus?: "draft" | "scheduled" | "sent") {
    if (!user) return;
    setSaving(true);
    const status = nextStatus ?? campaign?.status ?? "draft";
    const payload = {
      owner_id: user.id,
      name,
      subject,
      body,
      template: "basic",
      status,
      audience_filter: audience as unknown as never,
      scheduled_for: status === "scheduled" && scheduledFor ? new Date(scheduledFor).toISOString() : null,
      sent_count: status === "sent" ? (audienceCount ?? 0) : (campaign?.sent_count ?? 0),
    };
    if (isNew) {
      await supabase.from("email_campaigns").insert(payload);
    } else {
      await supabase.from("email_campaigns").update(payload).eq("id", campaign!.id);
    }
    setSaving(false);
    onClose();
  }

  async function remove() {
    if (!campaign || !confirm("Delete this campaign?")) return;
    await supabase.from("email_campaigns").delete().eq("id", campaign.id);
    onClose();
  }

  const canSend = name.trim() && subject.trim() && body.trim() && (audienceCount ?? 0) > 0;

  if (preview) {
    return (
      <div className="space-y-3">
        <button onClick={() => setPreview(false)} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <ArrowLeft size={12} /> Back to editor
        </button>
        <div className="rounded-2xl border border-border bg-white p-6 text-black">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Subject</p>
          <h1 className="mt-1 text-xl font-bold">{subject || "(no subject)"}</h1>
          <hr className="my-4 border-gray-200" />
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{body || "(no body)"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button onClick={onClose} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ArrowLeft size={12} /> All campaigns
      </button>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-transparent font-display text-xl font-bold text-foreground focus:outline-none"
        placeholder="Campaign name"
      />

      {/* Audience */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <h3 className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
          <Users size={11} /> Audience
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={audience.subscribedOnly}
              onChange={(e) => setAudience({ ...audience, subscribedOnly: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-border bg-surface"
            />
            Subscribed contacts only
          </label>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tag</label>
            <select
              value={audience.tag ?? ""}
              onChange={(e) => setAudience({ ...audience, tag: e.target.value || null })}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground"
            >
              <option value="">Any tag</option>
              {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Registered for camp</label>
            <select
              value={audience.campId ?? ""}
              onChange={(e) => setAudience({ ...audience, campId: e.target.value || null })}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground"
            >
              <option value="">Any camp</option>
              {camps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="mt-2 flex items-center justify-between rounded-xl bg-surface px-3 py-2">
            <span className="text-[11px] text-muted-foreground">Estimated recipients</span>
            <span className="font-display text-lg font-bold text-teal">{audienceCount ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-foreground">Content</h3>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject line"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground focus:border-teal focus:outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message…"
          rows={10}
          className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
        />
        <button onClick={() => setPreview(true)} className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-teal">
          <Eye size={12} /> Preview
        </button>
      </div>

      {/* Schedule */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <h3 className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
          <Clock size={11} /> Schedule
        </h3>
        <input
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-teal focus:outline-none"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">Leave empty to send immediately on confirm.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => save("draft")}
          disabled={saving}
          className="rounded-full border border-border bg-surface py-2.5 text-[11px] font-semibold text-foreground"
        >Save draft</button>
        <button
          onClick={() => save("scheduled")}
          disabled={saving || !canSend || !scheduledFor}
          className="rounded-full border border-amber-400/40 bg-amber-400/10 py-2.5 text-[11px] font-bold text-amber-400 disabled:opacity-40"
        >Schedule</button>
        <button
          onClick={() => save("sent")}
          disabled={saving || !canSend}
          className="flex items-center justify-center gap-1 rounded-full bg-gradient-brand py-2.5 text-[11px] font-bold text-primary-foreground disabled:opacity-40"
        >
          <Send size={12} /> Send now
        </button>
      </div>

      {!isNew && (
        <button
          onClick={remove}
          className="flex w-full items-center justify-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 py-2 text-[10px] font-semibold text-red-400"
        >
          <Trash2 size={11} /> Delete campaign
        </button>
      )}
      <button onClick={onClose} className="flex w-full items-center justify-center gap-1 text-[11px] text-muted-foreground">
        <X size={11} /> Cancel
      </button>
    </div>
  );
}