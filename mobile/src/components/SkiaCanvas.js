import React, { useRef, useEffect, forwardRef, useCallback } from 'react';
import { Canvas, Path } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';

// 완성된 획 목록 - strokes 바뀔 때만 리렌더
const CompletedStrokes = React.memo(({ strokes }) => (
  <>
    {strokes.map((s, i) => (
      <Path key={i} path={s.svgPath} color={s.color}
        style="stroke" strokeWidth={s.strokeWidth} strokeCap="round" strokeJoin="round" />
    ))}
  </>
), (prev, next) => prev.strokes === next.strokes);

const DrawCanvas = forwardRef(({ width, height, strokes, onStrokeAdded, tool, color }, ref) => {
  // UI thread SharedValue: 그리는 중인 획의 SVG path 문자열
  const currentPath = useSharedValue('');
  const lastPt = useSharedValue({ x: -1, y: -1 });

  // 획 완료 시 JS thread에 전달할 도구 정보
  const strokeInfoRef = useRef({ color: '#3F3328', strokeWidth: 5 });
  useEffect(() => {
    strokeInfoRef.current = {
      color: tool === 'eraser' ? '#FFFFFF' : color,
      strokeWidth: tool === 'eraser' ? 28 : tool === 'thick' ? 10 : 5,
    };
  }, [tool, color]);

  // onStrokeAdded는 매 렌더마다 새로 만들어질 수 있으므로 ref로 안정화
  const onStrokeAddedRef = useRef(onStrokeAdded);
  onStrokeAddedRef.current = onStrokeAdded;

  // stable - 빈 의존성 배열, ref를 통해 항상 최신 콜백 호출
  const handleEnd = useCallback((svgPath) => {
    if (!svgPath) return;
    onStrokeAddedRef.current({ svgPath, ...strokeInfoRef.current });
  }, []);

  // UI thread에서 직접 실행되는 제스처 (runOnJS 없음)
  const gesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      currentPath.value = `M${e.x.toFixed(1)},${e.y.toFixed(1)}`;
      lastPt.value = { x: e.x, y: e.y };
    })
    .onUpdate((e) => {
      'worklet';
      const last = lastPt.value;
      if (Math.abs(e.x - last.x) > 60 || Math.abs(e.y - last.y) > 60) return;
      const dx = e.x - last.x, dy = e.y - last.y;
      if (dx * dx + dy * dy < 4) return;
      lastPt.value = { x: e.x, y: e.y };
      currentPath.value = currentPath.value + ` L${e.x.toFixed(1)},${e.y.toFixed(1)}`;
    })
    .onEnd(() => {
      'worklet';
      const p = currentPath.value;
      currentPath.value = '';
      lastPt.value = { x: -1, y: -1 };
      if (p) runOnJS(handleEnd)(p);
    })
    .onFinalize(() => {
      'worklet';
      const p = currentPath.value;
      if (p) {
        currentPath.value = '';
        lastPt.value = { x: -1, y: -1 };
        runOnJS(handleEnd)(p);
      }
    });

  const strokeColor = tool === 'eraser' ? '#FFFFFF' : color;
  const strokeWidth = tool === 'eraser' ? 28 : tool === 'thick' ? 10 : 5;

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={{ width, height, backgroundColor: '#FFFFFF' }}>
        <CompletedStrokes strokes={strokes} />
        {/* currentPath는 SharedValue → Skia가 UI thread에서 직접 업데이트 */}
        <Path path={currentPath} color={strokeColor}
          style="stroke" strokeWidth={strokeWidth} strokeCap="round" strokeJoin="round" />
      </Canvas>
    </GestureDetector>
  );
});

export default DrawCanvas;
