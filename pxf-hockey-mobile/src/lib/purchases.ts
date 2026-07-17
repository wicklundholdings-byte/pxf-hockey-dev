/**
 * src/lib/purchases.ts
 * RevenueCat + Stripe subscription management
 *
 * SETUP REQUIRED:
 *  1. Run: npx expo install react-native-purchases
 *  2. Create project at https://app.revenuecat.com
 *  3. Replace REVENUECAT_IOS_KEY and REVENUECAT_ANDROID_KEY below
 *  4. Configure products in RevenueCat dashboard:
 *       - pxf_team_coach_monthly   → $35/mo (Team Coach)
 *       - pxf_elite_coach_monthly  → $80/mo (Elite Coach)
 *     Create "founding_offer" offering with discounted packages:
 *       - pxf_team_founding        → $25/mo
 *       - pxf_elite_founding       → $50/mo
 *  5. Set PURCHASES_ENABLED = true below to activate
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';

// ─── Config ──────────────────────────────────────────────────────────────────
const REVENUECAT_IOS_KEY     = 'appl_QGtSLOmVVPSdaTBiBsTLuYgZnvH';
const REVENUECAT_ANDROID_KEY = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';
const PURCHASES_ENABLED      = true;

// ─── Types ───────────────────────────────────────────────────────────────────
export type PlanId = 'team' | 'elite';

export interface PlanInfo {
  id:            PlanId;
  name:          string;
  regularPrice:  number;   // cents
  foundingPrice: number;   // cents
  description:   string;
}

export const PLANS: Record<PlanId, PlanInfo> = {
  team: {
    id:            'team',
    name:          'Team Coach',
    regularPrice:  3500,
    foundingPrice: 2500,
    description:   'Roster, schedule, sessions, drills, inbox',
  },
  elite: {
    id:            'elite',
    name:          'Elite Coach',
    regularPrice:  8000,
    foundingPrice: 5000,
    description:   'Full platform: financials, camps, CRM, film + all Team Coach features',
  },
};

// RevenueCat product ID mapping
const PRODUCT_IDS: Record<PlanId, { regular: string; founding: string }> = {
  team:  { regular: 'pxf_team_coach_monthly',  founding: 'pxf_team_founding' },
  elite: { regular: 'pxf_elite_coach_monthly', founding: 'pxf_elite_founding' },
};

// ─── Founding member check ────────────────────────────────────────────────────
const FOUNDING_CAP = 250;

export async function getFoundingMemberCount(): Promise<number> {
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_founding_member', true);
  return count ?? 0;
}

export async function isFoundingMemberAvailable(): Promise<boolean> {
  const count = await getFoundingMemberCount();
  return count < FOUNDING_CAP;
}

// ─── RevenueCat integration ───────────────────────────────────────────────────

let _Purchases: any = null;

function getPurchases() {
  if (!PURCHASES_ENABLED) return null;
  if (!_Purchases) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      _Purchases = require('react-native-purchases').default;
    } catch {
      console.warn('[Purchases] react-native-purchases not installed');
    }
  }
  return _Purchases;
}

export async function initPurchases(userId: string): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases) return;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  Purchases.configure({ apiKey });
  await Purchases.logIn(userId);
}

export async function getOfferings(): Promise<any | null> {
  const Purchases = getPurchases();
  if (!Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (e) {
    console.error('[Purchases] getOfferings error:', e);
    return null;
  }
}

export interface PurchaseResult {
  success:   boolean;
  cancelled: boolean;
  error?:    string;
}

/**
 * Purchase a plan for the current user.
 * Returns { success, cancelled, error }.
 */
export async function purchasePlan(
  planId: PlanId,
  isFoundingMember: boolean,
): Promise<PurchaseResult> {
  const Purchases = getPurchases();

  if (!Purchases) {
    // Dev mode: skip payment, mark as founding member if eligible
    return { success: true, cancelled: false };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const offering  = isFoundingMember
      ? (offerings?.getOffering('founding_offer') ?? offerings?.current)
      : offerings?.current;

    if (!offering) {
      return { success: false, cancelled: false, error: 'No offerings available' };
    }

    // Find the package for this plan
    const productId = isFoundingMember
      ? PRODUCT_IDS[planId].founding
      : PRODUCT_IDS[planId].regular;

    const pkg = offering.availablePackages.find(
      (p: any) => p.product.productIdentifier === productId,
    ) ?? offering.availablePackages[0];

    if (!pkg) {
      return { success: false, cancelled: false, error: 'Package not found' };
    }

    await Purchases.purchasePackage(pkg);
    return { success: true, cancelled: false };
  } catch (e: any) {
    if (e?.userCancelled) return { success: false, cancelled: true };
    return { success: false, cancelled: false, error: e?.message ?? 'Purchase failed' };
  }
}

export async function restorePurchases(): Promise<boolean> {
  const Purchases = getPurchases();
  if (!Purchases) return false;
  try {
    const info = await Purchases.restorePurchases();
    return Object.keys(info.entitlements.active ?? {}).length > 0;
  } catch {
    return false;
  }
}

export async function getCustomerInfo(): Promise<any | null> {
  const Purchases = getPurchases();
  if (!Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function getManagementURL(): Promise<string | null> {
  const Purchases = getPurchases();
  if (!Purchases) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    return info?.managementURL ?? null;
  } catch {
    return null;
  }
}
