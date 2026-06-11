import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

const HELP_TEXT = `🌼 하루 탭
AI 하루와 오늘 일기에 대해 대화해요.
음성으로도 말할 수 있어요.

📔 일기 탭
이웃들의 공개 그림일기를 구경하고
감정 표현과 댓글을 남겨보세요.

👤 나 탭
내가 그린 그림일기를 모아볼 수 있어요.

✏️ 그림 그리기 버튼
홈 화면의 보라색 버튼을 눌러
오늘의 그림일기를 그려보세요!`;

export default function AppHeader() {
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
        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => Alert.alert('앱 도움말', HELP_TEXT)}
          activeOpacity={0.7}
        >
          <Text style={styles.helpText}>?</Text>
        </TouchableOpacity>
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
  helpBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: COLORS.purple, backgroundColor: COLORS.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  helpText: { fontSize: 16, fontWeight: '900', color: COLORS.purple },
});
