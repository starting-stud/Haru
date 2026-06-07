import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

const GREETINGS = [
  '오늘도 소중한 하루예요 🌷',
  '오늘 하루는 어떠셨나요? 🌸',
  '따뜻한 하루 보내고 계신가요? ☀️',
  '오늘도 함께해서 좋아요 🌼',
  '그림일기 쓸 준비 됐나요? 🎨',
];

const REACTIONS = [
  { emoji: '❤️', label: '좋아요' },
  { emoji: '👍', label: '멋져요' },
  { emoji: '😢', label: '슬퍼요' },
  { emoji: '😄', label: '웃겨요' },
  { emoji: '🥰', label: '따뜻해요' },
];

const MOCK_FEED = [
  {
    id: 1, author: '이웃 박○○님', time: '방금 전', emoji: '🌸',
    desc: '우리 집 귀여운 바둑이를 그려보았습니다. 꼬리를 살랑살랑 흔드는 모습이 참 예뻐요. 🐾',
    reactions: { '❤️': 5, '👍': 2 },
    comments: [
      { id: 1, author: '친구 김○○님', text: '너무 귀여워요! 강아지 이름이 뭔가요? 🐶', time: '방금 전' },
      { id: 2, author: '이웃 최○○님', text: '바둑이 그림 정말 잘 그리셨어요 😊', time: '1분 전' },
      { id: 3, author: '친구 이○○님', text: '꼬리 표현이 너무 생생해요!', time: '3분 전' },
    ],
  },
  {
    id: 2, author: '친구 김○○님', time: '1시간 전', emoji: '🌹',
    desc: '딸아이가 베란다에 장미꽃 화분을 놓아두었네요. 매일 아침 꽃을 보며 마음을 달랩니다.',
    reactions: { '❤️': 8, '🥰': 4 },
    comments: [
      { id: 1, author: '이웃 박○○님', text: '장미꽃 그림이 정말 예쁘네요 🌹', time: '30분 전' },
    ],
  },
  {
    id: 3, author: '이웃 최○○님', time: '어제', emoji: '🏡',
    desc: '시골에 살던 그리운 기와집 오두막집을 회상하며 그려보았습니다. 아련하네요.',
    reactions: { '😢': 3, '🥰': 6 },
    comments: [],
  },
];

function CommentSheet({ visible, item, onClose }) {
  const [comments, setComments] = useState(item.comments);
  const [input, setInput] = useState('');

  const addComment = () => {
    if (!input.trim()) return;
    setComments(prev => [
      { id: Date.now(), author: '나', text: input.trim(), time: '방금 전' },
      ...prev,
    ]);
    setInput('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBack}>
        {/* 배경 터치 → 닫기 */}
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.commentSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>댓글 {comments.length > 0 ? `(${comments.length})` : ''}</Text>
              <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
                <Text style={styles.sheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {comments.length === 0 ? (
              <Text style={styles.commentEmpty}>아직 댓글이 없어요. 첫 댓글을 남겨보세요 😊</Text>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={c => String(c.id)}
                style={styles.commentList}
                renderItem={({ item: c }) => (
                  <View style={styles.commentItem}>
                    <View style={styles.commentAvatar}><Text style={{ fontSize: 14 }}>👤</Text></View>
                    <View style={styles.commentBody}>
                      <View style={styles.commentTopRow}>
                        <Text style={styles.commentAuthor}>{c.author}</Text>
                        <Text style={styles.commentTime}>{c.time}</Text>
                      </View>
                      <Text style={styles.commentText}>{c.text}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="댓글을 입력하세요..."
                placeholderTextColor={COLORS.muted}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={addComment}
                returnKeyType="send"
              />
              <TouchableOpacity style={styles.commentSend} onPress={addComment}>
                <Text style={styles.commentSendText}>↑</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function FeedCard({ item }) {
  const [myReaction, setMyReaction] = useState(null);
  const [reactions, setReactions] = useState({ ...item.reactions });
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleReaction = (emoji) => {
    setReactions(prev => {
      const next = { ...prev };
      if (myReaction) next[myReaction] = Math.max(0, (next[myReaction] || 1) - 1);
      if (myReaction !== emoji) next[emoji] = (next[emoji] || 0) + 1;
      return next;
    });
    setMyReaction(prev => prev === emoji ? null : emoji);
    setShowReactions(false);
  };

  const activeReactions = Object.entries(reactions).filter(([, v]) => v > 0);
  const totalCount = activeReactions.reduce((a, [, v]) => a + v, 0);

  return (
    <View style={styles.feedCard}>
      {/* 작성자 */}
      <View style={styles.feedHeader}>
        <View style={styles.feedAvatar}><Text style={styles.feedAvatarEmoji}>👤</Text></View>
        <View>
          <Text style={styles.feedAuthor}>{item.author}</Text>
          <Text style={styles.feedTime}>{item.time}</Text>
        </View>
      </View>

      {/* 그림 */}
      <View style={styles.feedDrawing}>
        <Text style={{ fontSize: 72 }}>{item.emoji}</Text>
      </View>

      {/* 설명 */}
      <Text style={styles.feedDesc}>{item.desc}</Text>

      {/* 반응 + 댓글 버튼 */}
      <View style={styles.feedActions}>
        <TouchableOpacity
          style={[styles.reactionSummary, showReactions && styles.reactionSummaryActive]}
          onPress={() => setShowReactions(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.reactionSummaryText}>
            {activeReactions.length > 0
              ? `${activeReactions.map(([e]) => e).join('')} ${totalCount}`
              : '😊 반응하기'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.commentBtn}
          onPress={() => setShowComments(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.commentBtnText}>💬 {item.comments.length}</Text>
        </TouchableOpacity>
      </View>

      {/* 반응 선택 패널 */}
      {showReactions && (
        <View style={styles.reactionPanel}>
          {REACTIONS.map(r => (
            <TouchableOpacity
              key={r.emoji}
              style={[styles.reactionBtn, myReaction === r.emoji && styles.reactionBtnActive]}
              onPress={() => handleReaction(r.emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              <Text style={[styles.reactionLabel, myReaction === r.emoji && styles.reactionLabelActive]}>
                {r.label}
              </Text>
              {reactions[r.emoji] > 0 && (
                <Text style={styles.reactionCount}>{reactions[r.emoji]}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 댓글 시트 */}
      <CommentSheet
        visible={showComments}
        item={item}
        onClose={() => setShowComments(false)}
      />
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const now = new Date();
  const greeting = GREETINGS[now.getDate() % GREETINGS.length];
  const dateLabel = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}>
        <View style={styles.greetCard}>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
          <Text style={styles.greetText}>{greeting}</Text>
        </View>

        {MOCK_FEED.map(item => (
          <FeedCard key={item.id} item={item} />
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Draw')} activeOpacity={0.85}>
        <Text style={styles.fabText}>✏️ 그림 그리기</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  greetCard: {
    margin: 16, marginBottom: 12, padding: 18, borderRadius: 20,
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
  },
  dateLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '700', marginBottom: 6 },
  greetText: { fontSize: 17, color: COLORS.ink, fontWeight: '800' },

  // 피드 카드 - overflow 제거해서 반응 패널이 잘리지 않게
  feedCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: COLORS.white, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingBottom: 8 },
  feedAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center' },
  feedAvatarEmoji: { fontSize: 18 },
  feedAuthor: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  feedTime: { fontSize: 11, color: COLORS.muted },
  feedDrawing: {
    width: '100%', aspectRatio: 4 / 3,
    backgroundColor: '#FFFBF5', alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border,
    borderRadius: 0,
  },
  feedDesc: { fontSize: 13, color: COLORS.ink, lineHeight: 20, padding: 12, paddingBottom: 8 },

  feedActions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  reactionSummary: {
    flex: 1, backgroundColor: COLORS.purpleLight, borderRadius: 14,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  reactionSummaryActive: { borderColor: COLORS.purple },
  reactionSummaryText: { fontSize: 13, color: COLORS.purple, fontWeight: '700' },
  commentBtn: {
    backgroundColor: COLORS.purpleLight, borderRadius: 14,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  commentBtnText: { fontSize: 13, color: COLORS.purple, fontWeight: '700' },

  // 반응 패널
  reactionPanel: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 12, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  reactionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.bg, borderRadius: 20, borderWidth: 1.5,
    borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 7,
  },
  reactionBtnActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleSoft },
  reactionEmoji: { fontSize: 18 },
  reactionLabel: { fontSize: 12, color: COLORS.ink, fontWeight: '700' },
  reactionLabelActive: { color: COLORS.purple },
  reactionCount: { fontSize: 12, color: COLORS.purple, fontWeight: '900' },

  // FAB
  fab: {
    position: 'absolute', bottom: 130, right: 20,
    backgroundColor: COLORS.purple, borderRadius: 28,
    paddingHorizontal: 20, paddingVertical: 14,
    elevation: 8, shadowColor: COLORS.purple, shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: COLORS.white, fontWeight: '900', fontSize: 15 },

  // 댓글 모달
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  commentSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 20, maxHeight: 520,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: COLORS.border2, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: COLORS.ink },
  sheetCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.purpleLight, alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { fontSize: 14, color: COLORS.purple, fontWeight: '700' },
  commentList: { maxHeight: 240, paddingHorizontal: 16 },
  commentItem: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentBody: { flex: 1 },
  commentTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  commentAuthor: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  commentTime: { fontSize: 11, color: COLORS.muted },
  commentText: { fontSize: 13, color: COLORS.ink, lineHeight: 19 },
  commentEmpty: { fontSize: 14, color: COLORS.muted, textAlign: 'center', paddingVertical: 28 },
  commentInputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  commentInput: {
    flex: 1, backgroundColor: COLORS.bg, borderRadius: 22,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.ink,
  },
  commentSend: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  commentSendText: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
});
