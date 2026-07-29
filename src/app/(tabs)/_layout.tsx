import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { BlurView } from 'expo-blur';

const thorHammer = require('@/assets/images/thor-hammer.png');
const drakkar = require('@/assets/images/drakkar.png');
const longhouse = require('@/assets/images/viking-longhouse.png');

function TabIcon({ icon, label, focused, image }: {
  icon?: string;
  label: string;
  focused: boolean;
  image?: any;
}) {
  return (
    <View style={styles.tabItem}>
      {image ? (
        <Image
          source={image}
          style={[styles.tabImage, focused && styles.tabImageActive]}
          resizeMode="contain"
        />
      ) : (
        <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
      )}
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView tint="dark" intensity={95} style={StyleSheet.absoluteFill} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon image={longhouse} label="HALL" focused={focused} />
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="trials"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="ᚦ" label="TRIALS" focused={focused} />
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="berserker"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon image={thorHammer} label="FORGE" focused={focused} />
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="mead-hall"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon image={drakkar} label="FEAST" focused={focused} />
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="ᛟ" label="PROFILE" focused={focused} />
          ),
          tabBarLabel: () => null,
        }}
      />

      {/* Hidden — accessible via router.push */}
      <Tabs.Screen name="crew" options={{ href: null }} />
      <Tabs.Screen name="sagas" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopColor: 'rgba(201,168,76,0.12)',
    borderTopWidth: 1,
    height: 82,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 8,
    width: 60,
  },
  tabImage: {
    width: 26,
    height: 26,
    opacity: 0.35,
    tintColor: 'rgba(255,255,255,0.35)',
  },
  tabImageActive: {
    opacity: 1,
    tintColor: Colors.gold,
  },
  tabIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'System',
    lineHeight: 24,
  },
  tabIconActive: {
    color: Colors.gold,
    textShadowColor: 'rgba(201,168,76,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  tabLabel: {
    fontFamily: Fonts.body,
    fontSize: 7,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: Colors.gold,
  },
  tabDot: {
    position: 'absolute',
    bottom: -6,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.gold,
  },
});