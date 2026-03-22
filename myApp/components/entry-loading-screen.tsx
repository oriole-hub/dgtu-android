import { ActivityIndicator, StyleSheet, View } from 'react-native';

/** Стандартный экран загрузки без кастомного изображения. */
export function EntryLoadingScreen() {
  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color="#101828" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
