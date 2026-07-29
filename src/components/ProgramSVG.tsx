import { Image, View, StyleSheet } from 'react-native';
import Svg, {
  Path, Rect, Circle, Line, Defs,
  RadialGradient, Stop, LinearGradient as SvgLinearGradient,
} from 'react-native-svg';

interface ProgramSVGProps {
  program: string;
  color: string;
  size?: number;
}

export function ProgramSVG({ program, color, size = 40 }: ProgramSVGProps) {
  switch (program) {
    case 'thor': return <ThorForge color={color} size={size} />;
    case 'odin': return <OdinEndurance color={color} size={size} />;
    case 'shieldmaiden': return <ShieldmaidenTone color={color} size={size} />;
    case 'ulfhednar': return <UlfhednarWolf color={color} size={size} />;
    default: return <ThorForge color={color} size={size} />;
  }
}

function ThorForge({ color, size }: { color: string; size: number }) {
  return (
    <View style={{
      width: size, height: size,
      borderRadius: size * 0.22,
      overflow: 'hidden',
      backgroundColor: '#0A0A0C',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="thorGlow1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="55" fill="url(#thorGlow1)" />
      </Svg>
      <Image
        source={require('@/assets/images/thorsForge.png')}
        style={{ width: size * 1.32, height: size * 1.32 }}
        resizeMode="cover"
      />
    </View>
  );
}

function OdinEndurance({ color, size }: { color: string; size: number }) {
  return (
    <View style={{
      width: size, height: size,
      borderRadius: size * 0.22,
      overflow: 'hidden',
      backgroundColor: '#0A0A0C',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="odinGlow1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="55" fill="url(#odinGlow1)" />
      </Svg>
      <Image
        source={require('@/assets/images/odingungir.png')}
        style={{ width: size * 1.32, height: size * 1.32 }}
        resizeMode="cover"
      />
    </View>
  );
}

function ShieldmaidenTone({ color, size }: { color: string; size: number }) {
  return (
    <View style={{
      width: size, height: size,
      borderRadius: size * 0.22,
      overflow: 'hidden',
      backgroundColor: '#0A0A0C',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="freyaGlow1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="55" fill="url(#freyaGlow1)" />
      </Svg>
      <Image
        source={require('@/assets/images/FREYA.png')}
        style={{ width: size * 1.32, height: size * 1.32 }}
        resizeMode="cover"
      />
    </View>
  );
}

// Ulfhednar's icon is a custom illustrated raster image (wolf-pelt warrior
// mask), not a hand-drawn vector path like the other three programs — so
// this renders an Image instead of an Svg. The source file has a plain
// white background (not transparent), which would show as a harsh white
// square against this app's dark theme. To fix that without needing a
// re-exported transparent PNG: the image is cover-cropped (filling its
// full container, cutting into the white margins rather than showing
// them) and clipped into a rounded shape with a dark backing card behind
// it, so only the wolf artwork itself reads, consistent with how the
// other programs' icon wrappers already look.
function UlfhednarWolf({ color, size }: { color: string; size: number }) {
  return (
    <View style={{
      width: size, height: size,
      borderRadius: size * 0.22,
      overflow: 'hidden',
      backgroundColor: '#0A0A0C',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="ulfGlow1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="55" fill="url(#ulfGlow1)" />
      </Svg>
      <Image
        source={require('@/assets/images/ULF-WARRIOR.png')}
        style={{ width: size * 1.32, height: size * 1.32 }}
        resizeMode="cover"
      />
    </View>
  );
}