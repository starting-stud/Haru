import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/theme';
import { getDiaries, deleteDiary, getChatHistory } from '../utils/storage';

const PROFILE_EMOJIS = ['🌸','🌺','🌻','🌼','🌷','🍀','🌈','⭐','🎀','🎨','🐶','🐱','🐦','🦋','🐥','🍎','🍰','☕','🏡','🎵'];

async function loadCurrentUser() {
  const raw = await AsyncStorage.getItem('haruAutoLogin');
  if (!raw) return null;
  const { name } = JSON.parse(raw);
  const accountsRaw = await AsyncStorage.getItem('haruAccounts');
  const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
  return accounts[name] ? { name, ...accounts[name] } : null;
}

async function saveProfile(name, updates) {
  const accountsRaw = await AsyncStorage.getItem('haruAccounts');
  const accounts = accountsRaw ? JSON.parse(accountsRaw) : {};
  if (!accounts[name]) return;
  accounts[name] = { ...accounts[name], ...updates };
  await AsyncStorage.setItem('haruAccounts', JSON.stringify(accounts));
}

function ProfileEditModal({ visible, user, onClose, onSave }) {
  const [nick, setNick] = useState('');
  const [guardian, setGuardian] = useState('');
  const [emoji, setEmoji] = useState('🌸');

  useEffect(() => {
    if (visible && user) {
      setNick(user.profile?.name || '');
      setGuardian(user.profile?.guardian || '');
      setEmoji(user.emoji || '🌸');
    }
  }, [visible, user]);

  const handleSave = async () => {
    if (!nick.trim()) { Alert.alert('닉네임을 입력해주세요'); return; }
    await saveProfile(user.name, {
      emoji,
      profile: { name: nick.trim(), guardian: guardian.trim() },
    });
    onSave({ emoji, profile: { name: nick.trim(), guardian: guardian.trim() } });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBack}>
        <View style={styles.editSheet}>
          <View style={styles.modalTopRow}>
            <Text style={styles.editTitle}>프로필 편집</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <Text style={styles.editLabel}>나를 표현하는 이모지</Text>
            <View style={styles.emojiGrid}>
              {PROFILE_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, emoji === e && styles.emojiBtnSelected]}
                  onPress={() => setEmoji(e)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiBtnText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.editLabel}>닉네임 <Text style={styles.editLabelSub}>(앱에서 표시되는 이름)</Text></Text>
            <TextInput
              style={styles.editInput}
              value={nick}
              onChangeText={setNick}
              placeholder="예: 행복한 하루"
              placeholderTextColor={COLORS.muted}
              maxLength={12}
            />

            <Text style={styles.editLabel}>보호자 이름 <Text style={styles.editLabelSub}>(선택)</Text></Text>
            <TextInput
              style={styles.editInput}
              value={guardian}
              onChangeText={setGuardian}
              placeholder="예: 딸 김영희"
              placeholderTextColor={COLORS.muted}
              maxLength={15}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>저장하기</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function MyScreen({ navigation }) {
  const [diaries, setDiaries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [editVisible, setEditVisible] = useState(false);

  useFocusEffect(useCallback(() => {
    getDiaries().then(setDiaries).catch(() => setDiaries([]));
    loadCurrentUser().then(setUser).catch(() => {});
  }, []));

  useEffect(() => {
    if (selected) {
      setChatOpen(false);
      getChatHistory(selected.id).then(setChatHistory).catch(() => setChatHistory([]));
    } else {
      setChatHistory([]);
      setChatOpen(false);
    }
  }, [selected]);

  const handlePhotoChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진을 선택하려면 갤러리 접근 권한이 필요해요');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const photo = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await saveProfile(user.name, {
        emoji: user.emoji,
        profile: { ...user.profile, photo },
      });
      setUser(prev => ({ ...prev, profile: { ...prev.profile, photo } }));
    }
  };

  const now = new Date();
  const thisMonth = diaries.filter(d => new Date(d.date).getMonth() === now.getMonth()).length;

  const formatDate = (iso) => new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  const displayName = user?.profile?.name || user?.name || '나';
  const displayEmoji = user?.emoji || '👤';
  const displayPhoto = user?.profile?.photo;
  const guardian = user?.profile?.guardian;

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          {/* 아바타: 사진 있으면 사진, 없으면 이모지. 누르면 갤러리 */}
          <TouchableOpacity style={styles.avatar} onPress={handlePhotoChange} activeOpacity={0.8}>
            {displayPhoto ? (
              <Image source={{ uri: displayPhoto }} style={styles.avatarPhoto} />
            ) : (
              <Text style={styles.avatarEmoji}>{displayEmoji}</Text>
            )}
            <View style={styles.avatarCamBadge}>
              <Text style={{ fontSize: 11 }}>📷</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
            {!!guardian && <Text style={styles.guardianText}>👨‍👩‍👧 {guardian}</Text>}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{diaries.length}</Text>
                <Text style={styles.statLabel}>전체 일기</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statNum}>{thisMonth}</Text>
                <Text style={styles.statLabel}>이번 달</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditVisible(true)} activeOpacity={0.7}>
            <Text style={styles.editBtnText}>편집</Text>
          </TouchableOpacity>
        </View>

        {/* 일기 목록 */}
        <Text style={styles.sectionTitle}>📚 내가 그린 그림일기</Text>

        {!diaries.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📖</Text>
            <Text style={styles.emptyText}>아직 일기가 없어요</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Draw')}>
              <Text style={styles.emptyBtnText}>✏️ 첫 그림일기 그리기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          diaries.map(d => (
            <TouchableOpacity key={d.id} style={styles.card} onPress={() => setSelected(d)} activeOpacity={0.85}>
              {d.image
                ? <Image source={{ uri: d.image }} style={styles.thumb} />
                : <View style={[styles.thumb, styles.thumbPlaceholder]}><Text style={{ fontSize: 28 }}>🎨</Text></View>
              }
              <View style={styles.cardInfo}>
                <Text style={styles.cardDate}>{formatDate(d.date)}</Text>
                <Text style={styles.cardText} numberOfLines={2}>{d.text || '그림일기'}</Text>
                <View style={styles.cardBottom}>
                  <Text style={styles.cardPrivacy}>{d.privacy === '공개' ? '🌍 공개' : '🔒 비공개'}</Text>
                  <Text style={styles.cardHint}>눌러서 크게 보기</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* 프로필 편집 모달 (이모지 + 보호자) */}
      <ProfileEditModal
        visible={editVisible}
        user={user}
        onClose={() => setEditVisible(false)}
        onSave={(updates) => setUser(prev => ({ ...prev, ...updates }))}
      />

      {/* 일기 상세 모달 */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBack}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTopRow}>
              <Text style={styles.modalDate}>{selected && formatDate(selected.date)}</Text>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {selected?.image && (
                <Image source={{ uri: selected.image }} style={styles.modalImg} resizeMode="contain" />
              )}
              <View style={styles.modalPrivacyBadge}>
                <Text style={styles.modalPrivacyText}>{selected?.privacy === '공개' ? '🌍 공개' : '🔒 비공개'}</Text>
              </View>
              <Text style={styles.modalText}>{selected?.text || '글 없이 그림만 그리셨네요 🎨'}</Text>

              {/* 채팅 내역 */}
              <View style={styles.chatSection}>
                <TouchableOpacity style={styles.chatToggleRow} onPress={() => setChatOpen(v => !v)} activeOpacity={0.7}>
                  <Text style={styles.chatSectionTitle}>🌼 하루와 나눈 대화</Text>
                  <Text style={styles.chatToggleTxt}>{chatOpen ? '접기' : '펼치기'}</Text>
                </TouchableOpacity>
                {chatOpen && (
                  <View style={styles.chatMsgs}>
                    {!chatHistory.length ? (
                      <Text style={styles.chatEmpty}>아직 나눈 대화가 없어요</Text>
                    ) : (
                      chatHistory.map((m, i) => (
                        <View key={i} style={[styles.msgWrap, m.role === 'user' ? styles.msgWrapUser : styles.msgWrapAi]}>
                          <View style={[styles.msgBubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                            <Text style={[styles.msgText, m.role === 'user' ? styles.msgTextUser : styles.msgTextAi]}>{m.content}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.chatBtn}
                onPress={() => { setSelected(null); navigation.navigate('ChatbotModal', { diary: selected }); }}>
                <Text style={styles.chatBtnText}>💬 하루와 이야기하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn}
                onPress={() => Alert.alert('삭제', '이 일기를 삭제하시겠어요?', [
                  { text: '취소', style: 'cancel' },
                  {
                    text: '삭제', style: 'destructive', onPress: async () => {
                      await deleteDiary(selected.id);
                      setDiaries(prev => prev.filter(d => d.id !== selected.id));
                      setSelected(null);
                    }
                  },
                ])}>
                <Text style={styles.deleteBtnText}>🗑️ 삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    margin: 16, backgroundColor: COLORS.white,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, padding: 16,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.orangeLight, borderWidth: 3, borderColor: COLORS.orange, alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'visible' },
  avatarPhoto: { width: 66, height: 66, borderRadius: 33 },
  avatarEmoji: { fontSize: 34 },
  avatarCamBadge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1 },
  nickRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  profileName: { fontSize: 17, fontWeight: '900', color: COLORS.ink },
  nickEditBtn: { padding: 2 },
  nickEditTxt: { fontSize: 14 },
  nickEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  nickInput: { flex: 1, height: 36, borderWidth: 1.5, borderColor: COLORS.purple, borderRadius: 10, paddingHorizontal: 10, fontSize: 15, fontWeight: '700', color: COLORS.ink, backgroundColor: '#FFFDF7' },
  nickSaveBtn: { backgroundColor: COLORS.purple, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  nickSaveTxt: { fontSize: 12, fontWeight: '800', color: COLORS.white },
  nickCancelBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  nickCancelTxt: { fontSize: 12, color: COLORS.purple, fontWeight: '700' },
  guardianText: { fontSize: 11, color: COLORS.muted, fontWeight: '700', marginBottom: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '900', color: COLORS.purple },
  statLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '700' },
  statDivider: { width: 1.5, height: 28, backgroundColor: COLORS.border },
  editBtn: { backgroundColor: COLORS.purpleSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: COLORS.purple },
  editBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.purple },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginHorizontal: 16, marginBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.muted },
  emptyBtn: { backgroundColor: COLORS.purple, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  card: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.white, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1.5, borderColor: COLORS.border,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  thumb: { width: 90, height: 90 },
  thumbPlaceholder: { backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardDate: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  cardText: { fontSize: 13, color: COLORS.ink, lineHeight: 18, flex: 1, marginVertical: 3 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrivacy: { fontSize: 11, color: COLORS.muted },
  cardHint: { fontSize: 10, color: COLORS.purple },

  // 프로필 편집 모달
  editSheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  editTitle: { fontSize: 18, fontWeight: '900', color: COLORS.ink },
  editLabel: { fontSize: 13, fontWeight: '800', color: COLORS.muted },
  editLabelSub: { fontSize: 11, fontWeight: '700' },
  editInput: {
    height: 52, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16,
    paddingHorizontal: 18, fontSize: 16, fontWeight: '700',
    color: COLORS.ink, backgroundColor: '#FFFDF7',
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: { width: 46, height: 46, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  emojiBtnSelected: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleSoft },
  emojiBtnText: { fontSize: 24 },
  saveBtn: { height: 54, borderRadius: 27, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 17, fontWeight: '900', color: COLORS.white },

  // 일기 상세 모달
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', paddingBottom: 20 },
  modalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 },
  modalDate: { fontSize: 16, fontWeight: '800', color: COLORS.purple },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 14, color: COLORS.purple, fontWeight: '700' },
  modalImg: { width: '100%', aspectRatio: 16 / 9 },
  modalPrivacyBadge: { margin: 16, marginBottom: 8, backgroundColor: COLORS.purpleLight, alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  modalPrivacyText: { fontSize: 12, color: COLORS.purple, fontWeight: '700' },
  modalText: { fontSize: 16, color: COLORS.ink, lineHeight: 28, paddingHorizontal: 18, paddingBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10, marginHorizontal: 16 },
  chatSection: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white, overflow: 'hidden' },
  chatToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  chatSectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.purple },
  chatToggleTxt: { fontSize: 12, fontWeight: '700', color: COLORS.purple },
  chatMsgs: { borderTopWidth: 1, borderTopColor: COLORS.border, padding: 10, gap: 6 },
  chatEmpty: { fontSize: 13, color: COLORS.muted, textAlign: 'center', paddingVertical: 10 },
  msgWrap: { flexDirection: 'row', marginVertical: 2 },
  msgWrapUser: { justifyContent: 'flex-end' },
  msgWrapAi: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '80%', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleUser: { backgroundColor: COLORS.purple },
  bubbleAi: { backgroundColor: COLORS.purpleSoft },
  msgText: { fontSize: 13, lineHeight: 19 },
  msgTextUser: { color: COLORS.white, fontWeight: '600' },
  msgTextAi: { color: COLORS.ink },
  chatBtn: { flex: 1, backgroundColor: COLORS.purple, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  chatBtnText: { fontSize: 14, fontWeight: '900', color: COLORS.white },
  deleteBtn: { backgroundColor: COLORS.red, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
  deleteBtnText: { fontSize: 14, fontWeight: '900', color: COLORS.white },
});
