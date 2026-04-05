import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { wt } from '../lib/theme';

type Props = {
  /** 0–100 */
  progress: number;
};

export function OrderProgress({ progress }: Props) {
  const [trackW, setTrackW] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  const clamped = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 550,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  function onTrackLayout(e: LayoutChangeEvent) {
    setTrackW(e.nativeEvent.layout.width);
  }

  const fillWidth =
    trackW > 0
      ? anim.interpolate({
          inputRange: [0, 100],
          outputRange: [0, trackW],
        })
      : 0;

  return (
    <View style={styles.wrap} onLayout={onTrackLayout}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: fillWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: wt.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: wt.accentLight,
  },
});
