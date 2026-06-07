import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useChatbot } from '../hooks/useChatbot';

function Bubble({ role, content }) {
  const isAI = role === 'assistant';
  return (
    <View style={[styles.bubbleWrap, isAI ? styles.bubbleWrapAI : styles.bubbleWrapUser]}>
      {isAI && <View style={styles.aiAvatar}><Text style={{ fontSize: 18 }}>🌼</Text></View>}
      <View style={[styles.bubble, isAI ? styles.bubbleAI : styles.bubbleUser]}>
        <Text style={[styles.bubbleText, !isAI && styles.bubbleTextUser]}>{content}</Text>
      </View>
    </View>
  );
}

export default function ChatbotScreen({ route, navigation }) {
  const diary = route?.params?.diary;
  const isModal = !!diary;
  const [input, setInput] = useState('');
  const listRef = useRef(null);
  const { messages, loading, send, initGreeting } = useChatbot(diary?.id, diary?.text || '');

  useEffect(() => {
    if (diary) {
      const s = (diary.text || '').trim();
      const greeting = s
        ? `방금 일기에 "${s.slice(0, 35)}${s.length > 35 ? '...' : ''}"라고 적어주셨네요! 소중한 하루를 기록해주셔서 감사해요 🌷`
        : '오늘 그림일기를 완성하셨네요! 그림 그리시느라 수고 많으셨어요 🌼';
      initGreeting(greeting);
    }
  }, [diary?.id]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;
    send(msg);
    setInput('');
  };

  const defaultMessages = !diary && !messages.length
    ? [{ role: 'assistant', content: '안녕하세요! 오늘 그리신 그림일기에 대해 함께 이야기해봐요 🌼', id: -1 }]
    : messages;

  return (
    <SafeAreaView style={styles.safe} edges={isModal ? ['top', 'bottom'] : []}>
      {/* 헤더 */}
      <View style={styles.header}>
        {isModal && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerAvatar}><Text style={{ fontSize: 22 }}>🌼</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>하루 챗봇</Text>
          <Text style={styles.headerSub}>오늘의 일기에 대해 대화해보세요</Text>
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>AI 실시간</Text></View>
      </View>

      {/* 일기 그림 */}
      {diary?.image && (
        <View style={styles.imgWrap}>
          <Text style={styles.imgLabel}>🎨 오늘 그리신 그림이에요</Text>
          <Image source={{ uri: diary.image }} style={styles.img} resizeMode="contain" />
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={defaultMessages}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <Bubble role={item.role} content={item.content} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={loading
            ? <View style={styles.typing}><Text style={styles.typingText}>하루가 생각 중이에요... 🌸</Text></View>
            : null}
        />

        <View style={styles.inputArea}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input} onChangeText={setInput}
              placeholder="하루에게 말을 걸어보세요..."
              placeholderTextColor={COLORS.muted}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading}>
              <Text style={styles.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>
          {!isModal && <View style={{ height: 110 }} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: COLORS.white, borderBottomWidth: 1.5, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 18, color: COLORS.purple, fontWeight: '700' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.orangeLight, borderWidth: 2, borderColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '900', color: COLORS.ink },
  headerSub: { fontSize: 11, color: COLORS.muted },
  badge: { backgroundColor: COLORS.purple, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  imgWrap: { margin: 12, backgroundColor: COLORS.purpleLight, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.purpleSoft, padding: 10, alignItems: 'center' },
  imgLabel: { fontSize: 12, color: COLORS.muted, marginBottom: 6 },
  img: { width: '100%', height: 150, borderRadius: 10 },
  list: { paddingVertical: 12, paddingHorizontal: 4 },
  bubbleWrap: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 12, alignItems: 'flex-end', gap: 6 },
  bubbleWrapAI: {},
  bubbleWrapUser: { justifyContent: 'flex-end' },
  aiAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 12 },
  bubbleAI: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.purpleSoft, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: COLORS.purple, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22, color: COLORS.ink },
  bubbleTextUser: { color: COLORS.white },
  typing: { paddingHorizontal: 20, paddingVertical: 6 },
  typingText: { fontSize: 13, color: COLORS.muted, fontStyle: 'italic' },
  inputArea: { backgroundColor: COLORS.white },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 10,
    borderTopWidth: 1.5, borderTopColor: COLORS.border,
  },
  input: {
    flex: 1, backgroundColor: COLORS.bg, borderRadius: 23, borderWidth: 1.5,
    borderColor: COLORS.purpleSoft, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: COLORS.ink, maxHeight: 100,
  },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
});
