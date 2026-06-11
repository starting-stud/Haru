import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { COLORS } from '../constants/theme';
import { fetchSpeech } from '../utils/api';
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

export default function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const listRef = useRef(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { messages, loading, send, initGreeting, ready } = useChatbot();

  useEffect(() => {
    if (!ready) return;
    if (messages.length === 0) initGreeting();
  }, [ready]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;
    send(msg);
    setInput('');
  };

  const startRecording = async () => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) { Alert.alert('권한 필요', '마이크 사용 권한이 필요해요'); return; }
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
  };

  const stopAndSend = async () => {
    setIsRecording(false);
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) return;
    setTranscribing(true);
    try {
      const { text } = await fetchSpeech(uri);
      if (text?.trim()) send(text.trim());
    } catch {
      Alert.alert('오류', '음성 인식에 실패했어요. 다시 시도해주세요.');
    }
    setTranscribing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.header}>
        <View style={styles.headerAvatar}><Text style={{ fontSize: 22 }}>🌼</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>하루</Text>
          <Text style={styles.headerSub}>그림일기와 일상을 함께해요</Text>
        </View>
        <View style={styles.badge}><Text style={styles.badgeText}>AI 실시간</Text></View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={listRef}
          data={messages}
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
            <TouchableOpacity
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onPress={isRecording ? stopAndSend : startRecording}
              disabled={transcribing || loading}
            >
              {transcribing
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <Text style={styles.micBtnText}>{isRecording ? '⏹' : '🎤'}</Text>
              }
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={input} onChangeText={setInput}
              placeholder="말하거나 입력해보세요..."
              placeholderTextColor={COLORS.muted}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading || !input.trim()}>
              <Text style={styles.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 110 + insets.bottom }} />
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
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.orangeLight, borderWidth: 2, borderColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '900', color: COLORS.ink },
  headerSub: { fontSize: 11, color: COLORS.muted },
  badge: { backgroundColor: COLORS.purple, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
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
  micBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  micBtnActive: { backgroundColor: '#FF4444' },
  micBtnText: { fontSize: 20 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
});
