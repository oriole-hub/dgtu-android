import { Image, StyleSheet, View } from 'react-native';

/** Шапка: логотип приложения */
export function RostelecomHeader() {
  return (
    <View style={styles.row}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Логотип"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  logo: {
    width: 280,
    height: 64,
  },
});
