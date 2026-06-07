import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function ChatBubble({ role, content }) {
  const isAI = role === 'assistant';
  return (
    <View style={[styles.wrap, isAI ? styles.aiWrap : styles.userWrap]}>
      {isAI && <Text style={styles.avatar}>🌼</Text>}
      <View style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble]}>
        <Text style={[styles.text, isAI ? styles.aiText : styles.userText]}>{content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 12 },
  aiWrap: { alignItems: 'flex-end' },
  userWrap: { justifyContent: 'flex-end' },
  avatar: { fontSize: 20, marginRight: 6, alignSelf: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 12 },
  aiBubble: { backgroundColor: COLORS.purpleLight, borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: COLORS.orange, borderBottomRightRadius: 4 },
  text: { fontSize: 15, lineHeight: 22 },
  aiText: { color: COLORS.ink },
  userText: { color: COLORS.white },
});
