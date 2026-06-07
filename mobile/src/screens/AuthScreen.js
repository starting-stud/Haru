import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert('로그인 실패', error.message);
  };

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('', '비밀번호는 6자 이상이어야 해요.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert('회원가입 실패', error.message);
    } else {
      Alert.alert('환영해요!', '회원가입이 완료되었어요.\n이메일 확인 후 로그인해주세요.');
      setMode('login');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Text style={styles.logo}>🌼</Text>
          <Text style={styles.title}>하루 그림일기</Text>
          <Text style={styles.sub}>소중한 하루를 그림으로 기록해요</Text>

          {/* 탭 전환 */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>로그인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>회원가입</Text>
            </TouchableOpacity>
          </View>

          {/* 입력 폼 */}
          <View style={styles.form}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="이메일을 입력하세요"
              placeholderTextColor={COLORS.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 입력하세요 (6자 이상)"
              placeholderTextColor={COLORS.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.btn}
            onPress={mode === 'login' ? handleLogin : handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.btnText}>{mode === 'login' ? '로그인하기' : '회원가입하기'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            <Text style={styles.switchText}>
              {mode === 'login' ? '처음 오셨나요? 회원가입' : '이미 계정이 있어요 → 로그인'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logo: { fontSize: 64, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.ink, textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 16, color: COLORS.muted, textAlign: 'center', marginBottom: 36 },
  tabRow: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border,
    marginBottom: 24, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.purple },
  tabText: { fontSize: 16, fontWeight: '800', color: COLORS.muted },
  tabTextActive: { color: COLORS.white },
  form: { gap: 8, marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '800', color: COLORS.ink, marginBottom: 2, marginTop: 8 },
  input: {
    backgroundColor: COLORS.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: COLORS.ink,
  },
  btn: {
    backgroundColor: COLORS.purple, borderRadius: 18,
    paddingVertical: 18, alignItems: 'center', marginBottom: 16,
    elevation: 4, shadowColor: COLORS.purple, shadowOpacity: 0.3,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  btnText: { fontSize: 18, fontWeight: '900', color: COLORS.white },
  switchText: { fontSize: 14, color: COLORS.purple, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
});
