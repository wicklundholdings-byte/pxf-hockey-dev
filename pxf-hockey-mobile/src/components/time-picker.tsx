import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';

const TEAL   = '#00C4B4';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const CARD   = '#161B22';
const BORDER = '#21262D';

const ITEM_H  = 44;   // height of each row
const VISIBLE = 5;    // rows visible at once (center row = selected)
const COL_H   = ITEM_H * VISIBLE; // 220

const HOURS   = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55'];

type Props = {
  value: string | null; // HH:MM 24h, or null
  onChange: (v: string | null) => void;
};

// ─── parse / format ──────────────────────────────────────────────────────────

function parse(v: string | null): { hIdx: number; mIdx: number; apIdx: number } {
  if (!v) return { hIdx: 8, mIdx: 0, apIdx: 0 }; // default 9:00 AM
  const [h, m] = v.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return { hIdx: 8, mIdx: 0, apIdx: 0 };
  const apIdx = h >= 12 ? 1 : 0;
  const h12   = h % 12 || 12;
  const hIdx  = HOURS.indexOf(String(h12));
  const mIdx  = MINUTES.indexOf(String(m).padStart(2, '0'));
  return {
    hIdx:  hIdx  < 0 ? 8 : hIdx,
    mIdx:  mIdx  < 0 ? 0 : mIdx,
    apIdx,
  };
}

function toHHMM(hIdx: number, mIdx: number, apIdx: number): string {
  let h = parseInt(HOURS[hIdx], 10) % 12;
  if (apIdx === 1) h += 12; // PM
  return `${String(h).padStart(2, '0')}:${MINUTES[mIdx]}`;
}

// ─── DrumCol — scrollable column ─────────────────────────────────────────────

function DrumCol({ items, initIdx, onSelect }: {
  items:    string[];
  initIdx:  number;
  onSelect: (idx: number) => void;
}) {
  const ref        = useRef<ScrollView>(null);
  const [sel, setSel] = useState(initIdx);

  // Scroll to initial position after layout
  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: initIdx * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  function snap(y: number) {
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_H)));
    setSel(idx);
    onSelect(idx);
    // Snap precisely in case of over-scroll edge
    ref.current?.scrollTo({ y: idx * ITEM_H, animated: false });
  }

  return (
    <View style={s.drumCol}>
      {/* Center highlight bar */}
      <View style={s.selBar} pointerEvents="none" />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        onMomentumScrollEnd={e => snap(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={e    => snap(e.nativeEvent.contentOffset.y)}
      >
        {items.map((item, i) => (
          <View key={i} style={s.drumItem}>
            <ThemedText style={[s.drumTxt, i === sel && s.drumTxtSel]}>
              {item}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── TimePicker ──────────────────────────────────────────────────────────────

export function TimePicker({ value, onChange }: Props) {
  const init = parse(value);

  // Refs track latest indices so DrumCol callbacks are always up-to-date
  const hRef  = useRef(init.hIdx);
  const mRef  = useRef(init.mIdx);
  const apRef = useRef(init.apIdx);

  const [localAp, setLocalAp] = useState(init.apIdx);

  function emit(hIdx: number, mIdx: number, apIdx: number) {
    onChange(toHHMM(hIdx, mIdx, apIdx));
  }

  return (
    <View style={s.wrap}>
      {/* Hour drum */}
      <DrumCol
        items={HOURS}
        initIdx={init.hIdx}
        onSelect={i => { hRef.current = i; emit(i, mRef.current, apRef.current); }}
      />

      <ThemedText style={s.sep}>:</ThemedText>

      {/* Minute drum */}
      <DrumCol
        items={MINUTES}
        initIdx={init.mIdx}
        onSelect={i => { mRef.current = i; emit(hRef.current, i, apRef.current); }}
      />

      {/* AM / PM toggle buttons */}
      <View style={s.ampmCol}>
        {(['AM', 'PM'] as const).map((ap, i) => (
          <TouchableOpacity
            key={ap}
            style={[s.ampmBtn, localAp === i && s.ampmBtnActive]}
            onPress={() => {
              setLocalAp(i);
              apRef.current = i;
              emit(hRef.current, mRef.current, i);
            }}
            activeOpacity={0.7}
          >
            <ThemedText style={[s.ampmTxt, localAp === i && s.ampmTxtActive]}>
              {ap}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Clear */}
      {value ? (
        <TouchableOpacity onPress={() => onChange(null)} style={s.clearBtn}>
          <Ionicons name="close-circle" size={20} color={MUTED} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    height: COL_H,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },

  // Drum column
  drumCol: {
    width: 52,
    height: COL_H,
    overflow: 'hidden',
    position: 'relative',
  },
  selBar: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: ITEM_H * 2,       // center row
    height: ITEM_H,
    backgroundColor: 'rgba(0,196,180,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,196,180,0.3)',
    zIndex: 1,
  },
  drumItem: {
    height: ITEM_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drumTxt: {
    fontSize: 17,
    fontWeight: '500',
    color: MUTED,
  },
  drumTxtSel: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT,
  },

  sep: {
    fontSize: 22,
    fontWeight: '700',
    color: MUTED,
    marginHorizontal: 2,
  },

  // AM/PM
  ampmCol: {
    marginLeft: 10,
    gap: 6,
  },
  ampmBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#0D1117',
  },
  ampmBtnActive: {
    borderColor: TEAL,
    backgroundColor: '#0D2A24',
  },
  ampmTxt:       { fontSize: 12, fontWeight: '700', color: MUTED },
  ampmTxtActive: { color: TEAL },

  // Clear button
  clearBtn: { marginLeft: 'auto' as any, padding: 8 },
});
