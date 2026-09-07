import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

function SkeletonBox({ style }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.box, style, { opacity: anim }]} />;
}

export function SkeletonProviderCard() {
  return (
    <View style={styles.card}>
      <SkeletonBox style={styles.image} />
      <View style={styles.info}>
        <SkeletonBox style={styles.line1} />
        <SkeletonBox style={styles.line2} />
        <SkeletonBox style={styles.line3} />
      </View>
    </View>
  );
}

export function SkeletonHome() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ height: 120, backgroundColor: colors.white, padding: 20, paddingTop: 60 }}>
        <SkeletonBox style={{ width: 180, height: 28, borderRadius: 8 }} />
        <SkeletonBox style={{ width: 120, height: 16, borderRadius: 6, marginTop: 8 }} />
      </View>
      <View style={{ margin: 20 }}>
        <SkeletonBox style={{ height: 50, borderRadius: 14 }} />
      </View>
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <SkeletonBox style={{ width: 120, height: 20, borderRadius: 6, marginBottom: 14 }} />
        <View style={{ flexDirection: 'row' }}>
          {[1,2,3,4].map((i, idx) => (
            <SkeletonBox
              key={i}
              style={{
                width: 80,
                height: 90,
                borderRadius: 16,
                marginRight: idx < 3 ? 10 : 0,
              }}
            />
          ))}
        </View>
      </View>
      {[1,2,3].map(i => <SkeletonProviderCard key={i} />)}
    </View>
  );
}

export function SkeletonProviderDetail() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SkeletonBox style={{ height: 280, borderRadius: 0 }} />
      <View style={{ padding: 20 }}>
        <SkeletonBox style={{ width: '70%', height: 26, borderRadius: 8, marginBottom: 10 }} />
        <SkeletonBox style={{ width: '50%', height: 18, borderRadius: 6, marginBottom: 16 }} />
        <SkeletonBox style={{ height: 80, borderRadius: 16, marginBottom: 16 }} />
        <SkeletonBox style={{ height: 120, borderRadius: 16 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box:   { backgroundColor: colors.surfaceAlt, borderRadius: 8 },
  card:  { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, padding: 14, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  image: { width: 76, height: 76, borderRadius: 14 },
  info:  { flex: 1, marginLeft: 14, justifyContent: 'center' },
  line1: { height: 16, width: '70%', borderRadius: 6, marginBottom: 6 },
  line2: { height: 13, width: '50%', borderRadius: 6, marginBottom: 4 },
  line3: { height: 11, width: '40%', borderRadius: 6 },
});