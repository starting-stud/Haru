import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  Animated, useWindowDimensions,
} from 'react-native';
import { COLORS } from '../constants/theme';

const PORTRAIT_STEPS = [
  {
    emoji: '🎨',
    title: '캔버스에 그려요',
    body: '흰 화면에 손가락으로\n직접 그림을 그려요.',
    spotKey: 'canvas',
    cardSide: 'bottom',
  },
  {
    emoji: '🖍️',
    title: '색상을 골라요',
    body: '「색상 선택」을 눌러서\n원하는 색깔을 골라요.',
    spotKey: 'palette',
    cardSide: 'top',
  },
  {
    emoji: '✏️',
    title: '도구 · 되돌리기 · 지우기',
    body: '얇은 펜 · 두꺼운 펜 · 지우개를 선택하고,\n실수하면 「↩️ 되돌리기」를 눌러요.',
    spotKey: 'tools',
    cardSide: 'top',
  },
  {
    emoji: '🎙️',
    title: '음성으로 윤곽선',
    body: '보라색 마이크 버튼을 누르고\n그리고 싶은 것의 이름을 말하면\n윤곽선이 자동으로 나타나요.',
    spotKey: 'mic',
    cardSide: 'left',
  },
  {
    emoji: '📐',
    title: '윤곽선 따라 그리기',
    body: '아래 목록에서 윤곽선을 탭하면\n캔버스에 가이드 선이 표시돼요.',
    spotKey: 'outline',
    cardSide: 'top',
  },
  {
    emoji: '⛶',
    title: '크게 그리기',
    body: '「크게」 버튼을 누르면\n가로 전체화면에서 더 넓게 그릴 수 있어요.',
    spotKey: 'expand',
    cardSide: 'bottom',
  },
];

const LANDSCAPE_STEPS = [
  {
    emoji: '🎨',
    title: '도구 & 색상',
    body: '왼쪽 패널에서\n도구와 색상을 선택해요.',
    spotKey: 'left',
    cardSide: 'right',
  },
  {
    emoji: '📐',
    title: '윤곽선 선택',
    body: '오른쪽 패널에서 윤곽선을 탭하면\n따라 그리기 가이드가 표시돼요.',
    spotKey: 'right',
    cardSide: 'left',
  },
  {
    emoji: '↩️',
    title: '되돌리기',
    body: '왼쪽 아래 「↩️ 되돌리기」로\n마지막 선을 취소할 수 있어요.',
    spotKey: 'undo',
    cardSide: 'right',
  },
  {
    emoji: '✕',
    title: '세로 화면으로',
    body: '오른쪽 위 ✕ 버튼을 누르면\n세로 화면으로 돌아가요.',
    spotKey: 'topbar',
    cardSide: 'bottom',
  },
];

const PAD = 6; // spotlight padding

function SpotlightFromRect({ rect, sw, sh }) {
  if (!rect) return <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.72)' }]} />;

  const { x, y, w, h } = rect;
  const left = Math.max(0, x - PAD);
  const top = Math.max(0, y - PAD);
  const right = Math.max(0, sw - (x + w) - PAD);
  const bottom = Math.max(0, sh - (y + h) - PAD);
  const spotW = sw - left - right;
  const spotH = sh - top - bottom;
  const DIM = 'rgba(0,0,0,0.72)';

  return (
    <>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top, backgroundColor: DIM }} />
      <View style={{ position: 'absolute', top: top + spotH, left: 0, right: 0, bottom: 0, backgroundColor: DIM }} />
      <View style={{ position: 'absolute', top, left: 0, width: left, height: spotH, backgroundColor: DIM }} />
      <View style={{ position: 'absolute', top, right: 0, width: right, height: spotH, backgroundColor: DIM }} />
      <View style={{
        position: 'absolute', top: top - 2, left: left - 2,
        width: spotW + 4, height: spotH + 4,
        borderRadius: 14, borderWidth: 2.5, borderColor: 'rgba(180,140,255,0.9)',
      }} />
    </>
  );
}


export default function DrawTour({ visible, onClose, landscape = false, spots = {} }) {
  const { width: sw, height: sh } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const steps = landscape ? LANDSCAPE_STEPS : PORTRAIT_STEPS;

  useEffect(() => { if (visible) setStep(0); }, [visible]);

  const advance = (isLast) => {
    if (isLast) { onClose(); return; }
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
    setStep(s => s + 1);
  };

  if (!visible) return null;

  const safeStep = Math.min(step, steps.length - 1);
  const current = steps[safeStep];
  const isLast = safeStep === steps.length - 1;

  // Determine the spotlight rect
  const rect = current.spotKey ? spots[current.spotKey] : null;

  // Card positioning
  let cardTop = null, cardBottom = null;
  const CARD_MARGIN = 16;
  const CARD_H = landscape ? 250 : 310;
  const SAFE_TOP = landscape ? 16 : 56;

  if (rect) {
    const spotTopPx = rect.y - PAD;
    const spotBottomPx = rect.y + rect.h + PAD;
    const spaceAbove = spotTopPx - SAFE_TOP;
    const spaceBelow = sh - spotBottomPx;

    if (current.cardSide === 'left') {
      cardTop = Math.max(SAFE_TOP, rect.y - 20);
    } else if (current.cardSide === 'right') {
      cardTop = Math.max(SAFE_TOP, rect.y - 20);
    } else if (spaceBelow >= spaceAbove || spaceAbove < CARD_H) {
      // 아래쪽 공간이 더 넓거나 위가 부족하면 → 아래 배치
      cardTop = Math.min(spotBottomPx + 10, sh - CARD_H - 10);
    } else {
      // 위쪽에 충분한 공간 → 위 배치
      cardTop = Math.max(SAFE_TOP, spotTopPx - CARD_H - 10);
    }
  } else {
    cardBottom = 80;
  }

  if (cardTop !== null) {
    cardTop = Math.max(SAFE_TOP, Math.min(cardTop, sh - CARD_H - 10));
  }

  // For left/right card placement, limit horizontal extent
  let cardLeft = CARD_MARGIN, cardRight = CARD_MARGIN;
  if (rect && current.cardSide === 'left') {
    cardRight = sw - (rect.x - PAD - 8);
    if (cardRight < CARD_MARGIN) cardRight = CARD_MARGIN;
  } else if (rect && current.cardSide === 'right') {
    cardLeft = rect.x + rect.w + PAD + 8;
    if (cardLeft + 100 > sw - CARD_MARGIN) cardLeft = CARD_MARGIN;
  }

  const cardStyle = {
    position: 'absolute',
    left: cardLeft,
    right: cardRight,
    ...(cardTop !== null ? { top: cardTop } : {}),
    ...(cardBottom !== null ? { bottom: cardBottom } : {}),
  };

  const cardContent = (
    <Animated.View style={[styles.card, cardStyle, { opacity: fadeAnim }]}>
      <Text style={styles.emoji}>{current.emoji}</Text>
      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.body}>{current.body}</Text>
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.dots} onPress={onClose}>
          <Text style={styles.skipTxt}>건너뛰기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={() => advance(isLast)}>
          <Text style={styles.nextTxt}>{isLast ? '완료 ✓' : `${step + 1}/${steps.length}  다음 →`}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // landscape: fullscreen Modal 내부에 absolute View로 렌더 → 좌표계 일치
  if (landscape) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <SpotlightFromRect rect={rect} sw={sw} sh={sh} />
        {cardContent}
      </View>
    );
  }

  // portrait: 독립 Modal
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <SpotlightFromRect rect={rect} sw={sw} sh={sh} />
        {cardContent}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
  },
  emoji: { fontSize: 36, textAlign: 'center', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 17, color: '#fff', textAlign: 'center', lineHeight: 28 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 22, alignItems: 'center', justifyContent: 'center' },
  dots: { paddingVertical: 12, paddingHorizontal: 16 },
  skipTxt: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  nextBtn: {
    paddingVertical: 14, paddingHorizontal: 36, borderRadius: 26,
    backgroundColor: COLORS.purple,
  },
  nextTxt: { fontSize: 17, fontWeight: '900', color: COLORS.white },
});
