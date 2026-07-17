import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Switch, ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type Period      = 'mtd' | 'qtd' | 'ytd';
type FinTab      = 'overview' | 'orders' | 'reports' | 'taxes' | 'payouts' | 'coupons';
type OrderFilter = 'all' | 'paid' | 'pending' | 'refunded';
type ReportRange = '7d' | '30d' | '90d' | 'ytd';
type TaxRegion   = 'canada' | 'us';

type Registration = {
  id: string;
  player_name: string;
  parent_name: string | null;
  status: string;
  amount_cents: number;
  created_at: string;
  camp: { id: string; name: string } | null;
};

type RevByCamp   = { id: string; name: string; amount: number };
type TaxCamp     = { id: string; name: string; enabled: boolean };
type OtherExpense = { id: string; name: string; amount: number };

// ─── Period helpers ───────────────────────────────────────────────────────────
function periodRange(p: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;
  if (p === 'mtd') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  } else if (p === 'qtd') {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0);
  } else {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  }
  return { start, end };
}

function periodLabel(p: Period): string {
  if (p === 'mtd') return 'MTD';
  if (p === 'qtd') return 'QTD';
  return 'YTD';
}

// ─── KPI Grid ─────────────────────────────────────────────────────────────────
function KpiGrid({ gross, paidCount, pending, pendingCount, period }: {
  gross: number; paidCount: number; pending: number; pendingCount: number; period: Period;
}) {
  const pl  = periodLabel(period);
  const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return (
    <View style={s.kpiGrid}>
      <View style={s.kpiRowFlex}>
        <View style={[s.kpiCard, { marginRight: 6 }]}>
          <View style={s.kpiLabelRow}>
            <Ionicons name="cash-outline" size={12} color={TEAL} style={{ marginRight: 4 }} />
            <ThemedText style={s.kpiLabel}>REVENUE · {pl}</ThemedText>
          </View>
          <ThemedText style={[s.kpiValue, { color: TEAL }]}>{fmt(gross)}</ThemedText>
          <ThemedText style={s.kpiSub}>{paidCount} paid</ThemedText>
        </View>
        <View style={s.kpiCard}>
          <View style={s.kpiLabelRow}>
            <Ionicons name="wallet-outline" size={12} color={TEAL} style={{ marginRight: 4 }} />
            <ThemedText style={s.kpiLabel}>AVAILABLE BALANCE</ThemedText>
          </View>
          <ThemedText style={[s.kpiValue, { color: TEAL }]}>{fmt(gross)}</ThemedText>
          <ThemedText style={s.kpiSub}>Stripe payout pending</ThemedText>
        </View>
      </View>
      <View style={[s.kpiRowFlex, { marginTop: 8 }]}>
        <View style={[s.kpiCard, { marginRight: 6 }]}>
          <View style={s.kpiLabelRow}>
            <Ionicons name="time-outline" size={12} color={ORANGE} style={{ marginRight: 4 }} />
            <ThemedText style={s.kpiLabel}>PENDING · {pl}</ThemedText>
          </View>
          <ThemedText style={[s.kpiValue, { color: ORANGE }]}>{fmt(pending)}</ThemedText>
          <ThemedText style={s.kpiSub}>{pendingCount} orders</ThemedText>
        </View>
        <View style={s.kpiCard}>
          <View style={s.kpiLabelRow}>
            <Ionicons name="close-circle-outline" size={12} color={RED} style={{ marginRight: 4 }} />
            <ThemedText style={s.kpiLabel}>REFUNDED</ThemedText>
          </View>
          <ThemedText style={[s.kpiValue, { color: RED }]}>$0</ThemedText>
          <ThemedText style={s.kpiSub}>0 orders</ThemedText>
        </View>
      </View>
    </View>
  );
}

// ─── Period Chips ─────────────────────────────────────────────────────────────
function PeriodChips({ period, onSelect }: { period: Period; onSelect: (p: Period) => void }) {
  const opts: { key: Period; label: string }[] = [
    { key: 'mtd', label: 'This Month'    },
    { key: 'qtd', label: 'This Quarter'  },
    { key: 'ytd', label: 'Year to Date'  },
  ];
  return (
    <View style={s.periodRow}>
      {opts.map(o => (
        <TouchableOpacity
          key={o.key}
          onPress={() => onSelect(o.key)}
          style={[s.periodChip, period === o.key && s.periodChipActive]}
          activeOpacity={0.8}
        >
          <ThemedText style={[s.periodChipText, period === o.key && s.periodChipTextActive]}>
            {o.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Tab Selector ─────────────────────────────────────────────────────────────
const TABS: { key: FinTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'orders',   label: 'Orders'   },
  { key: 'reports',  label: 'Reports'  },
  { key: 'taxes',    label: 'Taxes'    },
  { key: 'payouts',  label: 'Payouts'  },
  { key: 'coupons',  label: 'Coupons'  },
];

function TabBar({ active, onSelect }: { active: FinTab; onSelect: (t: FinTab) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.tabBarContent}
      style={s.tabBar}
    >
      {TABS.map(t => (
        <TouchableOpacity
          key={t.key}
          onPress={() => onSelect(t.key)}
          style={[s.tabPill, active === t.key && s.tabPillActive]}
          activeOpacity={0.8}
        >
          <ThemedText style={[s.tabPillText, active === t.key && s.tabPillTextActive]}>
            {t.label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ gross, revByCamp, iceCost, staffCost, period }: {
  gross: number; revByCamp: RevByCamp[];
  iceCost: number; staffCost: number; period: Period;
}) {
  const [otherExpenses, setOtherExpenses] = useState<OtherExpense[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseName,   setExpenseName]   = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const fmt    = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtRaw = (n: number) => `$${Math.abs(n) % 1 === 0 ? Math.abs(n).toFixed(0) : Math.abs(n).toFixed(2)}`;
  const pl         = periodLabel(period);
  const maxRevenue = revByCamp.length > 0 ? Math.max(...revByCamp.map(c => c.amount)) : 1;
  const grossDollars = gross / 100;
  const otherTotal   = otherExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit    = grossDollars - iceCost - staffCost - otherTotal;

  function addExpense() {
    const amt = parseFloat(expenseAmount);
    if (!expenseName.trim() || isNaN(amt) || amt <= 0) return;
    setOtherExpenses(prev => [...prev, { id: Date.now().toString(), name: expenseName.trim(), amount: amt }]);
    setShowAddExpense(false);
    setExpenseName('');
    setExpenseAmount('');
  }

  return (
    <>
      {/* Net P&L Summary */}
      <View style={s.section}>
        <View style={s.sectionLabelRow}>
          <Ionicons name="trending-up-outline" size={14} color={TEAL} style={{ marginRight: 6 }} />
          <ThemedText style={s.sectionLabel}>NET PROFIT · {pl}</ThemedText>
        </View>
        <ThemedText style={[s.bigValue, { color: netProfit >= 0 ? TEAL : RED, marginBottom: 14 }]}>
          {netProfit < 0 ? `-$${Math.abs(netProfit).toFixed(0)}` : `$${netProfit % 1 === 0 ? netProfit.toFixed(0) : netProfit.toFixed(2)}`}
        </ThemedText>
        <View style={{ gap: 6 }}>
          <View style={s.rowSpread}>
            <ThemedText style={s.sectionSub}>Revenue</ThemedText>
            <ThemedText style={{ fontSize: 13, color: TEAL, fontWeight: '600' }}>{fmt(gross)}</ThemedText>
          </View>
          <View style={s.rowSpread}>
            <ThemedText style={s.sectionSub}>Ice costs</ThemedText>
            <ThemedText style={{ fontSize: 13, color: iceCost > 0 ? RED : MUTED, fontWeight: '600' }}>
              {iceCost > 0 ? `−$${iceCost % 1 === 0 ? iceCost.toFixed(0) : iceCost.toFixed(2)}` : '—'}
            </ThemedText>
          </View>
          <View style={s.rowSpread}>
            <ThemedText style={s.sectionSub}>Staff costs</ThemedText>
            <ThemedText style={{ fontSize: 13, color: staffCost > 0 ? RED : MUTED, fontWeight: '600' }}>
              {staffCost > 0 ? `−$${staffCost % 1 === 0 ? staffCost.toFixed(0) : staffCost.toFixed(2)}` : '—'}
            </ThemedText>
          </View>
          {otherExpenses.length > 0 && (
            <View style={s.rowSpread}>
              <ThemedText style={s.sectionSub}>Other expenses</ThemedText>
              <ThemedText style={{ fontSize: 13, color: RED, fontWeight: '600' }}>
                −{fmtRaw(otherTotal)}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* Ice Costs */}
      <View style={s.section}>
        <View style={s.sectionLabelRow}>
          <Ionicons name="snow-outline" size={14} color={MUTED} style={{ marginRight: 6 }} />
          <ThemedText style={s.sectionLabel}>ICE COSTS · {pl}</ThemedText>
        </View>
        <ThemedText style={[s.bigValue, { color: TEXT }]}>
          ${iceCost % 1 === 0 ? iceCost.toFixed(0) : iceCost.toFixed(2)}
        </ThemedText>
        <ThemedText style={s.sectionSub}>
          {iceCost === 0 ? 'No priced ice slots this period' : 'From priced ice slots'}
        </ThemedText>
      </View>

      {/* Staff Costs */}
      <View style={s.section}>
        <View style={s.sectionLabelRow}>
          <Ionicons name="people-outline" size={14} color={MUTED} style={{ marginRight: 6 }} />
          <ThemedText style={s.sectionLabel}>STAFF COSTS · {pl}</ThemedText>
        </View>
        <ThemedText style={[s.bigValue, { color: TEXT }]}>
          ${staffCost % 1 === 0 ? staffCost.toFixed(0) : staffCost.toFixed(2)}
        </ThemedText>
        <ThemedText style={s.sectionSub}>
          {staffCost === 0 ? 'No instructor costs this period' : 'Based on assigned rates × hours'}
        </ThemedText>
      </View>

      {/* Other Expenses */}
      <View style={s.section}>
        <View style={[s.sectionLabelRow, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="receipt-outline" size={14} color={MUTED} style={{ marginRight: 6 }} />
            <ThemedText style={s.sectionLabel}>OTHER EXPENSES</ThemedText>
          </View>
          {!showAddExpense && (
            <TouchableOpacity onPress={() => setShowAddExpense(true)}>
              <ThemedText style={{ fontSize: 13, color: TEAL, fontWeight: '600' }}>+ Add</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {otherExpenses.length === 0 && !showAddExpense && (
          <ThemedText style={s.sectionSub}>No other expenses recorded</ThemedText>
        )}

        {otherExpenses.map(e => (
          <View key={e.id} style={[s.rowSpread, { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER }]}>
            <ThemedText style={{ fontSize: 14, color: TEXT }}>{e.name}</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ThemedText style={{ fontSize: 14, fontWeight: '600', color: TEXT }}>${e.amount % 1 === 0 ? e.amount.toFixed(0) : e.amount.toFixed(2)}</ThemedText>
              <TouchableOpacity onPress={() => setOtherExpenses(prev => prev.filter(x => x.id !== e.id))}>
                <Ionicons name="close-circle" size={18} color={MUTED} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {showAddExpense && (
          <View style={{ marginTop: 10, gap: 8 }}>
            <TextInput
              style={s.rateInput}
              placeholder="Expense name (e.g. Insurance)"
              placeholderTextColor={MUTED}
              value={expenseName}
              onChangeText={setExpenseName}
            />
            <TextInput
              style={s.rateInput}
              placeholder="Amount ($)"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              value={expenseAmount}
              onChangeText={setExpenseAmount}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: BG, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER }}
                onPress={() => { setShowAddExpense(false); setExpenseName(''); setExpenseAmount(''); }}
              >
                <ThemedText style={{ fontSize: 14, color: MUTED }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: TEAL, borderRadius: 10, padding: 12, alignItems: 'center' }}
                onPress={addExpense}
              >
                <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>Add</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Revenue by Camp */}
      <View style={s.section}>
        <ThemedText style={s.revByCampLabel}>REVENUE BY CAMP · {pl}</ThemedText>
        {revByCamp.length === 0 ? (
          <ThemedText style={s.sectionSub}>No camp revenue this period</ThemedText>
        ) : (
          revByCamp.map(camp => (
            <View key={camp.id} style={{ marginBottom: 14 }}>
              <View style={s.rowSpread}>
                <ThemedText style={s.campName}>{camp.name}</ThemedText>
                <ThemedText style={[s.campAmount, { color: TEAL }]}>{fmt(camp.amount)}</ThemedText>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${(camp.amount / maxRevenue) * 100}%` as any }]} />
              </View>
            </View>
          ))
        )}
      </View>
    </>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab({ registrations }: { registrations: Registration[] }) {
  const [filter, setFilter] = useState<OrderFilter>('all');
  const filters: { key: OrderFilter; label: string }[] = [
    { key: 'all',      label: 'All'      },
    { key: 'paid',     label: 'Paid'     },
    { key: 'pending',  label: 'Pending'  },
    { key: 'refunded', label: 'Refunded' },
  ];
  const visible = registrations.filter(r => {
    const st = r.status === 'confirmed' ? 'paid' : r.status;
    return filter === 'all' || st === filter;
  });
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        {filters.map(f => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
            style={[s.filterPill, filter === f.key && s.filterPillActive]} activeOpacity={0.8}>
            <ThemedText style={[s.filterPillText, filter === f.key && s.filterPillTextActive]}>
              {f.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {visible.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="receipt-outline" size={36} color={MUTED} style={{ marginBottom: 10 }} />
          <ThemedText style={s.emptyStateText}>No orders yet</ThemedText>
        </View>
      ) : (
        visible.map(order => {
          const displayStatus = order.status === 'confirmed' ? 'paid' : order.status;
          const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <View key={order.id} style={s.orderRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.orderParent}>{order.parent_name ?? order.player_name}</ThemedText>
                <ThemedText style={s.orderMeta}>{order.camp?.name ?? 'Unknown camp'} · {dateStr}</ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText style={[
                  s.orderBadge,
                  displayStatus === 'paid' ? { color: TEAL } :
                  displayStatus === 'pending' ? { color: ORANGE } : { color: RED },
                ]}>
                  {displayStatus.toUpperCase()}
                </ThemedText>
                <ThemedText style={s.orderAmount}>${(order.amount_cents / 100).toFixed(0)}</ThemedText>
              </View>
            </View>
          );
        })
      )}
    </>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────
function ReportsTab({ registrations }: { registrations: Registration[] }) {
  const [range, setRange] = useState<ReportRange>('ytd');
  const ranges: { key: ReportRange; label: string }[] = [
    { key: '7d',  label: '7D'  },
    { key: '30d', label: '30D' },
    { key: '90d', label: '90D' },
    { key: 'ytd', label: 'YTD' },
  ];
  const BAR_MAX_H = 130;

  const { bars, labelStart, gross } = (() => {
    const now = new Date();
    const daysMap: Record<string, number> = {};

    let daysBack = 30;
    if (range === '7d')  daysBack = 7;
    if (range === '90d') daysBack = 90;
    if (range === 'ytd') {
      daysBack = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
    }

    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      daysMap[d.toISOString().slice(0, 10)] = 0;
    }

    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - daysBack);
    let totalCents = 0;
    registrations
      .filter(r => (r.status === 'confirmed' || r.status === 'paid') && new Date(r.created_at) >= cutoff)
      .forEach(r => {
        const day = r.created_at.slice(0, 10);
        if (day in daysMap) {
          daysMap[day] += r.amount_cents ?? 0;
          totalCents += r.amount_cents ?? 0;
        }
      });

    const vals = Object.values(daysMap);
    const bucketSize = Math.ceil(vals.length / 14);
    const buckets: number[] = [];
    for (let i = 0; i < vals.length; i += bucketSize) {
      buckets.push(vals.slice(i, i + bucketSize).reduce((s, v) => s + v, 0));
    }

    const startDate = new Date(now);
    startDate.setDate(now.getDate() - daysBack + 1);
    const startLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { bars: buckets, labelStart: startLabel, gross: totalCents };
  })();

  const maxBar = Math.max(...bars, 1);
  const fmtAmt = (cents: number) => cents === 0 ? '$0' : `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <>
      <View style={s.reportTopRow}>
        <View style={s.rangeRow}>
          {ranges.map(r => (
            <TouchableOpacity
              key={r.key}
              onPress={() => setRange(r.key)}
              style={[s.rangePill, range === r.key && s.rangePillActive]}
              activeOpacity={0.8}
            >
              <ThemedText style={[s.rangePillText, range === r.key && s.rangePillTextActive]}>
                {r.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.exportBtn} activeOpacity={0.8}>
          <Ionicons name="download-outline" size={14} color={MUTED} style={{ marginRight: 5 }} />
          <ThemedText style={s.exportText}>Export CSV</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={s.chartCard}>
        <View style={s.chartLabelRow}>
          <Ionicons name="bar-chart-outline" size={14} color={MUTED} style={{ marginRight: 6 }} />
          <ThemedText style={s.sectionLabel}>REVENUE TREND</ThemedText>
        </View>
        {bars.every(b => b === 0) ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ThemedText style={{ fontSize: 13, color: MUTED }}>No revenue in this period</ThemedText>
          </View>
        ) : (
          <>
            <View style={s.barsContainer}>
              {bars.map((val, i) => (
                <View key={i} style={s.barWrapper}>
                  <View style={[s.bar, { height: Math.max(2, (val / maxBar) * BAR_MAX_H) }]} />
                </View>
              ))}
            </View>
            <View style={s.chartAxisRow}>
              <ThemedText style={s.chartAxisLabel}>{labelStart}</ThemedText>
              <ThemedText style={s.chartAxisLabel}>Today</ThemedText>
            </View>
          </>
        )}
      </View>

      <View style={s.reportStats}>
        <View style={s.reportStatCard}>
          <ThemedText style={s.reportStatLabel}>GROSS</ThemedText>
          <ThemedText style={[s.reportStatValue, { color: TEAL }]}>{fmtAmt(gross)}</ThemedText>
        </View>
        <View style={s.reportStatCard}>
          <ThemedText style={s.reportStatLabel}>REFUNDS</ThemedText>
          <ThemedText style={[s.reportStatValue, { color: RED }]}>-$0</ThemedText>
        </View>
        <View style={s.reportStatCard}>
          <ThemedText style={s.reportStatLabel}>NET</ThemedText>
          <ThemedText style={[s.reportStatValue, { color: TEAL }]}>{fmtAmt(gross)}</ThemedText>
        </View>
      </View>
    </>
  );
}

// ─── Taxes Tab ────────────────────────────────────────────────────────────────
function TaxesTab() {
  const [region,      setRegion]     = useState<TaxRegion>('canada');
  const [rate,        setRate]       = useState('5');
  const [camps,       setCamps]      = useState<TaxCamp[]>([]);
  const [taxLoading,  setTaxLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setTaxLoading(false); return; }
      const { data } = await supabase
        .from('camps')
        .select('id, name')
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false });
      setCamps((data ?? []).map((c: any) => ({ id: c.id, name: c.name, enabled: true })));
      setTaxLoading(false);
    })();
  }, []);

  // Reset rate to regional default when region changes
  useEffect(() => {
    setRate(region === 'canada' ? '5' : '');
  }, [region]);

  const toggleCamp = (id: string) => {
    setCamps(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  return (
    <>
      <View style={s.infoBanner}>
        <Ionicons name="pricetag-outline" size={14} color={TEAL} style={{ marginRight: 8 }} />
        <ThemedText style={s.infoBannerText}>
          Set a default tax rate and toggle which camps collect tax at checkout.
        </ThemedText>
      </View>

      <View style={s.section}>
        <ThemedText style={s.fieldLabel}>REGION</ThemedText>
        <View style={s.regionRow}>
          <TouchableOpacity
            style={[s.regionBtn, region === 'canada' && s.regionBtnActive]}
            onPress={() => setRegion('canada')}
            activeOpacity={0.8}
          >
            <ThemedText style={s.regionBtnText}>🇨🇦 Canada (GST/HST)</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.regionBtn, region === 'us' && s.regionBtnActive]}
            onPress={() => setRegion('us')}
            activeOpacity={0.8}
          >
            <ThemedText style={s.regionBtnText}>🇺🇸 US (Sales tax)</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.section}>
        <ThemedText style={s.fieldLabel}>
          DEFAULT RATE (%) {region === 'canada' ? '— Canada federal GST' : '— enter your state/local rate'}
        </ThemedText>
        <TextInput
          style={s.rateInput}
          value={rate}
          onChangeText={setRate}
          keyboardType="numeric"
          placeholder={region === 'canada' ? '5' : 'e.g. 8.5'}
          placeholderTextColor={MUTED}
        />
      </View>

      <View style={s.section}>
        <ThemedText style={s.fieldLabel}>APPLY PER CAMP</ThemedText>
        {taxLoading ? (
          <ActivityIndicator color={TEAL} style={{ marginVertical: 16 }} />
        ) : camps.length === 0 ? (
          <ThemedText style={{ color: MUTED, fontSize: 13, paddingVertical: 12 }}>
            No camps yet — create a camp to configure tax settings.
          </ThemedText>
        ) : camps.map(camp => (
          <View key={camp.id} style={s.toggleRow}>
            <ThemedText style={s.toggleRowText}>{camp.name}</ThemedText>
            <Switch
              value={camp.enabled}
              onValueChange={() => toggleCamp(camp.id)}
              trackColor={{ false: BORDER, true: TEAL }}
              thumbColor={TEXT}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.85} style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 32 }}>
        <LinearGradient
          colors={[TEAL, GREEN]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.saveBtn}
        >
          <ThemedText style={s.saveBtnText}>Save tax settings</ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </>
  );
}

// ─── Payouts Tab ──────────────────────────────────────────────────────────────
function PayoutsTab({ gross }: { gross: number }) {
  const fmtAmt = (cents: number) => cents === 0 ? '$0' : `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return (
    <>
      <LinearGradient
        colors={['#071616', '#0B2424']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.payoutAvailCard}
      >
        <ThemedText style={s.payoutAvailLabel}>AVAILABLE TO REQUEST</ThemedText>
        <ThemedText style={[s.bigValue, { color: TEAL, marginBottom: 8 }]}>{fmtAmt(gross)}</ThemedText>
        <ThemedText style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
          Stripe Connect required to request payouts
        </ThemedText>
        <TouchableOpacity activeOpacity={0.85}>
          <LinearGradient
            colors={['#0B6A3F', '#0D8A50']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.requestPayoutBtn}
          >
            <ThemedText style={s.requestPayoutText}>Connect Stripe →</ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      <View style={s.emptyState}>
        <Ionicons name="card-outline" size={36} color={MUTED} style={{ marginBottom: 12 }} />
        <ThemedText style={s.emptyStateText}>No payout history</ThemedText>
        <ThemedText style={{ fontSize: 13, color: MUTED, textAlign: 'center', paddingHorizontal: 32, marginTop: 4 }}>
          Connect Stripe to enable payouts and track payout history
        </ThemedText>
      </View>
    </>
  );
}

// ─── Coupons Tab ──────────────────────────────────────────────────────────────
function CouponsTab() {
  return (
    <>
      <TouchableOpacity activeOpacity={0.85} style={{ marginHorizontal: 16, marginTop: 4, marginBottom: 16 }}>
        <LinearGradient
          colors={[TEAL, GREEN]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.saveBtn}
        >
          <ThemedText style={s.saveBtnText}>+ New coupon</ThemedText>
        </LinearGradient>
      </TouchableOpacity>

      <View style={s.emptyState}>
        <Ionicons name="pricetag-outline" size={40} color={MUTED} style={{ marginBottom: 12 }} />
        <ThemedText style={s.emptyStateText}>No coupons yet.</ThemedText>
      </View>
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FinancialsScreen() {
  const router = useRouter();
  const [period, setPeriod]                 = useState<Period>('ytd');
  const [activeTab, setActiveTab]           = useState<FinTab>('overview');
  const [loading, setLoading]               = useState(true);
  const [registrations, setRegistrations]   = useState<Registration[]>([]);
  const [revByCamp, setRevByCamp]           = useState<RevByCamp[]>([]);
  const [gross, setGross]                   = useState(0);
  const [paidCount, setPaidCount]           = useState(0);
  const [pending, setPending]               = useState(0);
  const [pendingCount, setPendingCount]     = useState(0);
  const [iceCost, setIceCost]               = useState(0);
  const [staffCost, setStaffCost]           = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { start, end } = periodRange(period);

      // ── All registrations (for Orders tab — not period-scoped) ──
      const { data } = await supabase
        .from('camp_registrations')
        .select('id, player_name, parent_name, status, amount_cents, created_at, camp:camps(id, name, coach_id)')
        .order('created_at', { ascending: false });

      const rows = (data ?? []).map((r: any) => ({
        ...r,
        camp: Array.isArray(r.camp) ? r.camp[0] ?? null : r.camp ?? null,
      }));
      const mine = rows.filter((r: any) => r.camp?.coach_id === user.id) as Registration[];
      setRegistrations(mine);

      // ── Period-scoped paid registrations ──
      const periodPaid = mine.filter((r: any) =>
        (r.status === 'confirmed' || r.status === 'paid') &&
        new Date(r.created_at) >= start &&
        new Date(r.created_at) <= end
      );
      const periodPend = mine.filter((r: any) =>
        r.status === 'pending' &&
        new Date(r.created_at) >= start &&
        new Date(r.created_at) <= end
      );

      const grossCents = periodPaid.reduce((sum: number, r: any) => sum + (r.amount_cents ?? 0), 0);
      const pendCents  = periodPend.reduce((sum: number, r: any) => sum + (r.amount_cents ?? 0), 0);
      setGross(grossCents);
      setPaidCount(periodPaid.length);
      setPending(pendCents);
      setPendingCount(periodPend.length);

      // ── Revenue by camp (period-scoped) ──
      const campMap = new Map<string, { id: string; name: string; amount: number }>();
      periodPaid.forEach((r: any) => {
        if (!r.camp) return;
        const existing = campMap.get(r.camp.id);
        if (existing) { existing.amount += r.amount_cents ?? 0; }
        else campMap.set(r.camp.id, { id: r.camp.id, name: r.camp.name, amount: r.amount_cents ?? 0 });
      });
      setRevByCamp(Array.from(campMap.values()).sort((a, b) => b.amount - a.amount));

      // ── Ice costs (period-scoped by slot_date) ──
      const fmtDate = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
      const { data: slotData } = await supabase
        .from('ice_slots')
        .select('cost')
        .eq('coach_id', user.id)
        .gte('slot_date', fmtDate(start))
        .lte('slot_date', fmtDate(end))
        .gt('cost', 0);

      const ice = (slotData ?? []).reduce((sum: number, s: any) => sum + (s.cost ?? 0), 0);
      setIceCost(ice);

      // ── Staff costs (period-scoped by assignment created_at) ──
      const { data: assignData } = await supabase
        .from('instructor_assignments')
        .select('rate_per_hour, hours, staff_member:staff_members(hourly_rate)')
        .eq('owner_id', user.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const staff = (assignData ?? []).reduce((sum: number, a: any) => {
        const rate  = a.rate_per_hour ?? a.staff_member?.hourly_rate ?? 0;
        const hours = a.hours ?? 1;
        return sum + rate * hours;
      }, 0);
      setStaffCost(staff);

      setLoading(false);
    }
    load();
  }, [period]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={TEAL} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        {/* Founding Member banner */}
        <LinearGradient
          colors={['#071616', '#0B2424']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.memberBanner}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
            <Ionicons name="flame-outline" size={16} color={TEAL} />
            <ThemedText style={s.memberText} numberOfLines={2}>
              Founding Member — Free until December 31, 2027
            </ThemedText>
          </View>
          <View style={s.eliteChip}>
            <ThemedText style={s.eliteText}>Elite{'\n'}Coach</ThemedText>
          </View>
        </LinearGradient>

        {/* Top nav */}
        <View style={s.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={16} color={TEXT} />
            <ThemedText style={s.backText}>Dashboard</ThemedText>
          </TouchableOpacity>
          <View style={s.topIcons}>
            <View style={s.coachChip}>
              <ThemedText style={s.coachChipText}>COACH</ThemedText>
            </View>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="person-circle-outline" size={22} color={MUTED} /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="megaphone-outline" size={20} color={MUTED} /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="camera-outline" size={20} color={MUTED} /></TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}><Ionicons name="settings-outline" size={20} color={MUTED} /></TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <View style={s.titleRow}>
          <ThemedText style={s.screenLabel}>MONEY</ThemedText>
          <ThemedText style={s.screenTitle}>Financials</ThemedText>
        </View>

        {/* Period chips — shown for all tabs */}
        <PeriodChips period={period} onSelect={setPeriod} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* KPI Grid */}
          <KpiGrid
            gross={gross}
            paidCount={paidCount}
            pending={pending}
            pendingCount={pendingCount}
            period={period}
          />

          {/* Tab bar */}
          <TabBar active={activeTab} onSelect={setActiveTab} />

          {/* Tab content */}
          {activeTab === 'overview' && (
            <OverviewTab
              gross={gross}
              revByCamp={revByCamp}
              iceCost={iceCost}
              staffCost={staffCost}
              period={period}
            />
          )}
          {activeTab === 'orders'   && <OrdersTab registrations={registrations} />}
          {activeTab === 'reports'  && <ReportsTab registrations={registrations} />}
          {activeTab === 'taxes'    && <TaxesTab />}
          {activeTab === 'payouts'  && <PayoutsTab gross={gross} />}
          {activeTab === 'coupons'  && <CouponsTab />}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  // Founding Member banner
  memberBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 12, padding: 12, gap: 8,
  },
  memberText: { fontSize: 13, color: TEXT, lineHeight: 18 },
  eliteChip:  { backgroundColor: TEAL, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexShrink: 0 },
  eliteText:  { fontSize: 11, fontWeight: '800', color: '#000', textAlign: 'center', lineHeight: 15 },

  // Top nav
  topNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  backText:  { fontSize: 14, fontWeight: '600', color: TEXT },
  topIcons:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  coachChip: { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: TEAL, marginRight: 4 },
  coachChipText: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1 },
  iconBtn:   { padding: 6 },

  // Title
  titleRow:    { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  screenLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 2, marginBottom: 3 },
  screenTitle: { fontSize: 28, fontWeight: '800', color: TEXT, lineHeight: 34 },

  // Period chips
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center',
  },
  periodChipActive: {
    borderColor: TEAL,
    backgroundColor: '#0D2A24',
  },
  periodChipText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  periodChipTextActive: { color: TEAL, fontWeight: '700' },

  // KPI Grid
  kpiGrid: { paddingHorizontal: 16, marginBottom: 8 },
  kpiRowFlex: { flexDirection: 'row' },
  kpiCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  kpiLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  kpiRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  kpiValue: { fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: 3 },
  kpiSub:   { fontSize: 12, color: MUTED },

  // Tab bar
  tabBar:        { marginBottom: 8 },
  tabBarContent: { paddingHorizontal: 16, gap: 8 },
  tabPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
  },
  tabPillActive:     { borderColor: TEAL },
  tabPillText:       { fontSize: 14, fontWeight: '600', color: MUTED },
  tabPillTextActive: { color: TEAL, fontWeight: '700' },

  // Shared section card
  section: {
    backgroundColor: CARD, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER,
  },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5 },
  sectionSub:      { fontSize: 13, color: MUTED, marginTop: 2 },
  bigValue:        { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  rowSpread:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editBtn:         { backgroundColor: BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: BORDER },
  editBtnText:     { fontSize: 13, fontWeight: '600', color: TEXT },

  // Revenue by camp
  revByCampLabel: { fontSize: 13, fontWeight: '800', color: TEXT, letterSpacing: 0.5, marginBottom: 14 },
  campName:       { fontSize: 14, fontWeight: '600', color: TEXT },
  campAmount:     { fontSize: 14, fontWeight: '700' },
  progressTrack:  { height: 6, backgroundColor: BORDER, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  progressFill:   { height: 6, backgroundColor: TEAL, borderRadius: 3 },

  // Orders
  filterRow:            { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterPill:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
  filterPillActive:     { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.12)' },
  filterPillText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  filterPillTextActive: { color: TEAL, fontWeight: '700' },
  orderRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: CARD, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  orderParent: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 3 },
  orderMeta:   { fontSize: 12, color: MUTED },
  orderBadge:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  orderAmount: { fontSize: 16, fontWeight: '800', color: TEXT },

  // Reports
  reportTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  rangeRow:     { flexDirection: 'row', gap: 6 },
  rangePill:           { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
  rangePillActive:     { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.12)' },
  rangePillText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  rangePillTextActive: { color: TEAL, fontWeight: '700' },
  exportBtn:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: BORDER },
  exportText:   { fontSize: 12, fontWeight: '600', color: MUTED },

  chartCard:     { backgroundColor: CARD, marginHorizontal: 16, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 12 },
  chartLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 4 },
  barWrapper:    { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar:           { width: '100%', backgroundColor: TEAL, borderRadius: 3, opacity: 0.9 },
  chartAxisRow:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  chartAxisLabel: { fontSize: 11, color: MUTED },

  reportStats:     { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 12 },
  reportStatCard:  { flex: 1, backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  reportStatLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 6 },
  reportStatValue: { fontSize: 18, fontWeight: '800' },

  // Taxes
  infoBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)',
  },
  infoBannerText: { flex: 1, fontSize: 13, color: TEXT, lineHeight: 18 },
  fieldLabel:     { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 10 },
  regionRow:      { flexDirection: 'row', gap: 10 },
  regionBtn:      { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  regionBtnActive:{ borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.12)' },
  regionBtnText:  { fontSize: 13, fontWeight: '600', color: TEXT },
  rateInput: {
    backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 12, color: TEXT, fontSize: 16, fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  toggleRowText: { fontSize: 14, color: TEXT },
  saveBtn:     { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },

  // Payouts
  payoutAvailCard: {
    marginHorizontal: 16, borderRadius: 14, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,196,180,0.2)',
  },
  payoutAvailLabel:  { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 8 },
  requestPayoutBtn:  { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  requestPayoutText: { fontSize: 15, fontWeight: '800', color: TEXT },
  payoutRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: CARD, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: BORDER,
  },
  payoutAmount: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 4 },
  payoutDate:   { fontSize: 13, color: MUTED },
  payoutBadge:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  payoutBadgePaid:    { backgroundColor: 'rgba(0,196,180,0.12)', borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)' },
  payoutBadgePending: { backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  payoutBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Coupons / empty state
  emptyState:     { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 15, color: MUTED },
});
