import React, { useRef, useState, forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// 포인트 배열 → SVG path (선형, 보정 없음)
function makePathD(points) {
  if (!points || points.length < 2) return '';
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L${points[i].x.toFixed(1)},${points[i].y.toFixed(1)}`;
  }
  return d;
}

// 완성된 획들 - memo로 현재 획 그릴 때 리렌더 차단
const CompletedStrokes = React.memo(({ strokes }) => (
  <>
    {strokes.map((s, i) => (
      <Path key={i} d={makePathD(s.points)} stroke={s.color}
        strokeWidth={s.strokeWidth} fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </>
), (prev, next) => prev.strokes === next.strokes);

const DrawCanvas = forwardRef(({
  width, height, strokes, onStrokeAdded,
  toolRef, colorRef,
}, ref) => {
  const currentStrokeRef = useRef(null);
  const [, forceUpdate] = useState(0);
  const rafRef = useRef(null);

  const scheduleRender = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      forceUpdate(n => n + 1);
      rafRef.current = null;
    });
  };

  const gesture = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((e) => {
      const t = toolRef.current;
      const c = colorRef.current;
      currentStrokeRef.current = {
        color: t === 'eraser' ? '#FFFFFF' : c,
        strokeWidth: t === 'eraser' ? 28 : t === 'thick' ? 10 : 5,
        points: [{ x: e.x, y: e.y }],
      };
      scheduleRender();
    })
    .onUpdate((e) => {
      if (!currentStrokeRef.current) return;
      const pts = currentStrokeRef.current.points;
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        // 점프 필터
        if (Math.abs(e.x - last.x) > 60 || Math.abs(e.y - last.y) > 60) return;
        // 너무 가까운 점 건너뜀 (과도한 점 생성 방지)
        const dx = e.x - last.x, dy = e.y - last.y;
        if (dx * dx + dy * dy < 4) return;
      }
      pts.push({ x: e.x, y: e.y });
      scheduleRender();
    })
    .onEnd(() => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (currentStrokeRef.current) {
        const stroke = currentStrokeRef.current;
        currentStrokeRef.current = null;
        onStrokeAdded(stroke);
        forceUpdate(n => n + 1);
      }
    })
    .onFinalize(() => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (currentStrokeRef.current) {
        const stroke = currentStrokeRef.current;
        currentStrokeRef.current = null;
        onStrokeAdded(stroke);
        forceUpdate(n => n + 1);
      }
    });

  const cur = currentStrokeRef.current;

  return (
    <GestureDetector gesture={gesture}>
      <Svg width={width} height={height} style={{ backgroundColor: '#FFFFFF' }}>
        <CompletedStrokes strokes={strokes} />
        {cur && (
          <Path d={makePathD(cur.points)} stroke={cur.color}
            strokeWidth={cur.strokeWidth} fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
      </Svg>
    </GestureDetector>
  );
});

export default DrawCanvas;
