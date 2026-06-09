import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, FlatList,
  Image, ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/theme';
import { supabase } from '../lib/supabase';

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

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

// ── 반응+댓글 통합 바텀시트 ──
function PostSheet({ visible, item, reactions, myReaction, comments, onReact, onComment, onClose }) {
  const [input, setInput] = useState('');
  const scaleAnims = useRef(REACTIONS.map(() => new Animated.Value(1))).current;

  const handleReact = (emoji, idx) => {
    Animated.sequence([
      Animated.timing(scaleAnims[idx], { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnims[idx], { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onReact(emoji);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    onComment(input.trim());
    setInput('');
  };

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBack}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            {/* 시트 헤더 */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>💬 댓글</Text>
              <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
                <Text style={styles.sheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 반응 버튼 행 */}
            <View style={styles.reactionRow}>
              {REACTIONS.map((r, i) => {
                const count = reactions[r.emoji] || 0;
                const selected = myReaction === r.emoji;
                return (
                  <Animated.View key={r.emoji} style={{ transform: [{ scale: scaleAnims[i] }], flex: 1 }}>
                    <TouchableOpacity
                      style={[styles.reactionBtn, selected && styles.reactionBtnSelected]}
                      onPress={() => handleReact(r.emoji, i)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                      <Text style={[styles.reactionLabel, selected && styles.reactionLabelSelected]}>{r.label}</Text>
                      <Text style={[styles.reactionCount, selected && styles.reactionCountSelected]}>{count}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* 댓글 목록 */}
            <FlatList
              data={comments}
              keyExtractor={c => String(c.id)}
              style={styles.commentList}
              ListEmptyComponent={
                <Text style={styles.commentEmpty}>아직 댓글이 없어요. 첫 댓글을 남겨보세요 😊</Text>
              }
              renderItem={({ item: c }) => (
                <View style={styles.commentItem}>
                  <View style={styles.commentAvatar}><Text style={{ fontSize: 16 }}>👤</Text></View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>{c.author}</Text>
                      <Text style={styles.commentTime}>{c.time}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                </View>
              )}
            />

            {/* 댓글 입력 */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="따뜻한 댓글을 남겨요..."
                placeholderTextColor={COLORS.muted}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                maxLength={80}
              />
              <TouchableOpacity style={styles.commentSendBtn} onPress={handleSend} activeOpacity={0.8}>
                <Text style={styles.commentSendText}>보내기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── 피드 카드 ──
function FeedCard({ item }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reactions, setReactions] = useState({});
  const [myReaction, setMyReaction] = useState(null);
  const [comments, setComments] = useState([]);

  const handleReact = (emoji) => {
    setReactions(prev => {
      const next = { ...prev };
      if (myReaction) next[myReaction] = Math.max(0, (next[myReaction] || 1) - 1);
      if (myReaction !== emoji) next[emoji] = (next[emoji] || 0) + 1;
      return next;
    });
    setMyReaction(prev => prev === emoji ? null : emoji);
  };

  const handleComment = (text) => {
    setComments(prev => [...prev, { id: Date.now(), author: '나', text, time: '방금 전' }]);
  };

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);
  const topReaction = REACTIONS.find(r => (reactions[r.emoji] || 0) > 0);

  return (
    <>
      <TouchableOpacity style={styles.feedCard} onPress={() => setSheetOpen(true)} activeOpacity={0.92}>
        <View style={styles.feedHeader}>
          <View style={styles.feedAvatar}><Text style={styles.feedAvatarEmoji}>👤</Text></View>
          <View>
            <Text style={styles.feedAuthor}>이웃님의 그림일기</Text>
            <Text style={styles.feedTime}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>

        {item.drawing_url ? (
          <Image source={{ uri: item.drawing_url }} style={styles.feedImage} resizeMode="cover" />
        ) : (
          <View style={styles.feedImageEmpty}>
            <Text style={{ fontSize: 48 }}>🎨</Text>
          </View>
        )}

        {!!item.text_content && (
          <Text style={styles.feedDesc} numberOfLines={2}>{item.text_content}</Text>
        )}

        {/* 반응 요약 + 댓글 수 */}
        <View style={styles.feedActions}>
          <View style={styles.feedActionBtn}>
            <Text style={[styles.feedActionText, !!myReaction && styles.feedActionActive]}>
              {totalReactions > 0 ? `${topReaction?.emoji || '❤️'} ${totalReactions}` : '😊 반응하기'}
            </Text>
          </View>
          <View style={styles.feedActionBtn}>
            <Text style={styles.feedActionText}>💬 {comments.length}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <PostSheet
        visible={sheetOpen}
        item={item}
        reactions={reactions}
        myReaction={myReaction}
        comments={comments}
        onReact={handleReact}
        onComment={handleComment}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

// ── 메인 화면 ──
export default function HomeScreen({ navigation }) {
  const now = new Date();
  const greeting = GREETINGS[now.getDate() % GREETINGS.length];
  const dateLabel = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadFeed = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('diaries')
        .select('id, drawing_url, text_content, diary_date, created_at')
        .eq('privacy', '공개')
        .order('created_at', { ascending: false })
        .limit(30);
      if (err) throw err;
      setFeed(data || []);
    } catch {
      setError('피드를 불러오지 못했어요');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadFeed(); }, []));

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFeed(true)} tintColor={COLORS.purple} />}
      >
        <View style={styles.greetCard}>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
          <Text style={styles.greetText}>{greeting}</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.purple} />
            <Text style={styles.loadingText}>이웃들의 그림일기를 불러오는 중...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadFeed()}>
              <Text style={styles.retryBtnText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : !feed.length ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 48 }}>📖</Text>
            <Text style={styles.emptyText}>아직 공개된 그림일기가 없어요</Text>
            <Text style={styles.emptySubText}>일기를 공개로 저장하면 여기에 나타나요</Text>
          </View>
        ) : (
          feed.map(item => <FeedCard key={item.id} item={item} />)
        )}
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

  // 피드 카드
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
  feedImage: { width: '100%', aspectRatio: 16 / 9, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  feedImageEmpty: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#FFFBF5', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  feedDesc: { fontSize: 13, color: COLORS.ink, lineHeight: 20, padding: 12, paddingBottom: 8 },
  feedActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4 },
  feedActionBtn: { flex: 1, backgroundColor: COLORS.purpleLight, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  feedActionText: { fontSize: 13, color: COLORS.purple, fontWeight: '700' },
  feedActionActive: { color: COLORS.orange },

  // 바텀시트
  sheetBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '78%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: COLORS.border2, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sheetTitle: { fontSize: 16, fontWeight: '900', color: COLORS.ink },
  sheetCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.purpleLight, alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { fontSize: 14, color: COLORS.purple, fontWeight: '700' },

  // 반응 버튼
  reactionRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reactionBtn: { alignItems: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  reactionBtnSelected: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleSoft },
  reactionEmoji: { fontSize: 22, lineHeight: 26 },
  reactionLabel: { fontSize: 10, fontWeight: '700', color: COLORS.muted },
  reactionLabelSelected: { color: COLORS.purple },
  reactionCount: { fontSize: 12, fontWeight: '800', color: COLORS.ink },
  reactionCountSelected: { color: COLORS.purple },

  // 댓글
  commentList: { maxHeight: 240, paddingHorizontal: 16, paddingTop: 8 },
  commentEmpty: { fontSize: 14, color: COLORS.muted, textAlign: 'center', paddingVertical: 24 },
  commentItem: { flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'flex-start' },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.purpleLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentBody: { flex: 1, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 0, borderTopRightRadius: 14, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, padding: 10 },
  commentMeta: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 3 },
  commentAuthor: { fontSize: 13, fontWeight: '800', color: COLORS.purple },
  commentTime: { fontSize: 11, color: COLORS.muted },
  commentText: { fontSize: 14, color: COLORS.ink, lineHeight: 20 },
  commentInputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  commentInput: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 22, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.ink },
  commentSendBtn: { paddingHorizontal: 18, borderRadius: 22, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  commentSendText: { fontSize: 14, fontWeight: '800', color: COLORS.white },

  // 상태
  center: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.muted, fontWeight: '700' },
  errorText: { fontSize: 14, color: COLORS.red, fontWeight: '700' },
  retryBtn: { backgroundColor: COLORS.purple, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { fontSize: 14, color: COLORS.white, fontWeight: '800' },
  emptyText: { fontSize: 15, color: COLORS.ink, fontWeight: '800' },
  emptySubText: { fontSize: 12, color: COLORS.muted, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute', bottom: 130, right: 20,
    backgroundColor: COLORS.purple, borderRadius: 28,
    paddingHorizontal: 20, paddingVertical: 14,
    elevation: 8, shadowColor: COLORS.purple, shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: COLORS.white, fontWeight: '900', fontSize: 15 },
});
