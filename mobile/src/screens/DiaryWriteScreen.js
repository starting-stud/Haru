import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { saveDiary } from '../utils/storage';

export default function DiaryWriteScreen({ navigation, route }) {
  const { imageUri } = route.params || {};
  const [text, setText] = useState('');
  const [privacy, setPrivacy] = useState('비공개');
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const dateLabel = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveDiary({
        date: now.toISOString(),
        text,
        privacy,
        image: imageUri,
      });
      navigation.navigate('ChatbotModal', { diary: saved });
    } catch {
      Alert.alert('오류', '저장 중 문제가 생겼어요. 다시 시도해주세요.');
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>그림일기 완성하기 ✍️</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled">

        {/* 일기 종이 */}
        <View style={styles.paper}>
          <View style={styles.paperTop}>
            <Text style={styles.paperDate}>{dateLabel}</Text>
          </View>

          {/* 그림 미리보기 */}
          {imageUri && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.imgWrap}>
              <Image source={{ uri: imageUri }} style={styles.img} resizeMode="contain" />
              <Text style={styles.imgHint}>탭해서 그림 수정</Text>
            </TouchableOpacity>
          )}

          {/* 글쓰기 영역 */}
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="오늘 하루를 기록해보세요..."
            placeholderTextColor={COLORS.muted}
            value={text}
            onChangeText={setText}
            maxLength={750}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{text.length}/750</Text>
        </View>

        {/* 공개 설정 */}
        <View style={styles.privacySection}>
          <Text style={styles.privacyTitle}>공개 설정</Text>
          <View style={styles.privacyRow}>
            {[
              { value: '비공개', icon: '🔒', label: '비공개' },
              { value: '공개', icon: '🌍', label: '공개' },
            ].map(p => (
              <TouchableOpacity key={p.value} onPress={() => setPrivacy(p.value)}
                style={[styles.privacyBtn, privacy === p.value && styles.privacyBtnActive]}>
                <Text style={styles.privacyIcon}>{p.icon}</Text>
                <Text style={[styles.privacyLabel, privacy === p.value && styles.privacyLabelActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 저장 버튼 */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.saveBtnText}>💾 그림일기 저장하기</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 18, color: COLORS.purple, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '900', color: COLORS.ink },
  paper: {
    margin: 16, backgroundColor: COLORS.paper,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  paperTop: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  paperDate: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  imgWrap: { padding: 12, alignItems: 'center' },
  img: { width: '100%', height: 180, borderRadius: 12 },
  imgHint: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  textInput: {
    fontSize: 17, color: COLORS.ink, lineHeight: 32,
    minHeight: 160, padding: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    borderStyle: 'dashed',
  },
  charCount: { fontSize: 11, color: COLORS.muted, textAlign: 'right', paddingRight: 14, paddingBottom: 10 },
  privacySection: { marginHorizontal: 16, marginBottom: 12 },
  privacyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginBottom: 8 },
  privacyRow: { flexDirection: 'row', gap: 10 },
  privacyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  privacyBtnActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  privacyIcon: { fontSize: 16 },
  privacyLabel: { fontSize: 14, fontWeight: '700', color: COLORS.muted },
  privacyLabelActive: { color: COLORS.white },
  saveBtn: {
    marginHorizontal: 16, backgroundColor: COLORS.purple, borderRadius: 18,
    paddingVertical: 16, alignItems: 'center',
    elevation: 4, shadowColor: COLORS.purple, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  saveBtnText: { fontSize: 16, fontWeight: '900', color: COLORS.white },
});
