import { useEffect, useState } from "react";

export type ChildDraft = {
  full_name: string;
  birthday: string;
  position: string;
  skill_level: string;
};

export type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
};

export type HealthProfile = {
  allergyCategories: string[]; // food | medication | environmental | none
  allergyNotes: string;
  medications: string;
  conditions: string;
  physician_name: string;
  physician_phone: string;
  emergency_contacts: EmergencyContact[]; // 1 required, 2 optional
  insurance_provider: string;
  insurance_policy_number: string;
  clearance_doc_url: string | null;
};

export const emptyHealthProfile: HealthProfile = {
  allergyCategories: [],
  allergyNotes: "",
  medications: "",
  conditions: "",
  physician_name: "",
  physician_phone: "",
  emergency_contacts: [
    { name: "", relationship: "", phone: "" },
    { name: "", relationship: "", phone: "" },
  ],
  insurance_provider: "",
  insurance_policy_number: "",
  clearance_doc_url: null,
};

export type RegistrationDraft = {
  campId?: string;
  parent: { full_name: string; email: string; phone: string };
  child: ChildDraft;
  children: Array<ChildDraft & { id?: string }>;
  customs: Record<string, string>;
  waiver: { signer_name: string; agreed_at: string | null } | null;
  healthProfiles: HealthProfile[];
  paymentPlan: "none" | "two" | "three";
  couponCode: string;
};

const emptyDraft: RegistrationDraft = {
  parent: { full_name: "", email: "", phone: "" },
  child: { full_name: "", birthday: "", position: "", skill_level: "" },
  children: [],
  customs: {},
  waiver: null,
  healthProfiles: [],
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