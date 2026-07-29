import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router,useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useWarriorStore } from '@/lib/store';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const RECOVERY_TYPES = [
  { id: 'stretching', label: 'Stretching', rune: 'ᛁ', desc: 'Static or dynamic stretching' },
  { id: 'yoga', label: 'Yoga', rune: 'ᚹ', desc: 'Flow or restorative yoga' },
  { id: 'mobility', label: 'Mobility', rune: 'ᚷ', desc: 'Joint mobility and movement prep' },
  { id: 'foam_roll', label: 'Foam Roll', rune: 'ᚱ', desc: 'Soft tissue and fascia work' },
  { id: 'cold', label: 'Cold Exposure', rune: 'ᚨ', desc: 'Ice bath, cold shower, cryo' },
  { id: 'sauna', label: 'Sauna', rune: 'ᚦ', desc: 'Heat therapy and recovery' },
  { id: 'meditation', label: 'Meditation', rune: 'ᛟ', desc: 'Breathwork and mindfulness' },
  { id: 'sleep', label: 'Rest Day', rune: 'ᚠ', desc: 'Full rest and recovery' },
];

const FEEL_OPTIONS = [
  { id: 'destroyed', label: 'DESTROYED', desc: 'Total exhaustion', color: Colors.blood },
  { id: 'sore', label: 'SORE', desc: 'Moderate fatigue', color: '#E05020' },
  { id: 'tired', label: 'TIRED', desc: 'Mild fatigue', color: Colors.gold },
  { id: 'fresh', label: 'FRESH', desc: 'Ready to raid', color: Colors.ice },
];

const ACCENT = '#8B6FD4';

export default function RecoveryLogModal() {
  const { recordWorkout } = useWarriorStore();
const params = useLocalSearchParams<{ type: string; noXp: string }>();


  const [recoveryType, setRecoveryType] = useState('stretching');
  const [duration, setDuration] = useState('');
  const [feel, setFeel] = useState('sore');
  const [notes, setNotes] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  function handleLog() {
  if (!duration) return;
  if (params.noXp !== '1') {
    recordWorkout('recovery');
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  router.back();
}

  const selectedFeel = FEEL_OPTIONS.find(f => f.id === feel);
  const selectedType = RECOVERY_TYPES.find(t => t.id === recoveryType);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0C0810', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.kbAware}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.handle} />
              <View style={styles.headerRow}>
                <View>
                  <Text style={[styles.eyebrow, { color: ACCENT }]}>RECOVERY LOG</Text>
                  <Text style={styles.title}>SACRED REST</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Recovery type */}
              <Text style={styles.sectionLabel}>RITUAL TYPE</Text>
              <View style={styles.typeGrid}>
                {RECOVERY_TYPES.map((t) => {
                  const isSelected = recoveryType === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.typeCard,
                        isSelected && { borderColor: `${ACCENT}50`, backgroundColor: `${ACCENT}08` },
                      ]}
                      onPress={() => {
                        setRecoveryType(t.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      activeOpacity={0.75}
                    >
                      {isSelected && (
                        <LinearGradient
                          colors={[`${ACCENT}06`, 'transparent']}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      <Text style={[styles.typeRune, isSelected && { color: ACCENT }]}>
                        {t.rune}
                      </Text>
                      <Text style={[styles.typeLabel, isSelected && { color: ACCENT }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedType && (
                <Text style={styles.typeDesc}>{selectedType.desc}</Text>
              )}

              {/* Duration */}
              <Text style={styles.sectionLabel}>DURATION</Text>
              <View style={styles.durationCard}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.02)', 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <TextInput
                  style={[styles.durationInput, { color: ACCENT }]}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="0"
                  placeholderTextColor={Colors.textDim}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
                <View>
                  <Text style={styles.durationUnit}>minutes</Text>
                  <Text style={styles.durationSub}>of restoration</Text>
                </View>
              </View>

              {/* How you feel */}
              <Text style={styles.sectionLabel}>WARRIOR STATUS</Text>
              <Text style={styles.sectionSub}>How does your body feel going in?</Text>
              <View style={styles.feelGrid}>
                {FEEL_OPTIONS.map((f) => {
                  const isSelected = feel === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[
                        styles.feelCard,
                        isSelected && { borderColor: `${f.color}40`, backgroundColor: `${f.color}08` },
                      ]}
                      onPress={() => {
                        setFeel(f.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      activeOpacity={0.75}
                    >
                      {isSelected && (
                        <LinearGradient
                          colors={[`${f.color}06`, 'transparent']}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      <Text style={[styles.feelLabel, isSelected && { color: f.color }]}>
                        {f.label}
                      </Text>
                      <Text style={styles.feelDesc}>{f.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Notes */}
              <Text style={styles.sectionLabel}>WAR NOTES</Text>
              <View style={styles.notesWrap}>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="What did your body need today?"
                  placeholderTextColor={Colors.textDim}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Summary */}
              {duration ? (
                <View style={styles.summaryCard}>
                  <LinearGradient
                    colors={[`${ACCENT}06`, 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={['transparent', ACCENT, 'transparent']}
                    style={styles.summaryLine}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                  <Text style={styles.summaryTitle}>RITUAL SUMMARY</Text>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryVal, { color: ACCENT }]}>{duration}</Text>
                      <Text style={styles.summaryItemLabel}>MINUTES</Text>
                    </View>
                    <View style={styles.summaryItem}>
                    <Text style={[styles.summaryVal, { color: Colors.gold }]}>
                        {params.noXp === '1' ? '+0' : '+80'}
                    </Text>
            
                      <Text style={styles.summaryItemLabel}>VALOR</Text>
                    </View>
                    {selectedFeel && (
                      <View style={styles.summaryItem}>
                        <Text style={[styles.summaryVal, { color: selectedFeel.color, fontSize: 18 }]}>
                          {selectedFeel.label}
                        </Text>
                        <Text style={styles.summaryItemLabel}>STATUS</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.summaryDesc, { color: ACCENT }]}>
                    {selectedType?.label} — {selectedType?.desc}
                  </Text>
                </View>
              ) : null}

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Log button */}
            <TouchableOpacity
              style={[styles.logBtn, !duration && styles.logBtnDisabled]}
              onPress={handleLog}
              disabled={!duration}
              activeOpacity={0.85}
            >
              {duration ? (
                <LinearGradient
                  colors={[Colors.goldDark, Colors.gold]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              ) : null}
              <Text style={[styles.logBtnText, !duration && styles.logBtnTextDisabled]}>
                {duration ? 'COMPLETE THE RITUAL →' : 'ENTER DURATION TO LOG'}
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
  kbAware: { flex: 1 },
  container: { flex: 1, paddingHorizontal: Spacing.lg },

  header: { paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  handle: {
    width: 40, height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  headerRow: {
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
  },
  closeBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textMuted,
  },

  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.textMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionSub: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textDim,
    fontStyle: 'italic',
    marginBottom: 10,
    marginTop: -4,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeCard: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(12,10,16,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  typeRune: {
    fontSize: 18,
    color: Colors.textMuted,
    fontFamily: 'System',
  },
  typeLabel: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 0.5,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  typeDesc: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    color: Colors.textDim,
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
  },

  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
    marginBottom: Spacing.lg,
  },
  durationInput: {
    fontFamily: Fonts.heading,
    fontSize: 52,
    lineHeight: 56,
    minWidth: 80,
  },
  durationUnit: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    color: Colors.textMuted,
  },
  durationSub: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textDim,
  },

  feelGrid: {
    gap: 8,
    marginBottom: Spacing.lg,
  },
  feelCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: Spacing.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  feelLabel: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  feelDesc: {
    fontFamily: Fonts.prose,
    fontSize: 12,
    color: Colors.textDim,
  },

  notesWrap: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  notesInput: {
    fontFamily: Fonts.prose,
    fontSize: 14,
    color: Colors.text,
    minHeight: 70,
    textAlignVertical: 'top',
  },

  summaryCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
    gap: 10,
    marginBottom: Spacing.md,
  },
  summaryLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  summaryTitle: {
    fontFamily: Fonts.body,
    fontSize: 8,
    letterSpacing: 3,
    color: Colors.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-end',
  },
  summaryItem: { gap: 2 },
  summaryVal: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    lineHeight: 28,
  },
  summaryItemLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 2,
    color: Colors.textMuted,
  },
  summaryDesc: {
    fontFamily: Fonts.proseItalic,
    fontSize: 12,
    fontStyle: 'italic',
  },

  logBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  logBtnDisabled: {
    borderColor: 'rgba(255,255,255,0.06)',
  },
  logBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: Colors.void,
    letterSpacing: 2,
  },
  logBtnTextDisabled: {
    color: Colors.textMuted,
  },
});