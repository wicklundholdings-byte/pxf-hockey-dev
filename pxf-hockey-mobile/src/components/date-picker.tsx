import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';

const TEAL   = '#00C4B4';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const CARD   = '#161B22';
const BORDER = '#21262D';

const DAY_HDRS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type Props = {
  value: string | null;          // 'YYYY-MM-DD' or null/''
  onChange: (v: string) => void; // returns 'YYYY-MM-DD', or '' when cleared
  placeholder?: string;
};

function fmtDisplay(d: string | null) {
  if (!d) return null;
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function DatePicker({ value, onChange, placeholder = 'Select date' }: Props) {
  const [open, setOpen]   = useState(false);
  const [month, setMonth] = useState<Date>(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const y           = month.getFullYear();
  const m           = month.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstDay    = new Date(y, m, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const today     = todayStr();
  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const displayStr = fmtDisplay(value || null);

  function toggle() {
    if (!open && value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) setMonth(d);
    }
    setOpen(o => !o);
  }

  function prevMonth() {
    setMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
  }
  function nextMonth() {
    setMonth(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
  }
  function selectDay(day: number) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setOpen(false);
  }

  return (
    <View>
      {/* Trigger button */}
      <TouchableOpacity style={styles.btn} onPress={toggle} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={16} color={value ? TEAL : MUTED} />
        <ThemedText style={[styles.btnText, !value && styles.btnPlaceholder]} numberOfLines={1}>
          {displayStr ?? placeholder}
        </ThemedText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={MUTED} />
      </TouchableOpacity>

      {/* Inline calendar */}
      {open && (
        <View style={styles.cal}>
          {/* Month nav */}
          <View style={styles.calNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={18} color={TEXT} />
            </TouchableOpacity>
            <ThemedText style={styles.calMonth}>{monthLabel}</ThemedText>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={18} color={TEXT} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.dayHdrRow}>
            {DAY_HDRS.map(d => (
              <ThemedText key={d} style={styles.dayHdr}>{d}</ThemedText>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={styles.cell} />;
              const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSel   = value === dateStr;
              const isToday = dateStr === today;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.cell, isSel && styles.cellSel, isToday && !isSel && styles.cellToday]}
                  onPress={() => selectDay(day)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={[
                    styles.cellTxt,
                    isSel    && styles.cellTxtSel,
                    isToday && !isSel && styles.cellTxtToday,
                  ]}>
                    {day}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Clear */}
          {value ? (
            <TouchableOpacity onPress={() => { onChange(''); setOpen(false); }} style={styles.clearRow}>
              <ThemedText style={styles.clearTxt}>Clear date</ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

const CELL_SIZE = 38;

const styles = StyleSheet.create({
  // Trigger
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0D1117', borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  btnText:        { flex: 1, fontSize: 15, color: TEXT, fontWeight: '500' },
  btnPlaceholder: { color: MUTED, fontWeight: '400' },

  // Calendar container
  cal: {
    marginTop: 4, backgroundColor: CARD,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 10, paddingVertical: 12,
  },

  // Month navigation
  calNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn:   { padding: 6 },
  calMonth: { fontSize: 15, fontWeight: '700', color: TEXT },

  // Day headers
  dayHdrRow: { flexDirection: 'row', marginBottom: 4 },
  dayHdr:    { width: CELL_SIZE + 2, textAlign: 'center', fontSize: 11, fontWeight: '700', color: MUTED },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: CELL_SIZE + 2, height: CELL_SIZE,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, marginBottom: 2,
  },
  cellSel:   { backgroundColor: TEAL },
  cellToday: { borderWidth: 1, borderColor: TEAL },
  cellTxt:       { fontSize: 14, color: TEXT },
  cellTxtSel:    { color: '#000', fontWeight: '700' },
  cellTxtToday:  { color: TEAL, fontWeight: '700' },

  // Clear
  clearRow: { alignItems: 'center', paddingTop: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: BORDER },
  clearTxt: { fontSize: 13, color: MUTED, fontWeight: '600' },
});
