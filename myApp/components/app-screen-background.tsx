import type { ReactNode } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
};

/**
 * На десктопном вебе фон без картинки; в приложении и на мобильном вебе (узкая ширина) — PNG.
 */
const MOBILE_WEB_MAX_WIDTH = 768;

/**
 * Фон на весь экран: PNG на iOS/Android и на мобильном сайте; на широком вебе — только #F9F9FA.
 */
export function AppScreenBackground({ children, style }: Props) {
  const { width: w, height: h } = useWindowDimensions();
  const screen = Dimensions.get('screen');
  const width = Math.max(w, screen.width);
  const height = Math.max(h, screen.height);

  const showDecorBg =
    Platform.OS === 'ios' ||
    Platform.OS === 'android' ||
    (Platform.OS === 'web' && w <= MOBILE_WEB_MAX_WIDTH);

  return (
    <View style={[styles.root, Platform.OS === 'web' && styles.rootWeb, style]}>
      {showDecorBg ? (
        <View style={[styles.bg, { width, height }]} pointerEvents="none">
          <Image
            source={require('../assets/images/welcome-bg.png')}
            style={{ width, height }}
            resizeMode="stretch"
          />
        </View>
      ) : null}
      <View style={styles.foreground} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F9F9FA',
    position: 'relative',
    overflow: 'hidden',
  },
  rootWeb: {
    minHeight: '100%' as unknown as number,
  },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
