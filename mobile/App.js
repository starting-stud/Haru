import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

function MainTabs({ onLogout }) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <AppHeader onLogout={onLogout} />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
        }}
      >
        <Tab.Screen name="Home" component={ChatbotScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🌼" label="하루" focused={focused} /> }} />
        <Tab.Screen name="Diary" component={HomeScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📔" label="일기" focused={focused} /> }} />
        <Tab.Screen name="My" component={MyScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="나" focused={focused} /> }} />
      </Tab.Navigator>
    </View>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(undefined); // undefined = 로딩 중

  useEffect(() => {
    // 자동 로그인 체크
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
                {() => <MainTabs onLogout={async () => { await AsyncStorage.removeItem('haruAutoLogin'); setCurrentUser(null); }} />}
              </Stack.Screen>
              <Stack.Screen name="Draw" component={DrawScreen} />
              <Stack.Screen name="DiaryWrite" component={DiaryWriteScreen} />
              <Stack.Screen name="ChatbotModal" component={ChatbotScreen} />
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
});
