import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, FlatList,
  Image, ActivityIndicator, RefreshControl,
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

function CommentSheet({ visible, onClose }) {
  const [comments, setComments] = useState([]);
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
  const [reactions, setReactions] = useState({});
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
      <View style={styles.feedHeader}>
        <View style={styles.feedAvatar}><Text style={styles.feedAvatarEmoji}>👤</Text></View>
        <View>
          <Text style={styles.feedAuthor}>이웃님의 그림일기</Text>
          <Text style={styles.feedTime}>{timeAgo(item.created_at)}</Text>
        </View>
      </View>

      {item.drawing_url ? (
        <Image
          source={{ uri: item.drawing_url }}
          style={styles.feedImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.feedImageEmpty}>
          <Text style={{ fontSize: 48 }}>🎨</Text>
        </View>
      )}

      {!!item.text_content && (
        <Text style={styles.feedDesc}>{item.text_content}</Text>
      )}

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
          <Text style={styles.commentBtnText}>💬 댓글</Text>
        </TouchableOpacity>
      </View>

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

      <CommentSheet visible={showComments} onClose={() => setShowComments(false)} />
    </View>
  );
}

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
    } catch (e) {
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
  feedImage: {
    width: '100%', aspectRatio: 4 / 3,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  feedImageEmpty: {
    width: '100%', aspectRatio: 4 / 3,
    backgroundColor: '#FFFBF5', alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border,
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

  reactionPanel: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 12, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10,
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

  center: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.muted, fontWeight: '700' },
  errorText: { fontSize: 14, color: COLORS.red, fontWeight: '700' },
  retryBtn: { backgroundColor: COLORS.purple, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10 },
  retryBtnText: { fontSize: 14, color: COLORS.white, fontWeight: '800' },
  emptyText: { fontSize: 15, color: COLORS.ink, fontWeight: '800' },
  emptySubText: { fontSize: 12, color: COLORS.muted, fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: 130, right: 20,
    backgroundColor: COLORS.purple, borderRadius: 28,
    paddingHorizontal: 20, paddingVertical: 14,
    elevation: 8, shadowColor: COLORS.purple, shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: COLORS.white, fontWeight: '900', fontSize: 15 },

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
