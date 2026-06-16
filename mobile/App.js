import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchChat } from './src/utils/api';

import HomeScreen from './src/screens/HomeScreen';
import DrawScreen from './src/screens/DrawScreen';
import DiaryWriteScreen from './src/screens/DiaryWriteScreen';
import MyScreen from './src/screens/MyScreen';
import ChatbotScreen from './src/screens/ChatbotScreen';
import AuthScreen from './src/screens/AuthScreen';
import AppHeader from './src/components/AppHeader';
import { COLORS } from './src/constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ emoji, label, focused }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

function MainTabs({ onLogout, haruBadge, onHaruOpen }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <AppHeader />
      <Tab.Navigator
        initialRouteName="Diary"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: [styles.tabBar, { bottom: 28 + insets.bottom }],
        }}
      >
        <Tab.Screen name="Home"
          options={{
            tabBarIcon: ({ focused }) => (
              <View>
                <TabIcon emoji="🌼" label="하루" focused={focused} />
                {haruBadge && <View style={styles.badge} />}
              </View>
            ),
          }}
          listeners={{ tabPress: onHaruOpen }}
        >
          {() => <ChatbotScreen />}
        </Tab.Screen>
        <Tab.Screen name="Diary" component={HomeScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📔" label="일기" focused={focused} /> }} />
        <Tab.Screen name="My"
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="나" focused={focused} /> }}>
          {() => <MyScreen onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

const RAND_MIN_H = 3, RAND_MAX_H = 9;

async function checkAndSendProactive(userName) {
  const existing = await AsyncStorage.getItem('haruUnread');
  if (existing) return true;

  const next = await AsyncStorage.getItem('haruNextMsg');
  if (next && Date.now() < Number(next)) return false;

  // 맥락 수집
  const hour = new Date().getHours();
  const timeCtx = hour < 6 ? '새벽' : hour < 12 ? '오전' : hour < 17 ? '오후' : hour < 21 ? '저녁' : '밤';
  let daysSince = null;
  let lastDiaryText = '';
  try {
    const raw = await AsyncStorage.getItem(`haruDiaries_${userName}`);
    const diaries = raw ? JSON.parse(raw) : [];
    if (diaries.length > 0) {
      const last = diaries[diaries.length - 1];
      daysSince = (Date.now() - new Date(last.date).getTime()) / 86400000;
      lastDiaryText = last.text || '';
    }
  } catch {}

  const drawCtx = daysSince === null
    ? '아직 그림일기를 한 번도 안 그리셨어요.'
    : daysSince >= 2
      ? `마지막 그림일기가 ${Math.floor(daysSince)}일 전이에요.`
      : `최근 그림일기: "${lastDiaryText.slice(0, 40)}"`;

  try {
    const data = await fetchChat({
      message: `손녀로서 할머니께 짧은 선톡 한 통을 보내주세요. 상황: ${timeCtx}, ${drawCtx} 그림일기 앱이에요. 일상 안부와 그림일기 그리기를 자연스럽게 유도해주세요. 이모지 1개, 두 문장 이내.`,
      history: [],
    });
    if (data.reply) {
      await AsyncStorage.setItem('haruUnread', data.reply);
      const randMs = (RAND_MIN_H + Math.random() * (RAND_MAX_H - RAND_MIN_H)) * 3600000;
      await AsyncStorage.setItem('haruNextMsg', String(Date.now() + randMs));
      return true;
    }
  } catch {}
  return false;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(undefined);
  const [haruBadge, setHaruBadge] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('haruAutoLogin');
        if (saved) {
          const { name, pin } = JSON.parse(saved);
          const raw = await AsyncStorage.getItem('haruAccounts');
          const accounts = raw ? JSON.parse(raw) : {};
          if (accounts[name] && accounts[name].pin === pin) {
            setCurrentUser({ name, ...accounts[name] });
            return;
          }
        }
      } catch (e) {
        await AsyncStorage.removeItem('haruAutoLogin');
      }
      setCurrentUser(null);
    })();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    checkAndSendProactive(currentUser.name).then(has => { if (has) setHaruBadge(true); });
  }, [currentUser]);

  const clearHaruBadge = () => setHaruBadge(false);

  if (currentUser === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={COLORS.bg} />
        {currentUser ? (
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
              <Stack.Screen name="Main">
                {() => <MainTabs
                  onLogout={async () => { await AsyncStorage.removeItem('haruAutoLogin'); setCurrentUser(null); }}
                  haruBadge={haruBadge}
                  onHaruOpen={clearHaruBadge}
                />}
              </Stack.Screen>
              <Stack.Screen name="Draw" component={DrawScreen} />
              <Stack.Screen name="DiaryWrite" component={DiaryWriteScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        ) : (
          <AuthScreen onLogin={setCurrentUser} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    right: 20,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
    elevation: 12,
    shadowColor: COLORS.purple,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    paddingBottom: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 2,
  },
  tabItemActive: { backgroundColor: COLORS.purpleSoft },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  tabLabelActive: { color: COLORS.purple },
  badge: {
    position: 'absolute', top: 0, right: 0,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: '#FF4444',
    borderWidth: 1.5, borderColor: COLORS.white,
  },
});
