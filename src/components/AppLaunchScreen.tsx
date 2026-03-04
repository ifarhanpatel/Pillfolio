import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { Fonts } from '@/constants/theme';
import type { ResolvedThemeMode } from '@/src/theme/theme-preference';

const BRAND_ICON: ImageSourcePropType = require('../../assets/images/splash-icon.png');

const SCREEN_THEME = {
  light: {
    background: '#F6F5F2',
    glowPrimary: 'rgba(154, 177, 211, 0.16)',
    glowSecondary: 'rgba(202, 214, 232, 0.2)',
    iconShadow: 'rgba(120, 146, 187, 0.26)',
    title: '#101A37',
    subtitle: '#7B8EAD',
    track: '#D8E3EF',
    fill: '#7AA9EB',
    marker: '#C8D5E7',
  },
  dark: {
    background: '#07101D',
    glowPrimary: 'rgba(35, 64, 110, 0.34)',
    glowSecondary: 'rgba(19, 39, 70, 0.34)',
    iconShadow: 'rgba(8, 22, 43, 0.5)',
    title: '#EEF4FF',
    subtitle: '#9DB3D4',
    track: '#19314F',
    fill: '#6EA7FF',
    marker: '#274A73',
  },
} as const;

type AppLaunchScreenProps = {
  colorScheme: ResolvedThemeMode;
};

export function AppLaunchScreen({ colorScheme }: AppLaunchScreenProps) {
  const palette = SCREEN_THEME[colorScheme];
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0.28,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.92,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    progressLoop.start();
    pulseLoop.start();

    return () => {
      progressLoop.stop();
      pulseLoop.stop();
      progress.stopAnimation();
      pulse.stopAnimation();
    };
  }, [progress, pulse]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['18%', '64%'],
  });

  return (
    <View
      style={[styles.container, { backgroundColor: palette.background }]}
      testID="launch-splash-screen">
      <View style={[styles.glowLarge, { backgroundColor: palette.glowPrimary }]} />
      <View style={[styles.glowSmall, { backgroundColor: palette.glowSecondary }]} />

      <View style={styles.hero}>
        <Animated.View
          style={[
            styles.iconFrame,
            {
              shadowColor: palette.iconShadow,
              transform: [{ scale: pulse }],
            },
          ]}>
          <Image source={BRAND_ICON} style={styles.icon} resizeMode="contain" />
        </Animated.View>
        <Text style={[styles.wordmark, { color: palette.title }]}>pillfolio</Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.tagline, { color: palette.subtitle }]}>SECURING YOUR PRESCRIPTIONS</Text>
        <View style={[styles.progressTrack, { backgroundColor: palette.track }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: palette.fill, width: progressWidth }]} />
        </View>
        <View style={[styles.marker, { backgroundColor: palette.marker }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 112,
    paddingBottom: 96,
  },
  glowLarge: {
    position: 'absolute',
    top: 96,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.7,
  },
  glowSmall: {
    position: 'absolute',
    bottom: 88,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.6,
  },
  hero: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  iconFrame: {
    width: 152,
    height: 152,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  icon: {
    width: 128,
    height: 128,
  },
  wordmark: {
    fontFamily: Fonts.serif,
    fontSize: 72,
    lineHeight: 78,
    letterSpacing: -1.6,
    fontWeight: '400',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  tagline: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 5,
    textAlign: 'center',
    marginBottom: 28,
  },
  progressTrack: {
    width: 176,
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  marker: {
    width: 56,
    height: 2,
    borderRadius: 999,
    marginTop: 16,
    opacity: 0.9,
  },
});
