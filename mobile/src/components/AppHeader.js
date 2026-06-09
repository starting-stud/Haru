import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

export default function AppHeader({ onLogout }) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 (${DAYS[now.getDay()]})`;

  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <View style={styles.logoRow}>
        <Text style={styles.logoEmoji}>🌼</Text>
        <View>
          <Text style={styles.logoText}>하루</Text>
          <Text style={styles.logoSub}>그림일기</Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.dateWrap}>
          <Text style={styles.dateText}>{dateLabel}</Text>
        </View>
        {onLogout && (
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
              { text: '취소', style: 'cancel' },
              { text: '로그아웃', style: 'destructive', onPress: onLogout },
            ])}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>🚪</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 10,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1.5, borderBottomColor: COLORS.border,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoEmoji: { fontSize: 28 },
  logoText: { fontSize: 20, fontWeight: '900', color: COLORS.purple, lineHeight: 24 },
  logoSub: { fontSize: 10, fontWeight: '700', color: COLORS.muted, lineHeight: 14 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateWrap: {
    backgroundColor: COLORS.purpleSoft, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  dateText: { fontSize: 13, fontWeight: '800', color: COLORS.purple },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 18 },
});
