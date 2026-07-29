import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Path, Ellipse, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

interface StreakFlameProps {
  streak: number;
  size?: number;
}

export function StreakFlame({ streak, size = 48 }: StreakFlameProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Flame intensity based on streak
  const intensity = streak >= 30 ? 4
    : streak >= 14 ? 3
    : streak >= 7 ? 2
    : streak >= 3 ? 1
    : 0;

  useEffect(() => {
    if (intensity === 0) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [intensity]);

  if (intensity === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Defs>
            <RadialGradient id="coldGlow" cx="50%" cy="60%" r="50%">
              <Stop offset="0%" stopColor="#A8C4D4" stopOpacity={0.15} />
              <Stop offset="100%" stopColor="#A8C4D4" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {/* Cold/unlit flame */}
          <Path
            d="M24 42 C16 42 10 36 10 28 C10 22 14 18 16 14 C17 20 20 22 20 22 C20 16 22 10 24 6 C26 10 28 16 28 22 C28 22 31 20 32 14 C34 18 38 22 38 28 C38 36 32 42 24 42 Z"
            fill="#1A2A3A"
            opacity={0.6}
          />
          <Ellipse cx="24" cy="38" rx="8" ry="3" fill="url(#coldGlow)" />
        </Svg>
      </View>
    );
  }

  // Colors per intensity
  const outerColor = intensity >= 4 ? '#FF2200' : intensity >= 3 ? '#FF4400' : intensity >= 2 ? '#FF6600' : '#FF8C00';
  const midColor = intensity >= 4 ? '#FF6600' : intensity >= 3 ? '#FF8C00' : intensity >= 2 ? '#FFA500' : '#FFB732';
  const innerColor = intensity >= 4 ? '#FFB700' : intensity >= 3 ? '#FFC800' : intensity >= 2 ? '#FFD700' : '#FFE066';
  const coreColor = '#FFFFFF';
  const glowColor = intensity >= 4 ? '#FF2200' : intensity >= 3 ? '#FF4400' : intensity >= 2 ? '#FF6600' : '#FF8C00';

  return (
    <Animated.View style={{
      width: size, height: size,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ scale: pulseAnim }],
    }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <RadialGradient id="flameGlow" cx="50%" cy="70%" r="60%">
            <Stop offset="0%" stopColor={glowColor} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={glowColor} stopOpacity={0} />
          </RadialGradient>
          <SvgLinearGradient id="flameBody" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor={outerColor} stopOpacity={1} />
            <Stop offset="40%" stopColor={midColor} stopOpacity={1} />
            <Stop offset="80%" stopColor={innerColor} stopOpacity={1} />
            <Stop offset="100%" stopColor={outerColor} stopOpacity={0.8} />
          </SvgLinearGradient>
          <SvgLinearGradient id="flameMid" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor={midColor} stopOpacity={1} />
            <Stop offset="60%" stopColor={innerColor} stopOpacity={1} />
            <Stop offset="100%" stopColor={midColor} stopOpacity={0.8} />
          </SvgLinearGradient>
          <SvgLinearGradient id="flameCore" x1="50%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor={innerColor} stopOpacity={1} />
            <Stop offset="100%" stopColor={coreColor} stopOpacity={0.9} />
          </SvgLinearGradient>
        </Defs>

        {/* Outer glow */}
        <Ellipse cx="24" cy="40" rx="14" ry="5" fill="url(#flameGlow)" />

        {/* Outer flame — widest */}
        <Path
          d="M24 44 C14 44 7 36 7 27 C7 20 11 15 14 10 C15 17 18 20 19 20 C18 13 21 7 24 3 C27 7 30 13 29 20 C30 20 33 17 34 10 C37 15 41 20 41 27 C41 36 34 44 24 44 Z"
          fill="url(#flameBody)"
          opacity={0.9}
        />

        {/* Mid flame */}
        <Path
          d="M24 42 C17 42 12 36 12 29 C12 24 15 20 17 16 C18 21 20 23 21 23 C20 18 22 13 24 9 C26 13 28 18 27 23 C28 23 30 21 31 16 C33 20 36 24 36 29 C36 36 31 42 24 42 Z"
          fill="url(#flameMid)"
          opacity={0.95}
        />

        {/* Inner flame */}
        <Path
          d="M24 40 C19 40 15 35 15 30 C15 26 17 23 19 20 C19 24 21 26 22 26 C21 22 23 18 24 15 C25 18 27 22 26 26 C27 26 29 24 29 20 C31 23 33 26 33 30 C33 35 29 40 24 40 Z"
          fill="url(#flameCore)"
          opacity={1}
        />

        {/* Core bright center */}
        <Path
          d="M24 37 C21 37 19 34 19 31 C19 28 21 26 22 24 C22 27 23 28 24 28 C25 28 26 27 26 24 C27 26 29 28 29 31 C29 34 27 37 24 37 Z"
          fill={coreColor}
          opacity={0.7}
        />

        {/* Extra flame tips for high intensity */}
        {intensity >= 3 && (
          <Path
            d="M18 18 C17 14 19 10 20 8 C20 12 21 15 20 18 Z"
            fill={outerColor}
            opacity={0.7}
          />
        )}
        {intensity >= 3 && (
          <Path
            d="M30 18 C31 14 29 10 28 8 C28 12 27 15 28 18 Z"
            fill={outerColor}
            opacity={0.7}
          />
        )}
        {intensity >= 4 && (
          <Path
            d="M24 6 C23 3 24 1 24 1 C24 1 25 3 24 6 Z"
            fill={midColor}
            opacity={0.8}
          />
        )}
      </Svg>
    </Animated.View>
  );
}