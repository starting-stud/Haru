import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

const SIGNUP_EMOJIS = ['🌸','🌺','🌻','🌼','🌷','🍀','🌈','⭐','🎀','🎨','🐶','🐱','🐦','🦋','🐥','🍎','🍰','☕','🏡','🎵'];

async function getAccounts() {
  const raw = await AsyncStorage.getItem('haruAccounts');
  return raw ? JSON.parse(raw) : {};
}
async function saveAccounts(accounts) {
  await AsyncStorage.setItem('haruAccounts', JSON.stringify(accounts));
}

// ── PIN 점 표시 ──
function PinDots({ length }) {
  return (
    <View style={styles.pinDots}>
      {[0,1,2,3].map(i => (
        <View key={i} style={[styles.pinDot, i < length && styles.pinDotFilled]} />
      ))}
    </View>
  );
}

// ── 숫자 패드 ──
function PinPad({ onPress, onDelete }) {
  const rows = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']];
  return (
    <View style={styles.pinPad}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.pinRow}>
          {row.map((key, ki) => (
            <TouchableOpacity
              key={ki}
              style={[styles.pinBtn, key === '' && styles.pinBtnEmpty]}
              onPress={() => key === '⌫' ? onDelete() : key !== '' ? onPress(key) : null}
              activeOpacity={key === '' ? 1 : 0.7}
            >
              <Text style={styles.pinBtnText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════
//  로그인 화면
// ═══════════════════════════════════════
function LoginView({ onLogin, onGoSignup }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [saveLogin, setSaveLogin] = useState(true);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState({});

  useEffect(() => {
    AsyncStorage.getItem('haruLoginSave').then(v => { if (v === 'false') setSaveLogin(false) });
    getAccounts().then(setAccounts);
  }, []);

  const handlePin = (ch) => { if (pin.length < 4) setPin(p => p + ch); setError('') };
  const handleDel = () => setPin(p => p.slice(0, -1));
  const handleNameChange = (v) => { setName(v); setPin(''); setError('') };

  const handleLogin = async () => {
    if (!name.trim()) { setError('닉네임을 입력해주세요'); return }
    if (pin.length < 4) { setError('비밀번호 4자리를 눌러주세요'); return }
    const accs = await getAccounts();
    if (!accs[name.trim()]) { setError('등록되지 않은 닉네임이에요. 회원가입을 먼저 해주세요'); return }
    if (accs[name.trim()].pin !== pin) {
      setError('비밀번호가 맞지 않아요. 다시 눌러주세요');
      setPin(''); return;
    }
    const user = { name: name.trim(), ...accs[name.trim()] };
    if (saveLogin) {
      await AsyncStorage.setItem('haruAutoLogin', JSON.stringify({ name: name.trim(), pin }));
    } else {
      await AsyncStorage.removeItem('haruAutoLogin');
    }
    await AsyncStorage.setItem('haruLoginSave', String(saveLogin));
    onLogin(user);
  };

  const handleQuickLogin = (acName) => {
    setName(acName);
    setPin('');
    setError(acName + '님, 비밀번호를 눌러주세요 🔐');
  };

  const accountNames = Object.keys(accounts);

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.logo}>🌼</Text>
      <Text style={styles.title}>하루 그림일기</Text>
      <Text style={styles.sub}>소중한 하루를 그림으로 기록해요</Text>

      <View style={styles.card}>
        <Text style={styles.label}>👤 닉네임</Text>
        <TextInput
          style={styles.input}
          placeholder="닉네임을 입력해주세요"
          placeholderTextColor={COLORS.muted}
          value={name}
          onChangeText={handleNameChange}
          maxLength={12}
          autoCorrect={false}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>🔐 비밀번호 (숫자 4자리)</Text>
        <PinDots length={pin.length} />
        <PinPad onPress={handlePin} onDelete={handleDel} />

        <TouchableOpacity
          style={styles.saveRow}
          onPress={() => setSaveLogin(v => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, saveLogin && styles.checkboxOn]}>
            {saveLogin && <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '900' }}>✓</Text>}
          </View>
          <Text style={styles.saveLabel}>로그인 정보 저장 (자동 로그인)</Text>
        </TouchableOpacity>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
          <Text style={styles.loginBtnText}>로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.signupBtn} onPress={onGoSignup} activeOpacity={0.85}>
          <Text style={styles.signupBtnText}>처음이세요? 회원가입</Text>
        </TouchableOpacity>

        {accountNames.length > 0 && (
          <View style={styles.quickSection}>
            <Text style={styles.quickTitle}>빠른 로그인</Text>
            <View style={styles.quickRow}>
              {accountNames.map(acName => {
                const emoji = accounts[acName].emoji || '👤';
                const nick = (accounts[acName].profile && accounts[acName].profile.name) || acName;
                return (
                  <TouchableOpacity
                    key={acName}
                    style={[styles.quickBtn, name === acName && styles.quickBtnActive]}
                    onPress={() => handleQuickLogin(acName)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.quickEmoji}>{emoji}</Text>
                    <Text style={styles.quickName}>{nick}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <Text style={styles.hint}>💡 닉네임으로 로그인해요. 실명은 여러 명이 같아도 괜찮아요</Text>
    </ScrollView>
  );
}

// ═══════════════════════════════════════
//  회원가입 화면
// ═══════════════════════════════════════
function SignupView({ onBack, onSignup }) {
  const [selectedEmoji, setSelectedEmoji] = useState('🌸');
  const [name, setName] = useState('');
  const [nick, setNick] = useState('');
  const [guardian, setGuardian] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');

  const handlePin = (ch) => { if (pin.length < 4) setPin(p => p + ch); setError('') };
  const handleDel = () => setPin(p => p.slice(0, -1));
  const handleConfirm = (ch) => { if (pinConfirm.length < 4) setPinConfirm(p => p + ch); setError('') };
  const handleConfirmDel = () => setPinConfirm(p => p.slice(0, -1));

  const handleSignup = async () => {
    if (!name.trim()) { setError('이름을 입력해주세요'); return }
    if (!nick.trim()) { setError('닉네임을 입력해주세요'); return }
    if (pin.length < 4) { setError('비밀번호 4자리를 입력해주세요'); return }
    if (pinConfirm.length < 4) { setError('비밀번호 확인을 입력해주세요'); return }
    if (pin !== pinConfirm) { setError('비밀번호가 서로 달라요 🔐'); setPinConfirm(''); return }
    const accounts = await getAccounts();
    if (accounts[nick.trim()]) { setError('이미 사용 중인 닉네임이에요'); return }
    accounts[nick.trim()] = { pin, emoji: selectedEmoji, realName: name.trim(), profile: { name: nick.trim(), guardian: guardian.trim() } };
    await saveAccounts(accounts);
    await AsyncStorage.setItem(`haruFavorites2_${nick.trim()}`, JSON.stringify(['강아지','고양이','꽃','집','하트','사람']));
    Alert.alert('가입 완료! 🌱', '닉네임과 비밀번호로 로그인해주세요.', [{ text: '확인', onPress: onSignup }]);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← 뒤로</Text>
      </TouchableOpacity>

      <Text style={styles.logo}>🌱</Text>
      <Text style={styles.title}>회원가입</Text>
      <Text style={styles.sub}>하루 그림일기와 함께해요</Text>

      <View style={styles.card}>
        <Text style={styles.label}>😊 나를 표현하는 이모지 선택</Text>
        <View style={styles.emojiGrid}>
          {SIGNUP_EMOJIS.map(e => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnSelected]}
              onPress={() => setSelectedEmoji(e)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiBtnText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={styles.label}>👤 이름 <Text style={styles.labelSub}>(로그인에 사용)</Text></Text>
        <TextInput style={styles.input} placeholder="실명을 입력해주세요" placeholderTextColor={COLORS.muted}
          value={name} onChangeText={v => { setName(v); setError('') }} maxLength={10} autoCorrect={false} />

        <Text style={[styles.label, { marginTop: 14 }]}>✏️ 닉네임 <Text style={styles.labelSub}>(앱에서 표시되는 이름)</Text></Text>
        <TextInput style={styles.input} placeholder="예: 행복한 하루, 꽃할매 등" placeholderTextColor={COLORS.muted}
          value={nick} onChangeText={v => { setNick(v); setError('') }} maxLength={12} autoCorrect={false} />

        <Text style={[styles.label, { marginTop: 14 }]}>👨‍👩‍👧 보호자 이름 <Text style={styles.labelSub}>(선택)</Text></Text>
        <TextInput style={styles.input} placeholder="예: 딸 김영희, 아들 박민준" placeholderTextColor={COLORS.muted}
          value={guardian} onChangeText={setGuardian} maxLength={15} autoCorrect={false} />

        <View style={styles.divider} />

        <Text style={[styles.label, { marginTop: 4 }]}>🔐 비밀번호 <Text style={styles.labelSub}>(숫자 4자리)</Text></Text>
        <PinDots length={pin.length} />
        <PinPad onPress={handlePin} onDelete={handleDel} />

        <Text style={[styles.label, { marginTop: 16 }]}>🔐 비밀번호 확인</Text>
        <PinDots length={pinConfirm.length} />
        <PinPad onPress={handleConfirm} onDelete={handleConfirmDel} />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.loginBtn} onPress={handleSignup} activeOpacity={0.85}>
          <Text style={styles.loginBtnText}>🌱 가입 완료</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════
//  메인 export
// ═══════════════════════════════════════
export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login');

  return (
    <SafeAreaView style={styles.safe}>
      {mode === 'login' ? (
        <LoginView
          onLogin={onLogin}
          onGoSignup={() => setMode('signup')}
        />
      ) : (
        <SignupView
          onBack={() => setMode('login')}
          onSignup={() => setMode('login')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 },
  logo: { fontSize: 64, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.purple, textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 24, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.white, borderRadius: 28,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: 22, gap: 6,
    shadowColor: COLORS.purple, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  label: { fontSize: 13, fontWeight: '800', color: COLORS.muted, marginBottom: 4 },
  labelSub: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  input: {
    height: 52, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16,
    paddingHorizontal: 18, fontSize: 17, fontWeight: '700',
    color: COLORS.ink, backgroundColor: '#FFFDF7',
  },
  pinDots: { flexDirection: 'row', gap: 10, marginVertical: 10, justifyContent: 'center' },
  pinDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: COLORS.border2, backgroundColor: 'transparent' },
  pinDotFilled: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  pinPad: { gap: 8, marginTop: 4 },
  pinRow: { flexDirection: 'row', gap: 8 },
  pinBtn: {
    flex: 1, height: 54, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 16, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  pinBtnEmpty: { borderColor: 'transparent', backgroundColor: 'transparent' },
  pinBtnText: { fontSize: 22, fontWeight: '800', color: COLORS.ink },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, marginTop: 6 },
  checkbox: {
    width: 22, height: 22, borderRadius: 8, borderWidth: 2, borderColor: COLORS.border2,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  saveLabel: { fontSize: 14, fontWeight: '800', color: COLORS.muted },
  error: { color: COLORS.red, fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  loginBtn: {
    height: 54, borderRadius: 27, backgroundColor: COLORS.purple,
    alignItems: 'center', justifyContent: 'center', marginTop: 10,
    shadowColor: COLORS.purple, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  loginBtnText: { fontSize: 18, fontWeight: '900', color: COLORS.white },
  signupBtn: {
    height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: COLORS.purpleSoft,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  signupBtnText: { fontSize: 16, fontWeight: '800', color: COLORS.purple },
  quickSection: { marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 14 },
  quickTitle: { fontSize: 12, fontWeight: '800', color: COLORS.muted, textAlign: 'center', marginBottom: 10 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  quickBtn: {
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white, minWidth: 68,
  },
  quickBtnActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleSoft },
  quickEmoji: { fontSize: 28, marginBottom: 4 },
  quickName: { fontSize: 11, fontWeight: '800', color: COLORS.ink },
  hint: { marginTop: 20, textAlign: 'center', fontSize: 12, color: COLORS.muted, fontWeight: '700', lineHeight: 20 },
  backBtn: { alignSelf: 'flex-start', paddingBottom: 12 },
  backBtnText: { fontSize: 22, color: COLORS.muted },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  emojiBtn: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
  },
  emojiBtnSelected: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleSoft },
  emojiBtnText: { fontSize: 24 },
  divider: { height: 1, backgroundColor: COLORS.border, borderRadius: 1, marginVertical: 8 },
});
