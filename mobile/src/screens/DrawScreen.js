import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Dimensions, Modal, TextInput, ActivityIndicator, Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as Speech from 'expo-speech';
import { COLORS, API_BASE } from '../constants/theme';
import { fetchOutlines, fetchQuickDraw } from '../utils/api';
import { getFavorites, toggleFavorite } from '../utils/storage';
import DrawCanvas from '../components/SkiaCanvas';

const { width: SW, height: SH } = Dimensions.get('window');
const CANVAS_W = SW - 32;
const CANVAS_H = Math.round(CANVAS_W * 9 / 16);
const FULL_W = SW;
const FULL_H = SH - 120; // 상단 툴바 + 하단 버튼 공간 제외

// 획 좌표를 캔버스 크기에 맞게 스케일
function scaleStrokes(strokes, fromW, fromH, toW, toH) {
  return strokes.map(s => ({
    ...s,
    points: s.points.map(p => ({
      x: p.x * toW / fromW,
      y: p.y * toH / fromH,
    })),
  }));
}

const PALETTE = ['#3F3328', '#D86B61', '#E8845A', '#F0C419', '#7BAF68', '#5BA3D8', '#5E3F8C', '#D87BBB', '#8B6347', '#FFFFFF'];
const TOOLS = [
  { id: 'pen',    icon: '✏️', label: '펜' },
  { id: 'thick',  icon: '🖌️', label: '굵은펜' },
  { id: 'eraser', icon: '🧽', label: '지우개' },
];
const CATEGORIES = ['즐겨찾기', '전체', '자연', '동물', '생활', '사람', '음식', '감정'];

// 완성된 획 목록 - memo로 현재획 그릴 때 리렌더링 차단
const CompletedStrokes = React.memo(({ strokes, toPathD }) => (
  <>
    {strokes.map((s, i) => (
      <Path key={i} d={toPathD(s.points)} stroke={s.color}
        strokeWidth={s.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </>
), (prev, next) => prev.strokes === next.strokes);

// Quick Draw 스트로크 → 0-24 공간 SVG path 변환
function qdToPaths(strokes) {
  const s = 24 / 255;
  return strokes.map(([xs, ys]) => {
    if (!xs.length) return '';
    let d = `M${(xs[0] * s).toFixed(2)},${(ys[0] * s).toFixed(2)}`;
    for (let i = 1; i < xs.length; i++) {
      d += ` L${(xs[i] * s).toFixed(2)},${(ys[i] * s).toFixed(2)}`;
    }
    return d;
  }).join(' ');
}

export default function DrawScreen({ navigation }) {
  const viewShotRef = useRef(null);
  const skiaCanvasRef = useRef(null);
  const [strokes, setStrokes] = useState([]);
  const [renderTick, setRenderTick] = useState(0);
  const fullRafRef = useRef(null);

  const scheduleFullRender = () => {
    if (fullRafRef.current) return;
    fullRafRef.current = requestAnimationFrame(() => {
      setFullRenderTick(n => n + 1);
      fullRafRef.current = null;
    });
  };

  const [color, setColor] = useState(PALETTE[0]);
  const [tool, setTool] = useState('pen');
  const [showPalette, setShowPalette] = useState(false);

  // PanResponder가 항상 최신 tool/color를 참조하도록 ref 사용
  const toolRef = useRef('pen');
  const colorRef = useRef(PALETTE[0]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);

  // 전체화면 모드
  const [fullscreen, setFullscreen] = useState(false);
  const [lsDims, setLsDims] = useState({ w: 1, h: 1 });
  const lsDimsRef = useRef({ w: 1, h: 1 });
  const fullLayoutDone = useRef(false);
  const fullCurrentStroke = useRef(null);
  const [fullRenderTick, setFullRenderTick] = useState(0);
  const [fullQdQuery, setFullQdQuery] = useState('');
  const [fullQdResults, setFullQdResults] = useState([]);
  const [fullQdLoading, setFullQdLoading] = useState(false);

  const enterFullscreen = async () => {
    fullLayoutDone.current = false;
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    setFullscreen(true);
  };

  const exitFullscreen = async () => {
    const { w, h } = lsDimsRef.current;
    if (w > 1 && h > 1) {
      setStrokes(prev => scaleStrokes(prev, w, h, CANVAS_W, CANVAS_H));
    }
    setFullscreen(false);
    fullLayoutDone.current = false;
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
  };

  // 전체화면 캔버스가 실제 렌더된 뒤 크기 측정
  const onFullCanvasLayout = (e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w < 10 || h < 10) return;
    if (!fullLayoutDone.current) {
      fullLayoutDone.current = true;
      setStrokes(prev => scaleStrokes(prev, CANVAS_W, CANVAS_H, w, h));
    }
    lsDimsRef.current = { w, h };
    setLsDims({ w, h });
  };

  const searchFullQD = async () => {
    if (!fullQdQuery.trim()) return;
    setFullQdLoading(true);
    setFullQdResults([]);
    try {
      const data = await fetchQuickDraw(fullQdQuery.trim());
      if (data.drawings?.length) {
        setFullQdResults(data.drawings.slice(0, 6).map((d, i) => ({
          name: `${fullQdQuery} ${i + 1}`, path: qdToPaths(d),
        })));
      } else if (data.outlines?.length) {
        setFullQdResults(data.outlines.map(o => ({ name: o.name, path: o.path })));
      }
    } catch {}
    setFullQdLoading(false);
  };

  // 전체화면 GestureDetector
  const fullGesture = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((e) => {
      const t = toolRef.current;
      const c = colorRef.current;
      const sw = t === 'eraser' ? 40 : t === 'thick' ? 14 : 6;
      const sc = t === 'eraser' ? '#FFFFFF' : c;
      fullCurrentStroke.current = { tool: t, color: sc, strokeWidth: sw, points: [{ x: e.x, y: e.y }] };
      scheduleFullRender();
    })
    .onUpdate((e) => {
      if (!fullCurrentStroke.current) return;
      const pts = fullCurrentStroke.current.points;
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        if (Math.abs(e.x - last.x) > 120 || Math.abs(e.y - last.y) > 120) return;
        const dx = e.x - last.x, dy = e.y - last.y;
        if (dx * dx + dy * dy < 4) return;
      }
      pts.push({ x: e.x, y: e.y });
      scheduleFullRender();
    })
    .onEnd(() => {
      if (fullRafRef.current) { cancelAnimationFrame(fullRafRef.current); fullRafRef.current = null; }
      if (fullCurrentStroke.current) {
        const stroke = fullCurrentStroke.current;
        fullCurrentStroke.current = null;
        setStrokes(s => [...s, stroke]);
        setFullRenderTick(n => n + 1);
      }
    })
    .onFinalize(() => {
      if (fullRafRef.current) { cancelAnimationFrame(fullRafRef.current); fullRafRef.current = null; }
      if (fullCurrentStroke.current) {
        const stroke = fullCurrentStroke.current;
        fullCurrentStroke.current = null;
        setStrokes(s => [...s, stroke]);
        setFullRenderTick(n => n + 1);
      }
    });

  // 윤곽선 오버레이
  const [overlay, setOverlay] = useState(null); // { path: string (0-24 space) }

  // 윤곽선 인라인
  const [outlines, setOutlines] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [category, setCategory] = useState('전체');
  const [qdQuery, setQdQuery] = useState('');
  const [qdResults, setQdResults] = useState([]);
  const [qdLoading, setQdLoading] = useState(false);

  useEffect(() => {
    fetchOutlines().then(d => setOutlines(d.outlines || []));
    getFavorites().then(setFavorites);
  }, []);

  const handleToggleFavorite = async (name) => {
    const updated = await toggleFavorite(name);
    setFavorites(updated);
  };

  const filteredOutlines = category === '즐겨찾기'
    ? outlines.filter(o => favorites.includes(o.name))
    : category === '전체'
      ? outlines
      : outlines.filter(o => o.category === category);

  const searchQD = async (q) => {
    const query = (q ?? qdQuery).trim();
    if (!query) return;
    setQdLoading(true);
    setQdResults([]);
    try {
      const data = await fetchQuickDraw(query);
      if (data.drawings?.length) {
        setQdResults(data.drawings.slice(0, 6).map((d, i) => ({
          name: `${query} ${i + 1}`,
          path: qdToPaths(d),
        })));
      } else if (data.outlines?.length) {
        setQdResults(data.outlines.map(o => ({ name: o.name, path: o.path })));
      } else {
        setQdResults([]);
      }
    } catch {}
    setQdLoading(false);
  };

  // ── 음성 윤곽선 검색 ──
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const transcribeAndSearch = async (uri) => {
    setVoiceLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', { uri, type: 'audio/m4a', name: 'voice.m4a' });
      const res = await fetch(`${API_BASE}/api/speech`, { method: 'POST', body: formData });
      const { text, error: apiErr } = await res.json();
      if (apiErr) throw new Error(apiErr);
      const cleaned = text.trim().replace(/[.,!?。、·]/g, '').trim();
      if (cleaned) {
        setQdQuery(cleaned);
        searchQD(cleaned);
        Speech.speak(`${cleaned} 윤곽선을 찾아볼게요`, { language: 'ko-KR' });
      }
    } catch {
      Alert.alert('', '음성 인식에 실패했어요. 다시 시도해주세요.');
    }
    setVoiceLoading(false);
  };

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) await transcribeAndSearch(uri);
    } catch {}
  };

  const startVoiceOutline = async () => {
    if (voiceLoading) return;
    if (isRecordingRef.current) { await stopRecording(); return; }
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) { Alert.alert('', '마이크 권한을 허용해주세요.'); return; }
      await recorder.prepareToRecordAsync();
      recorder.record();
      isRecordingRef.current = true;
      setIsRecording(true);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      setTimeout(stopRecording, 5000);
    } catch {
      Alert.alert('', '마이크를 사용할 수 없어요.');
    }
  };

  const stampOutline = (path, name) => {
    setOverlay({ path, name });
  };

  const removeOverlay = () => setOverlay(null);

  // 전체화면용 toPathD (SVG 문자열, 전체화면 사이드바에서만 사용)
  const toPathD = (points) => {
    if (!points || points.length < 2) return '';
    let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L${points[i].x.toFixed(1)},${points[i].y.toFixed(1)}`;
    }
    return d;
  };

  const undo = () => setStrokes(s => s.slice(0, -1));
  const clearAll = () => {
    Alert.alert('전체 지우기', '정말 지우시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '지우기', style: 'destructive', onPress: () => { setStrokes([]); setOverlay(null); } },
    ]);
  };

  const handleDone = async () => {
    if (!strokes.length) { Alert.alert('', '그림을 먼저 그려보세요 🎨'); return; }
    try {
      const uri = await viewShotRef.current.capture();
      navigation.navigate('DiaryWrite', { imageUri: uri });
    } catch { Alert.alert('오류', '저장 중 문제가 생겼어요.'); }
  };


  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>그림 그리기 🎨</Text>
        {overlay && (
          <TouchableOpacity onPress={removeOverlay} style={styles.overlayRemoveBtn}>
            <Text style={styles.overlayRemoveTxt}>윤곽선 제거</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 스크롤 영역 */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>

        {/* 캔버스 (Skia GPU 렌더링) */}
        <View style={styles.canvasContainer}>
        <ViewShot ref={viewShotRef} style={styles.canvasWrap} options={{ format: 'png', quality: 0.95 }}>
          <View style={{ width: CANVAS_W, height: CANVAS_H }}>
            <DrawCanvas
              ref={skiaCanvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              strokes={strokes}
              onStrokeAdded={(stroke) => setStrokes(s => [...s, stroke])}
              toolRef={toolRef}
              colorRef={colorRef}
              overlay={overlay}
            />
            {!strokes.length && !overlay && (
              <View style={styles.hintWrap} pointerEvents="none">
                <Text style={styles.hint}>오늘의 그림을 그려보세요 ✏️</Text>
              </View>
            )}
            <TouchableOpacity style={styles.expandBtn} onPress={enterFullscreen}>
              <Text style={styles.expandBtnText}>⛶</Text>
              <Text style={styles.expandBtnLabel}>크게</Text>
            </TouchableOpacity>
            <View style={styles.canvasTopRight}>
              <TouchableOpacity style={styles.canvasIconBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.canvasIconTxt}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.canvasIconBtn} onPress={() => Alert.alert(
                '그림 그리기 도움말 🎨',
                '• 색상과 도구를 선택해 그림을 그려요\n• ↩️ 되돌리기로 실수를 취소할 수 있어요\n• 📐 윤곽선을 선택하면 따라 그리기 도움이 돼요\n• ⛶ 크게 버튼으로 가로 전체화면에서 그려요\n• 다 그렸으면 아래 완성 버튼을 눌러요',
                [{ text: '확인' }]
              )}>
                <Text style={styles.canvasIconTxt}>?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ViewShot>
          <Animated.View style={[
            styles.micBtn,
            isRecording && styles.micBtnRecording,
            { transform: [{ scale: pulseAnim }] },
          ]}>
            <TouchableOpacity onPress={startVoiceOutline} style={styles.micBtnTouch} disabled={voiceLoading}>
              <Text style={styles.micEmoji}>{voiceLoading ? '⏳' : '🎤'}</Text>
              <Text style={styles.micLabel}>{isRecording ? '중지' : '윤곽선'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* 색상 선택 */}
        <View style={styles.toolSection}>
          <TouchableOpacity style={styles.paletteToggle} onPress={() => setShowPalette(v => !v)}>
            <View style={[styles.currentColor, { backgroundColor: tool === 'eraser' ? COLORS.white : color },
              tool === 'eraser' && { borderWidth: 1.5, borderColor: COLORS.border }]} />
            <Text style={styles.paletteToggleText}>색상 선택 {showPalette ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showPalette && (
            <View style={styles.paletteGrid}>
              {PALETTE.map(c => (
                <TouchableOpacity key={c} onPress={() => { setColor(c); setTool('pen'); setShowPalette(false); }}
                  style={[styles.colorDot, { backgroundColor: c },
                    c === '#FFFFFF' && { borderWidth: 1.5, borderColor: COLORS.border },
                    color === c && tool !== 'eraser' && styles.colorDotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* 도구 */}
        <View style={styles.tools}>
          {TOOLS.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTool(t.id)}
              style={[styles.toolBtn, tool === t.id && (t.id === 'eraser' ? styles.toolBtnEraser : styles.toolBtnActive)]}>
              <Text style={styles.toolIcon}>{t.icon}</Text>
              <Text style={[styles.toolLabel, tool === t.id && styles.toolLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.toolBtn} onPress={undo}>
            <Text style={styles.toolIcon}>↩️</Text>
            <Text style={styles.toolLabel}>되돌리기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={clearAll}>
            <Text style={styles.toolIcon}>🗑️</Text>
            <Text style={styles.toolLabel}>전체지우기</Text>
          </TouchableOpacity>
        </View>

        {/* ── 윤곽선 인라인 섹션 ── */}
        <View style={styles.outlineSection}>
          <Text style={styles.outlineSectionTitle}>📐 윤곽선{overlay ? ` · ${overlay.name}` : ''}</Text>

          {/* 카테고리 탭 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 8 }}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} onPress={() => { setCategory(c); setQdResults([]); }}
                style={[styles.catChip, category === c && styles.catChipActive]}>
                <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick Draw 검색 */}
          <View style={styles.qdRow}>
            <TextInput style={styles.qdInput} value={qdQuery} onChangeText={setQdQuery}
              placeholder="⚡ Quick Draw 검색 (예: 강아지, 꽃)"
              placeholderTextColor={COLORS.muted}
              onSubmitEditing={searchQD} returnKeyType="search" />
            <TouchableOpacity style={styles.qdBtn} onPress={searchQD}>
              <Text style={styles.qdBtnText}>검색</Text>
            </TouchableOpacity>
          </View>

          {/* QD 결과 or 카테고리 윤곽선 */}
          {qdLoading && <ActivityIndicator color={COLORS.purple} style={{ marginVertical: 12 }} />}

          {qdResults.length > 0 ? (
            <>
              <Text style={styles.qdResultLabel}>⚡ Quick Draw 결과</Text>
              <View style={styles.olGrid}>
                {qdResults.map((r, i) => (
                  <TouchableOpacity key={i} style={styles.olCard} onPress={() => stampOutline(r.path, r.name)}>
                    <Svg width={54} height={54} viewBox="0 0 24 24">
                      <Path d={r.path} stroke={COLORS.muted} strokeWidth={1.2} fill="none"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text style={styles.olName} numberOfLines={1}>{r.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              {category === '즐겨찾기' && filteredOutlines.length === 0 ? (
                <Text style={styles.qdEmpty}>☆ 윤곽선 카드의 ⭐를 눌러 즐겨찾기 추가</Text>
              ) : (
                <View style={styles.olGrid}>
                  {filteredOutlines.map((o, i) => {
                    const isFav = favorites.includes(o.name);
                    return (
                      <View key={i} style={{ position: 'relative' }}>
                        <TouchableOpacity style={styles.olCard} onPress={() => stampOutline(o.path, o.name)}>
                          <Svg width={54} height={54} viewBox="0 0 24 24">
                            <Path d={o.path} stroke={COLORS.muted} strokeWidth={1.2} fill="none"
                              strokeLinecap="round" strokeLinejoin="round" />
                          </Svg>
                          <Text style={styles.olName} numberOfLines={1}>{o.name}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.starBtn} onPress={() => handleToggleFavorite(o.name)}>
                          <Text style={{ fontSize: 13 }}>{isFav ? '⭐' : '☆'}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>

      </ScrollView>

      {/* 하단 고정 완성 버튼 */}
      <View style={styles.doneBtnWrap}>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>✍️ 그림일기로 완성하기</Text>
        </TouchableOpacity>
      </View>

      {/* 전체화면 그리기 모달 (가로 3단 레이아웃) */}
      <Modal visible={fullscreen} animationType="fade" statusBarTranslucent
        supportedOrientations={['landscape']} onRequestClose={exitFullscreen}>
        <SafeAreaView style={styles.fullWrap}>

          {/* 왼쪽 사이드바: 도구 + 색상 */}
          <View style={styles.fullLeft}>
            <View style={styles.fullSep} />

            {/* 도구 버튼 */}
            {[...TOOLS, { id: 'undo', icon: '↩️', label: '되돌리기' }, { id: 'clear', icon: '🗑️', label: '지우기' }].map(t => (
              <TouchableOpacity key={t.id}
                onPress={() => {
                  if (t.id === 'undo') { setStrokes(s => s.slice(0, -1)); return; }
                  if (t.id === 'clear') { setStrokes([]); return; }
                  setTool(t.id);
                }}
                style={[styles.fullSideBtn,
                  tool === t.id && t.id !== 'undo' && t.id !== 'clear' &&
                  (t.id === 'eraser' ? styles.fullSideBtnEraser : styles.fullSideBtnActive)]}>
                <Text style={styles.fullSideIcon}>{t.icon}</Text>
                <Text style={styles.fullSideLabel}>{t.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.fullSep} />

            {/* 색상 팔레트 (2열) */}
            <View style={styles.fullPalette}>
              {PALETTE.map(c => (
                <TouchableOpacity key={c} onPress={() => { setColor(c); setTool('pen'); }}
                  style={[styles.fullDot, { backgroundColor: c },
                    c === '#FFFFFF' && { borderWidth: 1, borderColor: COLORS.border },
                    color === c && tool !== 'eraser' && styles.fullDotActive]} />
              ))}
            </View>
          </View>

          {/* 가운데: 캔버스 */}
          <View style={styles.fullCenter}>
            {/* 캔버스 상단 바: 도움말 + 닫기 */}
            <View style={styles.fullTopbar}>
              <TouchableOpacity style={[styles.fullTopbarBtn, styles.fullHelpBtn]} onPress={() => Alert.alert(
                '크게 그리기 도움말 🎨',
                '• 왼쪽 도구와 색상으로 그림을 그려요\n• 오른쪽 윤곽선을 탭하면 따라 그리기 도움이 돼요\n• ↩️ 되돌리기로 실수를 취소할 수 있어요\n• ✕ 버튼을 누르면 세로 화면으로 돌아가요',
                [{ text: '확인' }]
              )}>
                <Text style={styles.fullTopbarBtnTxt}>?</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fullTopbarBtn} onPress={exitFullscreen}>
                <Text style={styles.fullTopbarBtnTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            <GestureDetector gesture={fullGesture}>
            <View style={styles.fullCanvas}
              onLayout={onFullCanvasLayout}>
              <Svg
                width={lsDims.w > 1 ? lsDims.w : '100%'}
                height={lsDims.h > 1 ? lsDims.h : '100%'}
                style={StyleSheet.absoluteFill}>
                {overlay && (
                  <G>
                    <Path d={overlay.path} stroke={COLORS.purple}
                      strokeWidth={0.6} fill="none" strokeLinecap="round"
                      strokeLinejoin="round" strokeDasharray="2 3" opacity={0.5}
                      transform={`scale(${lsDims.w / 24}, ${lsDims.h / 24})`} />
                  </G>
                )}
                <CompletedStrokes strokes={strokes} toPathD={toPathD} />
                {fullCurrentStroke.current && (
                  <Path d={toPathD(fullCurrentStroke.current.points)}
                    stroke={fullCurrentStroke.current.color}
                    strokeWidth={fullCurrentStroke.current.strokeWidth}
                    fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </Svg>
              {!strokes.length && !overlay && (
                <Text style={styles.hint}>크게 그려보세요 ✏️</Text>
              )}
            </View>
            </GestureDetector>
          </View>

          {/* 오른쪽 사이드바: 윤곽선 */}
          <View style={styles.fullRight}>
            <Text style={styles.fullRightTitle}>⭐ 윤곽선</Text>
            <View style={styles.fullQdRow}>
              <TextInput style={styles.fullQdInput} value={fullQdQuery}
                onChangeText={setFullQdQuery} placeholder="검색..." placeholderTextColor={COLORS.muted}
                onSubmitEditing={searchFullQD} returnKeyType="search" />
              <TouchableOpacity style={styles.fullQdBtn} onPress={searchFullQD}>
                <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 12 }}>검색</Text>
              </TouchableOpacity>
            </View>
            {fullQdLoading && <ActivityIndicator color={COLORS.purple} style={{ marginTop: 8 }} />}
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.fullOutlineGrid}>
                {(fullQdResults.length ? fullQdResults : outlines).map((o, i) => (
                  <TouchableOpacity key={i} style={styles.fullOutlineCard}
                    onPress={() => stampOutline(o.path, o.name)}>
                    <Svg width={36} height={36} viewBox="0 0 24 24">
                      <Path d={o.path} stroke={COLORS.muted} strokeWidth={1.2} fill="none"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text style={styles.fullOutlineName} numberOfLines={1}>{o.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 18, color: COLORS.purple, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.ink, flex: 1 },
  overlayRemoveBtn: { backgroundColor: COLORS.orangeLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  overlayRemoveTxt: { fontSize: 12, fontWeight: '700', color: COLORS.orange },
  canvasContainer: { marginHorizontal: 16, position: 'relative' },
  canvasWrap: { borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  micBtn: {
    position: 'absolute', bottom: 10, right: 10,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.purple,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.25,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  micBtnRecording: { backgroundColor: COLORS.red },
  micBtnTouch: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  micEmoji: { fontSize: 20 },
  micLabel: { fontSize: 8, color: COLORS.white, fontWeight: '800' },
  canvas: { backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  hintWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 15, color: COLORS.muted, textAlign: 'center' },
  toolSection: { marginHorizontal: 16, marginTop: 12 },
  paletteToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10 },
  currentColor: { width: 22, height: 22, borderRadius: 11 },
  paletteToggleText: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, marginTop: 8, backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotActive: { borderWidth: 3, borderColor: COLORS.purple, transform: [{ scale: 1.15 }] },
  tools: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, gap: 6 },
  toolBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 10, gap: 3 },
  toolBtnActive: { backgroundColor: COLORS.purpleSoft, borderColor: COLORS.purple },
  toolBtnEraser: { backgroundColor: COLORS.orangeLight, borderColor: COLORS.orange },
  toolIcon: { fontSize: 18 },
  toolLabel: { fontSize: 10, fontWeight: '700', color: COLORS.muted },
  toolLabelActive: { color: COLORS.purple },
  // 윤곽선 인라인 섹션
  outlineSection: { marginTop: 12, paddingBottom: 8 },
  outlineSectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.ink, marginHorizontal: 16, marginBottom: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border },
  catChipActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  catChipText: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  catChipTextActive: { color: COLORS.white },
  qdRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  qdInput: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13, borderWidth: 1.5, borderColor: COLORS.border, color: COLORS.ink },
  qdBtn: { backgroundColor: COLORS.purple, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  qdBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  qdResultLabel: { fontSize: 11, fontWeight: '800', color: COLORS.purple, marginHorizontal: 16, marginBottom: 6 },
  qdEmpty: { textAlign: 'center', color: COLORS.muted, fontSize: 13, marginVertical: 16 },
  olGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  olCard: { width: 80, alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 14, padding: 8, borderWidth: 1.5, borderColor: COLORS.border },
  olName: { fontSize: 10, color: COLORS.muted, marginTop: 4, textAlign: 'center', fontWeight: '700' },
  starBtn: { position: 'absolute', top: 3, right: 3, padding: 2 },
  // 하단 고정 완성 버튼
  doneBtnWrap: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1.5, borderTopColor: COLORS.border,
  },
  doneBtn: { backgroundColor: COLORS.purple, borderRadius: 18, paddingVertical: 15, alignItems: 'center', elevation: 4, shadowColor: COLORS.purple, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  doneBtnText: { fontSize: 16, fontWeight: '900', color: COLORS.white },
  // 확대 버튼
  expandBtn: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: 'rgba(94,63,140,0.85)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center',
  },
  expandBtnText: { fontSize: 16, color: COLORS.white },
  expandBtnLabel: { fontSize: 9, color: COLORS.white, fontWeight: '800' },
  canvasTopRight: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', gap: 6,
  },
  canvasIconBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(94,63,140,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  canvasIconTxt: { fontSize: 14, color: COLORS.white, fontWeight: '900' },

  // 전체화면 3단 레이아웃
  fullWrap: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.bg },

  // 왼쪽 사이드바
  fullLeft: {
    width: 100, backgroundColor: COLORS.white,
    borderRightWidth: 1.5, borderRightColor: COLORS.border,
    paddingVertical: 12, paddingHorizontal: 8, gap: 6,
  },
  fullSep: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  fullSideBtn: {
    alignItems: 'center', paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.bg, gap: 2,
  },
  fullSideBtnActive: { backgroundColor: COLORS.purpleSoft, borderColor: COLORS.purple },
  fullSideBtnEraser: { backgroundColor: COLORS.orangeLight, borderColor: COLORS.orange },
  fullSideIcon: { fontSize: 18 },
  fullSideLabel: { fontSize: 9, fontWeight: '700', color: COLORS.muted },
  fullPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center' },
  fullDot: { width: 24, height: 24, borderRadius: 12 },
  fullDotActive: { borderWidth: 2.5, borderColor: COLORS.purple, transform: [{ scale: 1.15 }] },

  // 가운데 캔버스
  fullCenter: { flex: 1, backgroundColor: COLORS.white, flexDirection: 'column' },
  fullTopbar: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', paddingHorizontal: 8, gap: 6,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1.5, borderBottomColor: COLORS.border,
  },
  fullTopbarBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.purpleSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  fullHelpBtn: { backgroundColor: COLORS.purpleLight },
  fullTopbarBtnTxt: { fontSize: 14, fontWeight: '900', color: COLORS.purple },
  fullCanvas: { flex: 1, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },

  // 오른쪽 사이드바
  fullRight: {
    width: 160, backgroundColor: COLORS.bg,
    borderLeftWidth: 1.5, borderLeftColor: COLORS.border,
    padding: 12,
  },
  fullRightTitle: { fontSize: 12, fontWeight: '900', color: COLORS.ink, marginBottom: 6 },
  fullQdRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  fullQdInput: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 8,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, color: COLORS.ink,
  },
  fullQdBtn: { backgroundColor: COLORS.purple, borderRadius: 8, paddingHorizontal: 6, justifyContent: 'center' },
  fullOutlineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  fullOutlineCard: {
    width: 60, alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 10, padding: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  fullOutlineName: { fontSize: 9, color: COLORS.muted, marginTop: 2, textAlign: 'center', fontWeight: '700' },
  // 윤곽선 시트
  outlineGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, paddingBottom: 20 },
  outlineCardWrap: { position: 'relative' },
  outlineCard: { width: 90, alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 14, padding: 10, borderWidth: 1.5, borderColor: COLORS.border },
  outlineName: { fontSize: 11, color: COLORS.muted, marginTop: 4, textAlign: 'center', fontWeight: '700' },
});
