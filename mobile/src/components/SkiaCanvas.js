import React, { useRef, useState, forwardRef, useCallback, useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const CompletedStrokes = React.memo(({ strokes }) => (
  <>
    {strokes.map((s, i) => (
      <Path key={i} d={s.svgPath} stroke={s.color}
        strokeWidth={s.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ))}
  </>
), (prev, next) => prev.strokes === next.strokes);

const DrawCanvas = forwardRef(({ width, height, strokes, onStrokeAdded, tool, color }, ref) => {
  const [currentPath, setCurrentPath] = useState('');
  const currentPathRef = useRef('');
  const lastPtRef = useRef({ x: -1, y: -1 });
  const strokeInfoRef = useRef({ color: '#3F3328', strokeWidth: 5 });

  useEffect(() => {
    strokeInfoRef.current = {
      color: tool === 'eraser' ? '#FFFFFF' : color,
      strokeWidth: tool === 'eraser' ? 28 : tool === 'thick' ? 10 : 5,
    };
  }, [tool, color]);

  const onStrokeAddedRef = useRef(onStrokeAdded);
  onStrokeAddedRef.current = onStrokeAdded;

  const handleEnd = useCallback(() => {
    const p = currentPathRef.current;
    currentPathRef.current = '';
    lastPtRef.current = { x: -1, y: -1 };
    setCurrentPath('');
    if (p) onStrokeAddedRef.current({ svgPath: p, ...strokeInfoRef.current });
  }, []);

  const gesture = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((e) => {
      const d = `M${e.x.toFixed(1)},${e.y.toFixed(1)}`;
      currentPathRef.current = d;
      lastPtRef.current = { x: e.x, y: e.y };
      setCurrentPath(d);
    })
    .onUpdate((e) => {
      const last = lastPtRef.current;
      if (Math.abs(e.x - last.x) > 60 || Math.abs(e.y - last.y) > 60) return;
      const dx = e.x - last.x, dy = e.y - last.y;
      if (dx * dx + dy * dy < 4) return;
      lastPtRef.current = { x: e.x, y: e.y };
      const d = currentPathRef.current + ` L${e.x.toFixed(1)},${e.y.toFixed(1)}`;
      currentPathRef.current = d;
      setCurrentPath(d);
    })
    .onEnd(handleEnd)
    .onFinalize(() => {
      if (currentPathRef.current) handleEnd();
    });

  const strokeColor = tool === 'eraser' ? '#FFFFFF' : color;
  const strokeWidth = tool === 'eraser' ? 28 : tool === 'thick' ? 10 : 5;

  return (
    <GestureDetector gesture={gesture}>
      <Svg width={width} height={height} style={{ backgroundColor: '#FFFFFF' }}>
        <CompletedStrokes strokes={strokes} />
        {currentPath ? (
          <Path d={currentPath} stroke={strokeColor}
            strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
      </Svg>
    </GestureDetector>
  );
});

export default DrawCanvas;
