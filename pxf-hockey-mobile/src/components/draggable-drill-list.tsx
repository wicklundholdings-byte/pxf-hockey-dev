import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';

const TEAL = '#00C4B4';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#8B949E';
const CARD = '#161B22';
const BORDER = '#21262D';
const RED = '#EF4444';

const ITEM_HEIGHT = 104;  // approximate card height + margin
const TRASH_WIDTH = 72;   // width of revealed trash area

type DrillItem = {
  id: string;
  sort_order: number;
  drill: {
    id: string;
    title: string;
    difficulty_level: string;
    age_group: string;
    duration_minutes: number;
    equipment_needed: string[] | null;
    category: { title: string } | null;
  };
};

type Props = {
  drills: DrillItem[];
  onReorder: (newDrills: DrillItem[]) => void;
  onRemove: (sessionDrillId: string) => void;
  onScrollEnabled: (enabled: boolean) => void;
  toArr: (v: any) => string[];
};

export function DraggableDrillList({ drills, onReorder, onRemove, onScrollEnabled, toArr }: Props) {
  const count = drills.length;
  const translations = useSharedValue<number[]>(new Array(count).fill(0));
  const activeIndex = useSharedValue(-1);
  const targetIndex = useSharedValue(-1);

  const handleReorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...drills];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  return (
    <View>
      {drills.map((item, index) => (
        <DraggableItem
          key={item.id}
          item={item}
          index={index}
          count={count}
          translations={translations}
          activeIndex={activeIndex}
          targetIndex={targetIndex}
          onReorder={handleReorder}
          onRemove={onRemove}
          onScrollEnabled={onScrollEnabled}
          toArr={toArr}
        />
      ))}
    </View>
  );
}

type ItemProps = {
  item: DrillItem;
  index: number;
  count: number;
  translations: ReturnType<typeof useSharedValue<number[]>>;
  activeIndex: ReturnType<typeof useSharedValue<number>>;
  targetIndex: ReturnType<typeof useSharedValue<number>>;
  onReorder: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onScrollEnabled: (enabled: boolean) => void;
  toArr: (v: any) => string[];
};

function DraggableItem({
  item, index, count,
  translations, activeIndex, targetIndex,
  onReorder, onRemove, onScrollEnabled, toArr,
}: ItemProps) {
  // Horizontal swipe state
  const swipeX = useSharedValue(0);
  const startSwipeX = useSharedValue(0);

  // Outer wrapper: moves vertically during drag
  const outerStyle = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index;
    const ty = translations.value[index] ?? 0;
    return {
      transform: [{ translateY: isActive ? ty : withSpring(ty, { damping: 20, stiffness: 200 }) }],
      zIndex: isActive ? 100 : 1,
      shadowColor: '#000',
      shadowOpacity: isActive ? 0.4 : 0,
      shadowRadius: isActive ? 10 : 0,
      shadowOffset: { width: 0, height: isActive ? 6 : 0 },
      elevation: isActive ? 8 : 0,
    };
  });

  // Inner card: slides left on swipe
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  // Drag handle dims while dragging
  const handleStyle = useAnimatedStyle(() => ({
    opacity: activeIndex.value === index ? 0.4 : 1,
  }));

  // Trash area fades in as card slides left
  const trashStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, -swipeX.value / 30),
    transform: [{ scale: swipeX.value < -20 ? withSpring(1) : withSpring(0.8) }],
  }));

  // Swipe-to-delete gesture (horizontal, on the card)
  const swipeGesture = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-10, 10])
      .failOffsetY([-12, 12])
      .onBegin(() => {
        'worklet';
        startSwipeX.value = swipeX.value;
      })
      .onUpdate((e) => {
        'worklet';
        swipeX.value = Math.max(-TRASH_WIDTH, Math.min(0, startSwipeX.value + e.translationX));
      })
      .onEnd(() => {
        'worklet';
        if (swipeX.value < -(TRASH_WIDTH / 2)) {
          swipeX.value = withSpring(-TRASH_WIDTH, { damping: 20, stiffness: 200 });
        } else {
          swipeX.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
      }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  // Long-press drag gesture (vertical, on the handle)
  const dragGesture = useMemo(() =>
    Gesture.Pan()
      .activateAfterLongPress(150)
      .onStart(() => {
        'worklet';
        // Close any open swipe when drag starts
        swipeX.value = withSpring(0);
        activeIndex.value = index;
        targetIndex.value = index;
        translations.value = new Array(count).fill(0);
        runOnJS(onScrollEnabled)(false);
      })
      .onUpdate((e) => {
        'worklet';
        const dragY = e.translationY;
        const to = Math.max(0, Math.min(count - 1, Math.round(index + dragY / ITEM_HEIGHT)));
        targetIndex.value = to;

        const next = new Array(count).fill(0);
        next[index] = dragY;
        if (to < index) {
          for (let i = to; i < index; i++) next[i] = ITEM_HEIGHT;
        } else if (to > index) {
          for (let i = index + 1; i <= to; i++) next[i] = -ITEM_HEIGHT;
        }
        translations.value = next;
      })
      .onEnd(() => {
        'worklet';
        const from = index;
        const to = targetIndex.value;
        translations.value = new Array(count).fill(0);
        activeIndex.value = -1;
        runOnJS(onScrollEnabled)(true);
        runOnJS(onReorder)(from, to);
      })
      .onFinalize(() => {
        'worklet';
        translations.value = new Array(count).fill(0);
        activeIndex.value = -1;
        runOnJS(onScrollEnabled)(true);
      }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [index, count]);

  const handleRemove = () => {
    swipeX.value = withSpring(0);
    onRemove(item.id);
  };

  const closeSwipe = () => {
    if (swipeX.value !== 0) {
      swipeX.value = withSpring(0);
    }
  };

  const equipment = toArr(item.drill?.equipment_needed);

  return (
    <Animated.View style={[styles.outer, outerStyle]}>
      {/* Trash button — behind the card, revealed on swipe left */}
      <Animated.View style={[styles.trashContainer, trashStyle]}>
        <TouchableOpacity style={styles.trashBtn} onPress={handleRemove}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Swipeable card */}
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Number badge */}
          <View style={styles.drillNumber}>
            <ThemedText style={styles.drillNumberText}>{index + 1}</ThemedText>
          </View>

          {/* Drill info */}
          <View style={styles.drillInfo}>
            <ThemedText style={styles.drillCategory}>
              {item.drill?.category?.title?.toUpperCase() ?? 'DRILL'}
            </ThemedText>
            <ThemedText style={styles.drillTitle}>{item.drill?.title}</ThemedText>
            <ThemedText style={styles.drillMeta}>
              {item.drill?.difficulty_level} · {item.drill?.age_group}
              {item.drill?.duration_minutes ? ` · ${item.drill.duration_minutes} min` : ''}
            </ThemedText>
            {equipment.length > 0 && (
              <ThemedText style={styles.drillEquip}>{equipment.join(', ')}</ThemedText>
            )}
          </View>

          {/* Drag handle */}
          <GestureDetector gesture={dragGesture}>
            <Animated.View style={[styles.dragHandle, handleStyle]}>
              <Ionicons name="menu" size={20} color={TEXT_MUTED} />
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: 20,
    marginBottom: 10,
    position: 'relative',
  },

  // Trash revealed behind card
  trashContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: TRASH_WIDTH,
    backgroundColor: RED,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashBtn: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Swipeable card
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  drillNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#0D2A24', borderWidth: 1, borderColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  drillNumberText: { fontSize: 12, fontWeight: '800', color: TEAL },

  drillInfo: { flex: 1 },
  drillCategory: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 1, marginBottom: 3 },
  drillTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 4 },
  drillMeta: { fontSize: 11, color: TEXT_MUTED, marginBottom: 2 },
  drillEquip: { fontSize: 11, color: TEXT_MUTED },

  dragHandle: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
});
