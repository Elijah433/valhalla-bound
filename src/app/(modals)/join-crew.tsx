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
import { joinCrew } from '@/lib/crew';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

export default function JoinCrewModal() {
  const { warrior } = useWarriorStore();
  const { isShieldmaiden } = useWarriorProfile();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;
  const codeReady = code.trim().length === 6;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  function handleCodeChange(text: string) {
    // Auto uppercase, strip spaces, max 6 chars
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(cleaned);
  }

  async function handleJoin() {
    if (!codeReady) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const { crew, error } = await joinCrew(
      code,
      warrior?.name ?? 'Warrior',
      warrior?.total_xp ?? 0,
      warrior?.streak_days ?? 0,
      isShieldmaiden,
    );

    setLoading(false);

    if (error) {
      Alert.alert('Could not join', error);
      return;
    }

    // Success animation
    setSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    setTimeout(() => router.back(), 1200);
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0E0A14', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.eyebrow, { color: accentColor }]}>ANSWER THE CALL</Text>
                <Text style={styles.title}>JOIN A{'\n'}CREW</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.desc}>
              Enter the 6-character code your crew leader shared with you.
            </Text>

            {/* Code input */}
            <View style={[styles.codeCard, {
              borderColor: success
                ? 'rgba(74,175,80,0.4)'
                : codeReady
                ? `${accentColor}40`
                : 'rgba(255,255,255,0.08)',
            }]}>
              <LinearGradient
                colors={success
                  ? ['rgba(74,175,80,0.08)', 'transparent']
                  : codeReady
                  ? [`${accentColor}08`, 'transparent']
                  : ['rgba(255,255,255,0.02)', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              {(codeReady || success) && (
                <LinearGradient
                  colors={['transparent', success ? '#4CAF50' : accentColor, 'transparent']}
                  style={styles.codeTopLine}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              )}

              {success ? (
                <Animated.View style={[styles.successWrap, { opacity: successAnim }]}>
                  <Text style={styles.successCheck}>✓</Text>
                  <Text style={styles.successText}>Crew joined!</Text>
                </Animated.View>
              ) : (
                <TextInput
                  style={[styles.codeInput, { color: codeReady ? accentColor : Colors.text }]}
                  value={code}
                  onChangeText={handleCodeChange}
                  placeholder="XXXXXX"
                  placeholderTextColor="rgba(255,255,255,0.12)"
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  keyboardType="default"
                />
              )}
            </View>

            {/* Code letter boxes */}
            <View style={styles.letterBoxes}>
              {Array.from({ length: 6 }).map((_, i) => {
                const char = code[i];
                const isActive = i === code.length;
                return (
                  <View key={i} style={[
                    styles.letterBox,
                    char && { borderColor: `${accentColor}50`, backgroundColor: `${accentColor}10` },
                    isActive && !char && { borderColor: `${accentColor}30` },
                    success && { borderColor: 'rgba(74,175,80,0.4)', backgroundColor: 'rgba(74,175,80,0.08)' },
                  ]}>
                    <Text style={[
                      styles.letterBoxChar,
                      { color: success ? '#4CAF50' : char ? accentColor : Colors.textDim },
                    ]}>
                      {char ?? '·'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* How to get a code */}
            <View style={[styles.infoCard, { borderColor: 'rgba(255,255,255,0.06)' }]}>
              <Text style={styles.infoEyebrow}>HOW TO GET A CODE</Text>
              {[
                'Ask your crew leader to share their invite code',
                'Codes are 6 characters — letters and numbers',
                'Each code is unique to one crew',
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <Text style={[styles.infoDot, { color: accentColor }]}>·</Text>
                  <Text style={styles.infoText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Join button */}
            <TouchableOpacity
              style={[
                styles.joinBtn,
                {
                  borderColor: codeReady ? `${accentColor}40` : 'rgba(255,255,255,0.06)',
                  opacity: loading ? 0.7 : 1,
                },
              ]}
              onPress={handleJoin}
              disabled={loading || !codeReady || success}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={codeReady
                  ? [`${accentColor}CC`, accentColor, `${accentColor}DD`]
                  : ['rgba(255,255,255,0.04)', 'transparent']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
              <Text style={[styles.joinBtnText, {
                color: codeReady ? Colors.void : Colors.textDim,
              }]}>
                {loading ? 'JOINING...' : success ? '✓  JOINED' : 'ANSWER THE CALL  →'}
              </Text>
            </TouchableOpacity>

            {/* Create instead */}
            <TouchableOpacity
              style={styles.createInstead}
              onPress={() => {
                router.back();
                setTimeout(() => router.push('/(modals)/create-crew' as any), 300);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.createInsteadText}>
                Want to lead instead? <Text style={{ color: accentColor }}>Create a crew →</Text>
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

  // Code input card
  codeCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.9)',
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  codeInput: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    letterSpacing: 12,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: Spacing.lg,
  },
  successWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successCheck: {
    fontSize: 28,
    color: '#4CAF50',
    fontFamily: 'System',
  },
  successText: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: '#4CAF50',
    letterSpacing: 1,
  },

  // Letter boxes
  letterBoxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: -8,
  },
  letterBox: {
    width: 42, height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(12,10,16,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBoxChar: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    lineHeight: 24,
  },

  // Info card
  infoCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.6)',
    gap: 8,
  },
  infoEyebrow: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 2.5,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoDot: {
    fontSize: 16,
    lineHeight: 18,
  },
  infoText: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },

  // Join button
  joinBtn: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: 'auto',
  },
  joinBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    letterSpacing: 2,
  },

  createInstead: {
    alignItems: 'center',
    paddingBottom: Spacing.md,
  },
  createInsteadText: {
    fontFamily: Fonts.prose,
    fontSize: 13,
    color: Colors.textMuted,
  },
});