import { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useWarriorStore } from '@/lib/store';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { createCrew } from '@/lib/crew';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

export default function CreateCrewModal() {
  const { warrior } = useWarriorStore();
  const { isShieldmaiden } = useWarriorProfile();
  const [crewName, setCrewName] = useState('');
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  async function handleCreate() {
    if (!crewName.trim()) {
      Alert.alert('Name required', 'Give your crew a name before forging.');
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const { crew, error } = await createCrew(
      crewName.trim(),
      warrior?.name ?? 'Warrior',
      warrior?.total_xp ?? 0,
      warrior?.streak_days ?? 0,
      isShieldmaiden,
    );

    setLoading(false);

    if (error) {
      Alert.alert('Failed to forge crew', error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });

  const CREW_NAME_SUGGESTIONS = [
    'Sons of Odin', 'Freya\'s Guard', 'Iron Ravens',
    'The Berserkers', 'Valhalla Bound', 'Shield Wall',
  ];

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0E0A14', '#050508']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.topGlow, { opacity: glowOpacity, backgroundColor: accentColor }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.eyebrow, { color: accentColor }]}>FORGE A CREW</Text>
                <Text style={styles.title}>NAME YOUR{'\n'}RAID PARTY</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.desc}>
              Your crew name is how warriors will know you. Choose something worthy of the gods.
            </Text>

            {/* Name input */}
            <View style={[styles.inputCard, { borderColor: crewName ? `${accentColor}40` : 'rgba(255,255,255,0.08)' }]}>
              <LinearGradient
                colors={crewName ? [`${accentColor}08`, 'transparent'] : ['rgba(255,255,255,0.02)', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              {crewName.length > 0 && (
                <LinearGradient
                  colors={['transparent', accentColor, 'transparent']}
                  style={styles.inputTopLine}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              )}
              <TextInput
                style={[styles.input, { color: Colors.text }]}
                value={crewName}
                onChangeText={setCrewName}
                placeholder="Enter crew name..."
                placeholderTextColor={Colors.textDim}
                maxLength={24}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Text style={[styles.charCount, { color: crewName.length > 20 ? Colors.blood : Colors.textDim }]}>
                {crewName.length}/24
              </Text>
            </View>

            {/* Suggestions */}
            <Text style={styles.suggestionsLabel}>NEED INSPIRATION?</Text>
            <View style={styles.suggestions}>
              {CREW_NAME_SUGGESTIONS.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.suggestionChip, { borderColor: `${accentColor}20` }]}
                  onPress={() => {
                    setCrewName(name);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.75}
                >
                  <LinearGradient
                    colors={[`${accentColor}06`, 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={[styles.suggestionText, { color: accentColor }]}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* What happens next */}
            <View style={[styles.infoCard, { borderColor: `${accentColor}15` }]}>
              <LinearGradient
                colors={[`${accentColor}06`, 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.infoTitle, { color: accentColor }]}>ᚲ  What happens next</Text>
              <Text style={styles.infoBody}>
                You'll receive a 6-character crew code. Share it with up to 9 warriors to join your raid party. As leader, you can disband the crew at any time.
              </Text>
            </View>

            {/* Forge button */}
            <TouchableOpacity
              style={[styles.forgeBtn, { borderColor: `${accentColor}40`, opacity: loading ? 0.7 : 1 }]}
              onPress={handleCreate}
              disabled={loading || !crewName.trim()}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={crewName.trim()
                  ? [`${accentColor}CC`, accentColor, `${accentColor}DD`]
                  : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
              <Text style={[styles.forgeBtnText, {
                color: crewName.trim() ? Colors.void : Colors.textDim,
              }]}>
                {loading ? 'FORGING...' : 'FORGE THE CREW  →'}
              </Text>
            </TouchableOpacity>

          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: 16,
  },

  topGlow: {
    position: 'absolute',
    top: -80, left: '10%',
    width: '80%', height: 280,
    borderRadius: 999,
    transform: [{ scaleX: 1.3 }, { scaleY: 0.4 }],
    pointerEvents: 'none',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    color: Colors.text,
    letterSpacing: 1,
    lineHeight: 32,
  },
  closeBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  closeBtnText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  desc: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  inputCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
  },
  inputTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.heading,
    fontSize: 20,
    letterSpacing: 0.5,
    paddingVertical: 16,
  },
  charCount: {
    fontFamily: Fonts.body,
    fontSize: 10,
    letterSpacing: 1,
  },

  suggestionsLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: -8,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  suggestionText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    letterSpacing: 0.5,
  },

  infoCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.6)',
    gap: 6,
  },
  infoTitle: {
    fontFamily: Fonts.subheading,
    fontSize: 12,
    letterSpacing: 1,
  },
  infoBody: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },

  forgeBtn: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: Spacing.md,
  },
  forgeBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    letterSpacing: 2,
  },
});