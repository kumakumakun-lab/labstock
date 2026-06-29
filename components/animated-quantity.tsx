import { useEffect, useRef, useState } from "react";
import { Text, Animated, StyleSheet, View, type TextStyle } from "react-native";

interface AnimatedQuantityProps {
  value: number;
  style?: TextStyle;
  color: string;
}

/**
 * 在庫数の増減アニメーションコンポーネント
 * 数値が変わるとスケール + スライド + カウントアニメーションで変化を視覚的に表現
 * +/-操作時にリアルタイムで数値が増減する
 */
export function AnimatedQuantity({ value, style, color }: AnimatedQuantityProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      const isIncrease = value > prevValue.current;
      const prevVal = prevValue.current;
      prevValue.current = value;

      // カウントアニメーション（数値が段階的に変わる）
      const diff = Math.abs(value - prevVal);
      const steps = Math.min(diff, 10); // 最大10ステップ
      const stepDuration = Math.min(200 / steps, 50); // 合計200ms以内

      if (steps <= 1) {
        // 差が1の場合は即座に更新
        setDisplayValue(value);
      } else {
        // 段階的にカウント
        let currentStep = 0;
        const interval = setInterval(() => {
          currentStep++;
          const progress = currentStep / steps;
          const interpolated = Math.round(prevVal + (value - prevVal) * progress);
          setDisplayValue(interpolated);
          if (currentStep >= steps) {
            clearInterval(interval);
            setDisplayValue(value);
          }
        }, stepDuration);
      }

      // スライド + スケールアニメーション
      const slideDirection = isIncrease ? -12 : 12;

      // リセット
      translateYAnim.setValue(slideDirection);
      opacityAnim.setValue(0.3);
      scaleAnim.setValue(isIncrease ? 1.15 : 0.85);

      // アニメーション実行
      Animated.parallel([
        Animated.spring(translateYAnim, {
          toValue: 0,
          friction: 8,
          tension: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [value, scaleAnim, translateYAnim, opacityAnim]);

  // 初回マウント時にdisplayValueを同期
  useEffect(() => {
    setDisplayValue(value);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[
          style,
          {
            color,
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        {displayValue}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
