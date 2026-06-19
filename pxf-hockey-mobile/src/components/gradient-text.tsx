import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextStyle } from 'react-native';

type Props = {
  style?: TextStyle | TextStyle[];
  colors: string[];
  children: string;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

export function GradientText({
  style,
  colors,
  children,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
}: Props) {
  return (
    <MaskedView maskElement={<Text style={style}>{children}</Text>}>
      <LinearGradient colors={colors} start={start} end={end}>
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
