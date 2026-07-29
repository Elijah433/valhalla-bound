import { View } from 'react-native';
import Svg, {
  Path, Rect, Circle, Line, Polygon, G, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient,
} from 'react-native-svg';

interface WeaponSVGProps {
  weapon: string;
  color: string;
  size?: number;
  glowOpacity?: number;
}

export function WeaponSVG({ weapon, color, size = 120, glowOpacity = 0.4 }: WeaponSVGProps) {
  switch (weapon) {
    case 'mjolnir': return <Mjolnir color={color} size={size} glow={glowOpacity} />;
    case 'broadsword': return <Broadsword color={color} size={size} glow={glowOpacity} />;
    case 'axe': return <VikingAxe color={color} size={size} glow={glowOpacity} />;
    case 'spear': return <Gungnir color={color} size={size} glow={glowOpacity} />;
    default: return <Broadsword color={color} size={size} glow={glowOpacity} />;
  }
}

function Mjolnir({ color, size, glow }: { color: string; size: number; glow: number }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="mjGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={glow} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="mjMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset="50%" stopColor={color} stopOpacity={1} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.4} />
        </SvgLinearGradient>
      </Defs>

      {/* Glow */}
      <Circle cx="50" cy="45" r="42" fill="url(#mjGlow)" />

      {/* Handle */}
      <Rect x="44" y="60" width="12" height="28" rx="2" fill={color} opacity={0.9} />
      {/* Handle wrap lines */}
      <Rect x="44" y="65" width="12" height="2" rx="1" fill="#000" opacity={0.3} />
      <Rect x="44" y="71" width="12" height="2" rx="1" fill="#000" opacity={0.3} />
      <Rect x="44" y="77" width="12" height="2" rx="1" fill="#000" opacity={0.3} />
      {/* Handle bottom cap */}
      <Rect x="42" y="86" width="16" height="4" rx="2" fill={color} />

      {/* Neck */}
      <Rect x="44" y="54" width="12" height="8" rx="1" fill={color} />

      {/* Head — wide rectangular hammerhead */}
      <Rect x="22" y="20" width="56" height="36" rx="4" fill="url(#mjMetal)" />
      {/* Head highlight */}
      <Rect x="24" y="22" width="52" height="6" rx="2" fill="#FFF" opacity={0.15} />
      {/* Head engraving — rune lines */}
      <Rect x="32" y="30" width="36" height="2" rx="1" fill="#000" opacity={0.2} />
      <Rect x="36" y="36" width="28" height="2" rx="1" fill="#000" opacity={0.2} />
      {/* Face of hammer */}
      <Rect x="26" y="48" width="48" height="6" rx="2" fill={color} opacity={0.6} />
    </Svg>
  );
}

function Broadsword({ color, size, glow }: { color: string; size: number; glow: number }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="bsGlow" cx="50%" cy="30%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={glow} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="bsBlade" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.1} />
          <Stop offset="50%" stopColor={color} stopOpacity={1} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.3} />
        </SvgLinearGradient>
      </Defs>

      {/* Glow */}
      <Circle cx="50" cy="35" r="40" fill="url(#bsGlow)" />

      {/* Pommel */}
      <Circle cx="50" cy="92" r="6" fill={color} opacity={0.9} />
      <Circle cx="50" cy="92" r="3" fill="#FFF" opacity={0.2} />

      {/* Grip */}
      <Rect x="47" y="72" width="6" height="22" rx="2" fill={color} opacity={0.8} />
      <Rect x="47" y="76" width="6" height="2" rx="1" fill="#000" opacity={0.3} />
      <Rect x="47" y="81" width="6" height="2" rx="1" fill="#000" opacity={0.3} />
      <Rect x="47" y="86" width="6" height="2" rx="1" fill="#000" opacity={0.3} />

      {/* Crossguard */}
      <Rect x="30" y="68" width="40" height="6" rx="3" fill="url(#bsBlade)" />
      <Circle cx="30" cy="71" r="3" fill={color} />
      <Circle cx="70" cy="71" r="3" fill={color} />

      {/* Blade */}
      <Path
        d="M46 68 L44 20 L50 8 L56 20 L54 68 Z"
        fill="url(#bsBlade)"
      />
      {/* Blade fuller (center line) */}
      <Path
        d="M49 68 L49 18"
        stroke="#FFF"
        strokeWidth="0.8"
        opacity={0.25}
      />
      {/* Blade edge highlight */}
      <Path
        d="M44 20 L50 8"
        stroke="#FFF"
        strokeWidth="1"
        opacity={0.4}
      />
    </Svg>
  );
}

function VikingAxe({ color, size, glow }: { color: string; size: number; glow: number }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="axeGlow" cx="40%" cy="40%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={glow} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="axeMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset="50%" stopColor={color} stopOpacity={1} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.4} />
        </SvgLinearGradient>
      </Defs>

      {/* Glow */}
      <Circle cx="42" cy="45" r="40" fill="url(#axeGlow)" />

      {/* Handle — angled */}
      <Rect
        x="52" y="30"
        width="10" height="62"
        rx="4"
        fill={color}
        opacity={0.85}
        transform="rotate(8, 57, 61)"
      />
      {/* Handle wraps */}
      <Rect x="51" y="50" width="10" height="2" rx="1" fill="#000" opacity={0.3} transform="rotate(8, 56, 51)" />
      <Rect x="51" y="60" width="10" height="2" rx="1" fill="#000" opacity={0.3} transform="rotate(8, 56, 61)" />
      <Rect x="51" y="70" width="10" height="2" rx="1" fill="#000" opacity={0.3} transform="rotate(8, 56, 71)" />

      {/* Axe head — curved blade */}
      <Path
        d="M55 20 C55 20 20 18 16 35 C12 52 30 58 50 48 C40 42 34 32 42 24 C48 18 55 20 55 20 Z"
        fill="url(#axeMetal)"
      />
      {/* Blade edge highlight */}
      <Path
        d="M16 35 C12 52 30 58 50 48"
        stroke="#FFF"
        strokeWidth="1.5"
        fill="none"
        opacity={0.35}
      />
      {/* Top spike */}
      <Path
        d="M50 22 L55 12 L58 24 Z"
        fill={color}
        opacity={0.9}
      />
      {/* Axe eye (hole for handle) */}
      <Circle cx="50" cy="35" r="5" fill="#0C0A10" opacity={0.8} />
      <Circle cx="50" cy="35" r="3" fill={color} opacity={0.3} />
    </Svg>
  );
}

function Gungnir({ color, size, glow }: { color: string; size: number; glow: number }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="spGlow" cx="50%" cy="20%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={glow} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <SvgLinearGradient id="spBlade" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.2} />
          <Stop offset="50%" stopColor={color} stopOpacity={1} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.3} />
        </SvgLinearGradient>
      </Defs>

      {/* Glow at tip */}
      <Circle cx="50" cy="20" r="35" fill="url(#spGlow)" />

      {/* Shaft */}
      <Rect x="47" y="28" width="6" height="68" rx="2" fill={color} opacity={0.8} />
      {/* Shaft detail lines */}
      <Rect x="47" y="45" width="6" height="2" rx="1" fill="#000" opacity={0.25} />
      <Rect x="47" y="55" width="6" height="2" rx="1" fill="#000" opacity={0.25} />
      <Rect x="47" y="65" width="6" height="2" rx="1" fill="#000" opacity={0.25} />
      <Rect x="47" y="75" width="6" height="2" rx="1" fill="#000" opacity={0.25} />

      {/* Crosspiece */}
      <Path
        d="M35 32 C35 32 40 28 50 28 C60 28 65 32 65 32 L62 36 C62 36 58 30 50 30 C42 30 38 36 38 36 Z"
        fill="url(#spBlade)"
      />

      {/* Spearhead */}
      <Path
        d="M44 30 L42 14 L50 4 L58 14 L56 30 Z"
        fill="url(#spBlade)"
      />
      {/* Spearhead center ridge */}
      <Path
        d="M50 30 L50 6"
        stroke="#FFF"
        strokeWidth="1"
        opacity={0.3}
      />
      {/* Spearhead edge highlights */}
      <Path
        d="M42 14 L50 4"
        stroke="#FFF"
        strokeWidth="1.2"
        opacity={0.5}
      />
      <Path
        d="M58 14 L50 4"
        stroke="#FFF"
        strokeWidth="0.8"
        opacity={0.2}
      />

      {/* Butt spike */}
      <Path
        d="M47 94 L50 100 L53 94 Z"
        fill={color}
        opacity={0.7}
      />
    </Svg>
  );
}