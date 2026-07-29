import { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWarriorProfile } from '@/lib/useWarriorProfile';
import { Colors, Fonts, Spacing, Radii } from '@/constants/theme';

const { width } = Dimensions.get('window');

const RUNES = [
  { rune: 'ᚠ', name: 'Fehu', meaning: 'Wealth & Abundance' },
  { rune: 'ᚢ', name: 'Uruz', meaning: 'Strength & Power' },
  { rune: 'ᚦ', name: 'Thurisaz', meaning: 'Thor & Force' },
  { rune: 'ᚨ', name: 'Ansuz', meaning: 'Wisdom & Odin' },
  { rune: 'ᚱ', name: 'Raidho', meaning: 'Journey & Motion' },
  { rune: 'ᚲ', name: 'Kenaz', meaning: 'Fire & Knowledge' },
  { rune: 'ᚷ', name: 'Gebo', meaning: 'Gift & Honor' },
  { rune: 'ᚹ', name: 'Wunjo', meaning: 'Joy & Victory' },
  { rune: 'ᚺ', name: 'Hagalaz', meaning: 'Hail & Disruption' },
  { rune: 'ᚾ', name: 'Nauthiz', meaning: 'Need & Survival' },
  { rune: 'ᛁ', name: 'Isa', meaning: 'Ice & Stillness' },
  { rune: 'ᛃ', name: 'Jera', meaning: 'Harvest & Cycle' },
  { rune: 'ᛇ', name: 'Eihwaz', meaning: 'Yew & Endurance' },
  { rune: 'ᛈ', name: 'Perthro', meaning: 'Fate & Mystery' },
  { rune: 'ᛉ', name: 'Algiz', meaning: 'Protection & Elk' },
  { rune: 'ᛋ', name: 'Sowilo', meaning: 'Sun & Success' },
  { rune: 'ᛏ', name: 'Tiwaz', meaning: 'Tyr & Justice' },
  { rune: 'ᛒ', name: 'Berkano', meaning: 'Growth & Rebirth' },
  { rune: 'ᛖ', name: 'Ehwaz', meaning: 'Horse & Progress' },
  { rune: 'ᛗ', name: 'Mannaz', meaning: 'Humanity & Self' },
  { rune: 'ᛚ', name: 'Laguz', meaning: 'Water & Flow' },
  { rune: 'ᛜ', name: 'Ingwaz', meaning: 'Freyr & Fertility' },
  { rune: 'ᛞ', name: 'Dagaz', meaning: 'Dawn & Breakthrough' },
  { rune: 'ᛟ', name: 'Othala', meaning: 'Home & Legacy' },
];

const CARD_GAP = 8;
const CARDS_PER_ROW = 4;
const CARD_WIDTH = (width - (Spacing.lg * 2) - (CARD_GAP * (CARDS_PER_ROW - 1))) / CARDS_PER_ROW;

export default function CharacterCreatorModal() {
  const { isShieldmaiden } = useWarriorProfile();
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const accentColor = isShieldmaiden ? '#D4A8C4' : Colors.gold;

  useEffect(() => {
    AsyncStorage.getItem('valhalla_rune').then(val => {
      if (val) setSelected(val);
    });
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  async function handleSave() {
    if (!selected) return;
    await AsyncStorage.setItem('valhalla_rune', selected);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => router.back(), 700);
  }

  const selectedRune = RUNES.find(r => r.rune === selected);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0E0A14', '#050508']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.ScrollView
          style={[styles.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.eyebrow, { color: accentColor }]}>YOUR MARK</Text>
              <Text style={styles.title}>CHOOSE YOUR RUNE</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.desc}>
            The Elder Futhark. Each rune carries the power of the gods.
            Choose the one that speaks to your saga.
          </Text>

          {/* Selected rune preview */}
          {selected && (
            <View style={[styles.previewCard, { borderColor: `${accentColor}30` }]}>
              <LinearGradient
                colors={[`${accentColor}10`, 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['transparent', accentColor, 'transparent']}
                style={styles.previewLine}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={[styles.previewRune, { color: accentColor }]}>{selected}</Text>
              <View>
                <Text style={[styles.previewName, { color: accentColor }]}>{selectedRune?.name}</Text>
                <Text style={styles.previewMeaning}>{selectedRune?.meaning}</Text>
              </View>
            </View>
          )}

          {/* Rune grid */}
          <View style={styles.runeGrid}>
            {RUNES.map((r) => {
              const isSelected = selected === r.rune;
              return (
                <TouchableOpacity
                  key={r.rune}
                  style={[
                    styles.runeCard,
                    isSelected && {
                      borderColor: `${accentColor}60`,
                      backgroundColor: `${accentColor}12`,
                    },
                  ]}
                  onPress={() => {
                    setSelected(r.rune);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.75}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={['transparent', accentColor, 'transparent']}
                      style={styles.runeCardTopLine}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  )}
                  <Text style={[
                    styles.runeChar,
                    { color: isSelected ? accentColor : Colors.textMuted },
                  ]}>
                    {r.rune}
                  </Text>
                  <Text style={[
                    styles.runeName,
                    isSelected && { color: accentColor },
                  ]}>
                    {r.name}
                  </Text>
                  <Text style={styles.runeMeaning}>{r.meaning}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { borderColor: `${accentColor}40` },
              !selected && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!selected}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={selected
                ? [`${accentColor}20`, `${accentColor}08`]
                : ['rgba(255,255,255,0.04)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={selected
                ? ['transparent', accentColor, 'transparent']
                : ['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
              style={styles.saveBtnLine}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={[
              styles.saveBtnText,
              { color: saved ? '#4CAF50' : selected ? accentColor : Colors.textMuted },
            ]}>
              {saved ? '✓  RUNE CLAIMED' : selected ? `CLAIM ${selectedRune?.name?.toUpperCase()}  →` : 'CHOOSE YOUR RUNE'}
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomRunes}>
            <Text style={[styles.bottomRuneText, { color: `${accentColor}10` }]}>
              ᚠ  ᚢ  ᚦ  ᚨ  ᚱ  ᚲ  ᚷ  ᚹ
            </Text>
          </View>

        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050508' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 4,
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    color: Colors.text,
    letterSpacing: 1,
  },
  closeBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },

  previewCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  previewLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  previewRune: {
    fontSize: 52,
    fontFamily: 'System',
    lineHeight: 60,
  },
  previewName: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previewMeaning: {
    fontFamily: Fonts.proseItalic,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  runeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: CARD_GAP,
    marginBottom: Spacing.lg,
    justifyContent: 'space-between',
  },
  runeCard: {
    width: CARD_WIDTH,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,10,16,0.8)',
  },
  runeCardTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  runeChar: {
    fontSize: 28,
    fontFamily: 'System',
    lineHeight: 34,
  },
  runeName: {
    fontFamily: Fonts.body,
    fontSize: 9,
    letterSpacing: 0.5,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  runeMeaning: {
    fontFamily: Fonts.prose,
    fontSize: 8,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 11,
  },

  saveBtn: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    borderColor: 'rgba(255,255,255,0.06)',
  },
  saveBtnLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
  },
  saveBtnText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    letterSpacing: 2,
  },

  bottomRunes: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  bottomRuneText: {
    fontFamily: 'System',
    fontSize: 13,
    letterSpacing: 10,
  },
});