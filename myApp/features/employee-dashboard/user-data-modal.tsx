import { Modal, Pressable, Text, View } from 'react-native';

import { GlassButton } from '@/components/glass-button';
import type { UserOut } from '@/utils/api';
import { userRoleLabelRu } from '@/utils/user-role-label';

import { styles } from './styles';
import { maskEmail } from './utils';

type Props = {
  visible: boolean;
  onClose: () => void;
  user: UserOut;
};

function officeLabel(user: UserOut): string {
  const name = user.office?.name?.trim();
  if (name) return name;
  if (user.office_id != null && user.office_id !== 0) {
    return `Офис #${user.office_id}`;
  }
  return 'Не указано';
}

/** true = зелёный кружок; false = красный; если поля нет — считаем активным */
function resolveUserActive(user: UserOut): boolean {
  if (user.is_active === false) return false;
  return true;
}

export function UserDataModal({ visible, onClose, user }: Props) {
  const active = resolveUserActive(user);
  const jt = user.job_title?.trim();
  const pos = user.position?.trim();
  const city = user.office?.city?.trim();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.userDataModalTitleRow}>
            <View
              style={[styles.userStatusDot, active ? styles.userStatusDotActive : styles.userStatusDotInactive]}
              accessibilityLabel={active ? 'Пользователь активен' : 'Пользователь неактивен'}
            />
            <Text style={styles.userDataModalHeading}>Данные пользователя</Text>
            <Text style={styles.userDataTitleSep}>·</Text>
            <Text style={styles.userDataModalUserName} numberOfLines={1} ellipsizeMode="tail">
              {user.full_name}
            </Text>
          </View>
          <View style={styles.userDataModalBody}>
            <Text style={styles.profileLine}>Логин: {user.login}</Text>
            <Text style={styles.profileLine}>Email: {maskEmail(user.email)}</Text>
            <Text style={styles.profileLine}>Роль: {userRoleLabelRu(user.role)}</Text>
            <Text style={styles.profileLine}>Подразделение: {officeLabel(user)}</Text>
            {jt ? <Text style={styles.profileLine}>Должность: {jt}</Text> : null}
            {pos ? <Text style={styles.profileLine}>Позиция: {pos}</Text> : null}
            {city ? <Text style={styles.profileLine}>Город: {city}</Text> : null}
          </View>
          <GlassButton
            title="Закрыть"
            variant="large"
            onPress={onClose}
            containerStyle={styles.userDataModalCloseBtn}
          />
        </View>
      </View>
    </Modal>
  );
}
