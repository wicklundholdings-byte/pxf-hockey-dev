import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRegistrationDraft } from "@/hooks/useRegistrationDraft";
import { RegistrationStepper } from "@/components/parent/registration-stepper";
import { ChevronRight, ScrollText, Loader2 } from "lucide-react";

export const Route = createFileRoute("/camps/$slug/waiver")({
  head: () => ({ meta: [{ title: "Waiver — PXF Hockey" }] }),
  component: WaiverScreen,
});

function WaiverScreen() {
  const { slug } = useParams({ from: "/camps/$slug/waiver" });
  const navigate = useNavigate();
  const { draft, update, hydrated } = useRegistrationDraft(slug);
  const [waiverText, setWaiverText] = useState<string>("");
  const [waiverRequired, setWaiverRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState(draft.waiver?.signer_name ?? draft.parent.full_name ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("camps")
        .select("waiver_required, waiver_text")
        .eq("slug", slug)
        .eq("status", "live")
        .maybeSingle();
      setWaiverText(c?.waiver_text ?? defaultWaiver);
      setWaiverRequired(!!c?.waiver_required);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!waiverRequired && !loading) {
      // No waiver required — auto-advance.
      update({ waiver: { signer_name: draft.parent.full_name, agreed_at: new Date().toISOString() } });
      navigate({ to: "/camps/$slug/health", params: { slug }, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiverRequired, loading]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) setScrolledToBottom(true);
  }

  function submit() {
    update({
      waiver: { signer_name: signature.trim(), agreed_at: new Date().toISOString() },
    });
    navigate({ to: "/camps/$slug/health", params: { slug } });
  }

  if (loading || !hydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="animate-spin text-teal" />
      </div>
    );
  }

  const ready = scrolledToBottom && agreed && signature.trim().length >= 2;

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <RegistrationStepper slug={slug} active={2} backTo={{ to: "/camps/$slug/register", params: { slug } }} />
      <div className="mx-auto max-w-[480px] space-y-4 px-5 pt-5">
        <header>
          <h1 className="font-display text-2xl font-bold">Waiver & release</h1>
          <p className="mt-1 text-xs text-muted-foreground">Please read fully and sign to continue.</p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <ScrollText size={12} className="text-teal" /> Waiver text
          </div>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="h-64 overflow-y-auto rounded-xl bg-background p-3 text-xs leading-relaxed text-muted-foreground"
          >
            <p className="whitespace-pre-line">{waiverText}</p>
          </div>
          <div className="mt-2 px-2 text-[10px] text-muted-foreground">
            {scrolledToBottom ? (
              <span className="font-semibold text-teal">✓ You've read the full waiver.</span>
            ) : (
              "Scroll to the bottom to enable the agree button."
            )}
          </div>
        </div>

        <label className={"flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm " + (scrolledToBottom ? "border-border" : "border-border/50 opacity-60")}>
          <input
            type="checkbox"
            checked={agreed}
            disabled={!scrolledToBottom}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-4 w-4 accent-teal"
          />
          <span>I have read and agree to the terms above.</span>
        </label>

        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Signature (type your full name)</span>
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="e.g. Sarah Thompson"
            className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-3 font-display text-lg italic outline-none focus:border-teal"
          />
        </label>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-5 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-[480px]">
          <button
            disabled={!ready}
            onClick={submit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-brand text-sm font-bold text-primary-foreground shadow-glow-teal disabled:opacity-50 disabled:shadow-none"
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

const defaultWaiver = `I understand that participation in hockey training involves physical activity that carries an inherent risk of injury. I voluntarily assume all such risks on behalf of my child.

I authorize the coaching staff to seek emergency medical care if necessary and confirm that my child is healthy enough to participate.

I grant permission for photos and video taken during the camp to be used for promotional and instructional purposes, without compensation.

I release the camp, its coaches, staff, and venue partners from any and all liability arising from participation, except in cases of gross negligence.

By signing below, I confirm I am the legal parent or guardian of the registered athlete and agree to the terms above.`;