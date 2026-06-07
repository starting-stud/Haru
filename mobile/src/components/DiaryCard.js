import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function DiaryCard({ diary, onPress }) {
  const date = new Date(diary.date);
  const label = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {diary.image ? (
        <Image source={{ uri: diary.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>🎨</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.date}>{label}</Text>
        <Text style={styles.text} numberOfLines={2}>{diary.text || '그림일기'}</Text>
        <Text style={styles.privacy}>{diary.privacy === '공개' ? '🌍 공개' : '🔒 비공개'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: 16, marginHorizontal: 16, marginVertical: 6,
    overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  image: { width: 90, height: 90 },
  placeholder: { backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 32 },
  info: { flex: 1, padding: 12, justifyContent: 'space-between' },
  date: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  text: { fontSize: 14, color: COLORS.ink, lineHeight: 20 },
  privacy: { fontSize: 11, color: COLORS.muted },
});
