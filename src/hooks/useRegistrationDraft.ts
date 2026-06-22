import { useEffect, useState } from "react";

export type ChildDraft = {
  full_name: string;
  birthday: string;
  position: string;
  skill_level: string;
};

export type RegistrationDraft = {
  campId?: string;
  parent: { full_name: string; email: string; phone: string };
  child: ChildDraft;
  children: Array<ChildDraft & { id?: string }>;
  customs: Record<string, string>;
  waiver: { signer_name: string; agreed_at: string | null } | null;
  paymentPlan: "none" | "two" | "three";
  couponCode: string;
};

const emptyDraft: RegistrationDraft = {
  parent: { full_name: "", email: "", phone: "" },
  child: { full_name: "", birthday: "", position: "", skill_level: "" },
  children: [],
  customs: {},
  waiver: null,
  paymentPlan: "none",
  couponCode: "",
};

function keyFor(slug: string) {
  return `pxf:registration-draft:${slug}`;
}

export function useRegistrationDraft(slug: string) {
  const [draft, setDraft] = useState<RegistrationDraft>(emptyDraft);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(keyFor(slug));
      if (raw) setDraft({ ...emptyDraft, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [slug]);

  function update(patch: Partial<RegistrationDraft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.sessionStorage.setItem(keyFor(slug), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function clear() {
    try {
      window.sessionStorage.removeItem(keyFor(slug));
    } catch {
      /* ignore */
    }
    setDraft(emptyDraft);
  }

  return { draft, update, clear, hydrated };
}