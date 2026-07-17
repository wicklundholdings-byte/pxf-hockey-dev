/**
 * PaywallModal — shown after role selection in onboarding and from Settings → Upgrade
 */
import React, { useEffect, useState } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import {
  PlanId, PLANS,
  purchasePlan, restorePurchases,
  isFoundingMemberAvailable, getFoundingMemberCount,
} from '@/lib/purchases';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const MUTED  = '#8B949E';
const BORDER = '#21262D';
const TEXT   = '#FFFFFF';
const FOUNDING_CAP = 250;

interface Props {
  visible:        boolean;
  planId:         PlanId;
  onSuccess:      () => void;
  onDismiss:      () => void;
  /** Allow skipping payment (dev / test builds) */
  allowSkip?:     boolean;
}

export default function PaywallModal({ visible, planId, onSuccess, onDismiss, allowSkip = __DEV__ }: Props) {
  const plan   = PLANS[planId];
  const accent = planId === 'elite' ? TEAL : GREEN;

  const [founding, setFounding]     = useState(false);
  const [spotsLeft, setSpotsLeft]   = useState(FOUNDING_CAP);
  const [loading, setLoading]       = useState(false);
  const [restoring, setRestoring]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const available = await isFoundingMemberAvailable();
      const count     = await getFoundingMemberCount();
      setFounding(available);
      setSpotsLeft(Math.max(0, FOUNDING_CAP - count));
    })();
  }, [visible]);

  const displayPrice = founding ? plan.foundingPrice : plan.regularPrice;
  const displayPriceFmt = `$${(displayPrice / 100).toFixed(0)}`;
  const regularPriceFmt = `$${(plan.regularPrice / 100).toFixed(0)}`;

  async function handlePurchase() {
    setLoading(true);
    setError(null);
    try {
      const result = await purchasePlan(planId, founding);
      if (result.success) {
        onSuccess();
      } else if (result.cancelled) {
        // user cancelled — stay on paywall
      } else {
        setError(result.error ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    const ok = await restorePurchases();
    setRestoring(false);
    if (ok) onSuccess();
    else setError('No active subscription found.');
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <View style={s.root}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={s.header}>
            {allowSkip && (
              <TouchableOpacity style={s.closeBtn} onPress={onDismiss}>
                <Ionicons name="close" size={22} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>

          {/* Badge */}
          <View style={s.iconWrap}>
            <View style={[s.iconCircle, { backgroundColor: `${accent}1A` }]}>
              <Ionicons
                name={planId === 'elite' ? 'shield-checkmark-outline' : 'people-outline'}
                size={32}
                color={accent}
              />
            </View>
          </View>

          <ThemedText style={s.planName}>{plan.name}</ThemedText>
          <ThemedText style={s.planDesc}>{plan.description}</ThemedText>

          {/* Pricing card */}
          <View style={s.priceCard}>
            {founding && (
              <View style={s.foundingBadge}>
                <Ionicons name="flame" size={12} color={ORANGE} />
                <ThemedText style={s.foundingBadgeText}>
                  FOUNDING MEMBER — {spotsLeft} SPOTS LEFT
                </ThemedText>
              </View>
            )}

            <View style={s.priceRow}>
              <ThemedText style={[s.price, { color: accent }]}>
                {displayPriceFmt}
                <ThemedText style={[s.perMonth, { color: accent }]}>/mo</ThemedText>
              </ThemedText>
              {founding && (
                <View style={s.savingsTag}>
                  <ThemedText style={s.savingsTagText}>
                    Save ${((plan.regularPrice - plan.foundingPrice) / 100).toFixed(0)}/mo
                  </ThemedText>
                </View>
              )}
            </View>

            {founding && (
              <ThemedText style={s.regularNote}>
                {regularPriceFmt}/mo after founding period — you lock in forever
              </ThemedText>
            )}

            <View style={s.divider} />

            {/* Feature bullets */}
            {(planId === 'elite'
              ? ['Camps & registrations', 'Financials & payouts', 'CRM & contacts', 'Broadcasts & outreach', 'Film review & upload', 'Teams, scheduling & drills']
              : ['Team roster & schedule', 'Sessions & drills', 'Practice planning', 'Player & parent inbox']
            ).map(f => (
              <View key={f} style={s.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={accent} />
                <ThemedText style={s.featureText}>{f}</ThemedText>
              </View>
            ))}
          </View>

          {/* Error */}
          {error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
              <ThemedText style={s.errorText}>{error}</ThemedText>
            </View>
          )}

          {/* Subscribe button */}
          <TouchableOpacity
            style={s.subscribeBtn}
            onPress={handlePurchase}
            disabled={loading || restoring}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={planId === 'elite' ? [TEAL, '#00A89A'] : [GREEN, '#2DE87E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.subscribeBtnGrad}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <ThemedText style={s.subscribeBtnText}>
                    Start {plan.name} — {displayPriceFmt}/mo
                  </ThemedText>
                  <Ionicons name="arrow-forward" size={18} color="#000" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <ThemedText style={s.legalNote}>
            Billed monthly. Cancel anytime. Subscription managed through{' '}
            {/* iOS = App Store, Android = Google Play */}
            your device's app store.
          </ThemedText>

          {/* Restore */}
          <TouchableOpacity style={s.restoreBtn} onPress={handleRestore} disabled={restoring || loading}>
            {restoring ? (
              <ActivityIndicator size="small" color={MUTED} />
            ) : (
              <ThemedText style={s.restoreText}>Restore Purchases</ThemedText>
            )}
          </TouchableOpacity>

          {/* Skip in dev/test builds */}
          {allowSkip && (
            <TouchableOpacity style={s.skipBtn} onPress={onSuccess}>
              <ThemedText style={s.skipText}>Skip for now (dev mode)</ThemedText>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 8 },

  header:   { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8, marginBottom: 8 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },

  iconWrap:   { alignItems: 'center', marginBottom: 16, marginTop: 8 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },

  planName: { fontSize: 26, fontWeight: '800', lineHeight: 32, color: TEXT, textAlign: 'center', marginBottom: 6 },
  planDesc: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  priceCard: { backgroundColor: CARD, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: BORDER, marginBottom: 20 },

  foundingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
    alignSelf: 'flex-start', marginBottom: 14,
  },
  foundingBadgeText: { fontSize: 10, fontWeight: '800', color: ORANGE, letterSpacing: 0.5 },

  priceRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  price:          { fontSize: 40, fontWeight: '800', lineHeight: 48 },
  perMonth:       { fontSize: 18, fontWeight: '600' },
  savingsTag:     { backgroundColor: 'rgba(61,255,143,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(61,255,143,0.25)' },
  savingsTagText: { fontSize: 12, fontWeight: '700', color: GREEN },

  regularNote: { fontSize: 12, color: MUTED, marginBottom: 4 },
  divider:     { height: 1, backgroundColor: BORDER, marginVertical: 14 },

  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  featureText: { fontSize: 14, color: TEXT, lineHeight: 20 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', marginBottom: 16 },
  errorText: { fontSize: 13, color: '#EF4444', flex: 1 },

  subscribeBtn:     { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  subscribeBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8 },
  subscribeBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },

  legalNote:   { fontSize: 11, color: MUTED, textAlign: 'center', lineHeight: 16, marginBottom: 16 },
  restoreBtn:  { alignItems: 'center', paddingVertical: 10, marginBottom: 6 },
  restoreText: { fontSize: 14, color: MUTED },
  skipBtn:     { alignItems: 'center', paddingVertical: 8 },
  skipText:    { fontSize: 13, color: 'rgba(139,148,158,0.5)' },
});
