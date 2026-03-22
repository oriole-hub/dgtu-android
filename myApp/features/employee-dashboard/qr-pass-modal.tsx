import { Image, Modal, Pressable, Text, View } from 'react-native';
import QRCodeStyled from 'react-native-qrcode-styled';

import { formatCountdown } from './utils';
import { styles } from './styles';

type Props = {
  visible: boolean;
  onClose: () => void;
  qrValue: string;
  passExpiresAtMs: number | null;
  countdownRemainingMs: number;
};

export function QrPassModal({
  visible,
  onClose,
  qrValue,
  passExpiresAtMs,
  countdownRemainingMs,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>QR для входа в здание</Text>
          {passExpiresAtMs != null ? (
            <Text style={styles.modalSubtitle}>
              Действителен ещё: {formatCountdown(countdownRemainingMs)}
            </Text>
          ) : null}
          {qrValue ? (
            <View style={styles.qrBox}>
              <View style={styles.qrWithLogo}>
                <QRCodeStyled
                  data={qrValue}
                  size={220}
                  padding={12}
                  style={styles.qrCode}
                  gradient={{
                    type: 'radial',
                    options: {
                      colors: ['#000000', '#7700FF'],
                      center: [0.5, 0.5],
                      radius: [1, 1],
                      locations: [0, 1],
                    },
                  }}
                />
                <View style={styles.qrLogoBackdrop} pointerEvents="none">
                  <Image
                    source={require('@/assets/images/logo.png')}
                    style={styles.qrLogoOverlay}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.mutedLine}>Нет данных пропуска</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
