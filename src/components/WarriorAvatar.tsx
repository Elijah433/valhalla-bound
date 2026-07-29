import Svg, {
  Path, Circle, Ellipse, Rect, G,
} from 'react-native-svg';

export interface AvatarConfig {
  gender: 'warrior' | 'shieldmaiden';
  skinTone: string;
  hairStyle: number;
  hairColor: string;
  outfitColor: string;
}

interface WarriorAvatarProps {
  config: AvatarConfig;
  size?: number;
}

const SKIN_TONES = ['#FDDBB4', '#F5C28A', '#D4956A', '#B5722A', '#8B4513', '#4A2A10'];
const HAIR_COLORS = ['#1A0A00', '#3D2000', '#8B4513', '#C4862B', '#D4B89A', '#E8E0D0'];

export const DEFAULT_WARRIOR: AvatarConfig = {
  gender: 'warrior',
  skinTone: SKIN_TONES[0],
  hairStyle: 0,
  hairColor: HAIR_COLORS[0],
  outfitColor: '#C9A84C',
};

export const DEFAULT_SHIELDMAIDEN: AvatarConfig = {
  gender: 'shieldmaiden',
  skinTone: SKIN_TONES[0],
  hairStyle: 0,
  hairColor: HAIR_COLORS[0],
  outfitColor: '#D4A8C4',
};

export { SKIN_TONES, HAIR_COLORS };

const VW = 80;
const VH = 170;

export function WarriorAvatar({ config, size = 160 }: WarriorAvatarProps) {
  const w = size * (VW / VH);
  const h = size;
  return config.gender === 'shieldmaiden'
    ? <ShieldmaidenSVG config={config} w={w} h={h} />
    : <WarriorSVG config={config} w={w} h={h} />;
}

function darken(hex: string, amount = 20): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function browColor(hair: string): string {
  if (hair === '#E8E0D0' || hair === '#D4B89A') return '#6B4020';
  return darken(hair, 10);
}

// Head center: cx=40 cy=34, rx=20 ry=22
// Top of head: y=12. Hair cap starts at y=12.
// Hair behind starts at sides: x=20 or x=60, y=34

function WarriorSVG({ config, w, h }: { config: AvatarConfig; w: number; h: number }) {
  const { skinTone: skin, hairColor: hair, outfitColor: outfit, hairStyle } = config;
  const legColor = darken(outfit, 30);
  const brow = browColor(hair);

  return (
    <Svg width={w} height={h} viewBox="0 0 80 175">

      {/* ── HAIR BEHIND (long styles only) ── */}
      {hairStyle === 1 && (
        <G>
          <Path d="M21 34 C17 52 15 78 18 122" stroke={hair} strokeWidth="11" strokeLinecap="round" fill="none" opacity={0.9} />
          <Path d="M59 34 C63 52 65 78 62 122" stroke={hair} strokeWidth="11" strokeLinecap="round" fill="none" opacity={0.9} />
        </G>
      )}

      {/* ── NECK ── */}
      <Rect x="34" y="54" width="12" height="12" rx="4" fill={skin} />

      {/* ── HEAD ── */}
      <Ellipse cx="40" cy="34" rx="20" ry="22" fill={skin} />

      {/* ── HAIR FRONT ── */}
      {/* Style 0: Short cropped */}
      {hairStyle === 0 && (
        <Path d="M20 34 C20 14 25 10 40 10 C55 10 60 14 60 34 C59 20 55 13 40 13 C25 13 21 20 20 34 Z" fill={hair} />
      )}
      {/* Style 1: Long — same cap as short */}
      {hairStyle === 1 && (
        <Path d="M20 34 C20 14 25 10 40 10 C55 10 60 14 60 34 C59 20 55 13 40 13 C25 13 21 20 20 34 Z" fill={hair} />
      )}
      {/* Style 2: Mohawk */}
      {hairStyle === 2 && (
        <G>
          <Rect x="37" y="4" width="6" height="22" rx="3" fill={hair} />
          <Ellipse cx="40" cy="6" rx="5" ry="4" fill={hair} />
        </G>
      )}
      {/* Style 3: Shaved sides */}
      {hairStyle === 3 && (
        <Path d="M30 22 C32 12 36 8 40 8 C44 8 48 12 50 22 L50 36 C49 22 46 14 40 14 C34 14 31 22 30 36 Z" fill={hair} />
      )}
      {/* Style 4: Top knot */}
      {hairStyle === 4 && (
        <G>
          <Rect x="37" y="8" width="6" height="16" rx="2" fill={hair} />
          <Circle cx="40" cy="8" r="8" fill={hair} />
        </G>
      )}
      {/* Style 5: Bald stubble */}
      {hairStyle === 5 && (
        <Path d="M20 34 C20 14 25 10 40 10 C55 10 60 14 60 34" fill={hair} opacity={0.18} />
      )}

      {/* ── FACE ── */}
      <Path d="M29 27 Q32 25 35 27" stroke={brow} strokeWidth="1.3" fill="none" opacity={0.75} />
      <Path d="M45 27 Q48 25 51 27" stroke={brow} strokeWidth="1.3" fill="none" opacity={0.75} />
      <Ellipse cx="34" cy="33" rx="3" ry="3.5" fill="#1A0800" />
      <Ellipse cx="46" cy="33" rx="3" ry="3.5" fill="#1A0800" />
      <Circle cx="35" cy="32" r="1" fill="#FFF" opacity={0.65} />
      <Circle cx="47" cy="32" r="1" fill="#FFF" opacity={0.65} />
      <Path d="M39 37 L38 41 L42 41" stroke={skin} strokeWidth="1.2" fill="none" opacity={0.4} />
      <Path d="M35 46 Q40 50 45 46" stroke="#8B3A20" strokeWidth="1.5" fill="none" opacity={0.55} />

      {/* ── ARMS ── */}
      <Path d="M22 66 C17 66 12 71 11 83 C10 91 11 97 14 101 L18 100 C15 96 14 89 15 83 C16 74 19 69 23 69 Z" fill={skin} />
      <Path d="M58 66 C63 66 68 71 69 83 C70 91 69 97 66 101 L62 100 C65 96 66 89 65 83 C64 74 61 69 57 69 Z" fill={skin} />
      <Ellipse cx="13" cy="103" rx="5" ry="6" fill={skin} />
      <Ellipse cx="67" cy="103" rx="5" ry="6" fill={skin} />

      {/* ── TORSO ── */}
      <Rect x="22" y="64" width="36" height="38" rx="6" fill={outfit} />
      <Path d="M28 64 L28 84 L40 89 L52 84 L52 64" fill={outfit} opacity={0.35} />
      <Path d="M40 64 L40 88" stroke="#000" strokeWidth="0.8" opacity={0.1} />
      <Ellipse cx="22" cy="68" rx="7" ry="5" fill={outfit} opacity={0.9} />
      <Ellipse cx="58" cy="68" rx="7" ry="5" fill={outfit} opacity={0.9} />
      {/* Belt */}
      <Rect x="22" y="95" width="36" height="8" rx="2" fill={darken(outfit, 20)} />
      <Rect x="37" y="94" width="6" height="10" rx="1.5" fill="#C9A84C" />

      {/* ── LEGS ── */}
      <Rect x="23" y="101" width="15" height="26" rx="5" fill={outfit} opacity={0.9} />
      <Rect x="42" y="101" width="15" height="26" rx="5" fill={outfit} opacity={0.9} />
      <Rect x="23" y="125" width="15" height="26" rx="4" fill={legColor} />
      <Rect x="42" y="125" width="15" height="26" rx="4" fill={legColor} />
      <Rect x="21" y="149" width="19" height="14" rx="4" fill="#1A0E04" />
      <Rect x="40" y="149" width="19" height="14" rx="4" fill="#1A0E04" />
    </Svg>
  );
}

function ShieldmaidenSVG({ config, w, h }: { config: AvatarConfig; w: number; h: number }) {
  const { skinTone: skin, hairColor: hair, outfitColor: outfit, hairStyle } = config;
  const legDark = darken(outfit, 25);
  const brow = browColor(hair);

  return (
    <Svg width={w} height={h} viewBox="0 0 80 175">

      {/* ── HAIR BEHIND ── */}
      {/* Style 0: Long flowing */}
      {hairStyle === 0 && (
        <G>
          <Path d="M23 34 C19 52 17 78 20 124" stroke={hair} strokeWidth="14" strokeLinecap="round" fill="none" opacity={0.9} />
          <Path d="M57 34 C61 52 63 78 60 124" stroke={hair} strokeWidth="14" strokeLinecap="round" fill="none" opacity={0.9} />
        </G>
      )}
      {/* Style 1: Single braid down back */}
      {hairStyle === 1 && (
        <Path d="M37 56 C35 76 37 96 35 116 C37 121 43 121 45 116 C43 96 45 76 43 56 Z" fill={hair} />
      )}
      {/* Style 3: Twin braids */}
      {hairStyle === 3 && (
        <G>
          <Path d="M23 34 C20 52 19 72 21 94" stroke={hair} strokeWidth="10" strokeLinecap="round" fill="none" />
          <Path d="M57 34 C60 52 61 72 59 94" stroke={hair} strokeWidth="10" strokeLinecap="round" fill="none" />
          <Path d="M19 52 L25 56 M19 64 L25 68 M19 76 L25 80 M19 86 L25 90" stroke="#000" strokeWidth="0.8" opacity={0.15} />
          <Path d="M61 52 L55 56 M61 64 L55 68 M61 76 L55 80 M61 86 L55 90" stroke="#000" strokeWidth="0.8" opacity={0.15} />
        </G>
      )}
      {/* Style 4: Half up half down */}
      {hairStyle === 4 && (
        <G>
          <Path d="M23 34 C19 52 17 74 20 110" stroke={hair} strokeWidth="13" strokeLinecap="round" fill="none" opacity={0.85} />
          <Path d="M57 34 C61 52 63 74 60 110" stroke={hair} strokeWidth="13" strokeLinecap="round" fill="none" opacity={0.85} />
        </G>
      )}

      {/* ── NECK ── */}
      <Rect x="36" y="52" width="8" height="12" rx="4" fill={skin} />

      {/* ── HEAD ── */}
      <Ellipse cx="40" cy="33" rx="18" ry="21" fill={skin} />

      {/* ── HAIR FRONT ── */}
      {/* Styles with hair cap: 0,1,3,4,5 */}
      {(hairStyle === 0 || hairStyle === 1 || hairStyle === 3 || hairStyle === 4 || hairStyle === 5) && (
        <Path d="M22 33 C22 13 27 8 40 8 C53 8 58 13 58 33 C57 19 53 11 40 11 C27 11 23 19 22 33 Z" fill={hair} />
      )}
      {/* Style 2: High bun */}
      {hairStyle === 2 && (
        <G>
          <Path d="M22 33 C22 13 27 8 40 8 C53 8 58 13 58 33 C57 19 53 11 40 11 C27 11 23 19 22 33 Z" fill={hair} />
          <Circle cx="40" cy="8" r="10" fill={hair} />
          <Circle cx="40" cy="8" r="5" fill={darken(hair, 15)} opacity={0.5} />
        </G>
      )}
      {/* Half up crown detail */}
      {hairStyle === 4 && (
        <G>
          <Ellipse cx="40" cy="10" rx="9" ry="5" fill={hair} />
          <Path d="M33 12 C33 17 47 17 47 12" fill={hair} />
        </G>
      )}

      {/* ── FACE ── */}
      <Path d="M30 26 Q33 24 36 26" stroke={brow} strokeWidth="1" fill="none" opacity={0.65} />
      <Path d="M44 26 Q47 24 50 26" stroke={brow} strokeWidth="1" fill="none" opacity={0.65} />
      <Ellipse cx="33" cy="32" rx="3.5" ry="4" fill="#1A0800" />
      <Ellipse cx="47" cy="32" rx="3.5" ry="4" fill="#1A0800" />
      <Circle cx="34" cy="31" r="1.2" fill="#FFF" opacity={0.8} />
      <Circle cx="48" cy="31" r="1.2" fill="#FFF" opacity={0.8} />
      <Path d="M29 28 Q33 25 37 28" stroke="#1A0800" strokeWidth="1.2" fill="none" opacity={0.5} />
      <Path d="M43 28 Q47 25 51 28" stroke="#1A0800" strokeWidth="1.2" fill="none" opacity={0.5} />
      <Path d="M39 36 L38 40 L42 40" stroke={skin} strokeWidth="1" fill="none" opacity={0.3} />
      <Path d="M34 45 Q40 49 46 45" stroke="#C4607A" strokeWidth="2" fill="none" opacity={0.75} />
      <Ellipse cx="40" cy="46" rx="4.5" ry="1.5" fill="#C4607A" opacity={0.2} />
      <Ellipse cx="28" cy="39" rx="5.5" ry="3" fill="#E8A0A0" opacity={0.2} />
      <Ellipse cx="52" cy="39" rx="5.5" ry="3" fill="#E8A0A0" opacity={0.2} />

      {/* ── ARMS ── */}
      <Path d="M23 65 C18 65 13 70 12 82 C11 90 12 96 14 100 L18 99 C15 95 14 88 15 82 C16 73 19 68 24 68 Z" fill={skin} />
      <Path d="M57 65 C62 65 67 70 68 82 C69 90 68 96 66 100 L62 99 C65 95 66 88 65 82 C64 73 61 68 56 68 Z" fill={skin} />
      <Ellipse cx="13" cy="102" rx="4" ry="5" fill={skin} />
      <Ellipse cx="67" cy="102" rx="4" ry="5" fill={skin} />

      {/* ── TORSO hourglass ── */}
      <Path
        d="M24 62 C21 62 21 69 21 75 C21 81 23 85 23 90 C23 94 21 98 21 102 L59 102 C59 98 57 94 57 90 C57 85 59 81 59 75 C59 69 59 62 56 62 Z"
        fill={outfit}
      />
      <Path d="M30 62 Q40 68 50 62" fill="none" stroke="#FFF" strokeWidth="1" opacity={0.2} />
      {/* Belt */}
      <Rect x="26" y="91" width="28" height="8" rx="2" fill={darken(outfit, 20)} />
      <Rect x="37" y="90" width="6" height="10" rx="1.5" fill="#D4A8C4" />

      {/* ── LEGS ── */}
      <Rect x="24" y="100" width="13" height="27" rx="5" fill={outfit} opacity={0.9} />
      <Rect x="43" y="100" width="13" height="27" rx="5" fill={outfit} opacity={0.9} />
      <Rect x="24" y="125" width="13" height="26" rx="4" fill={legDark} />
      <Rect x="43" y="125" width="13" height="26" rx="4" fill={legDark} />
      <Rect x="22" y="149" width="17" height="14" rx="4" fill="#1A0810" />
      <Rect x="41" y="149" width="17" height="14" rx="4" fill="#1A0810" />
    </Svg>
  );
}