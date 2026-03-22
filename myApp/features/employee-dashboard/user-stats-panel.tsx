import { Text, View } from 'react-native';

import { GlassPanel } from '@/components/glass-panel';
import type { UserOut } from '@/utils/api';

import { styles } from './styles';
import {
  formatBreakDurationSeconds,
  formatLateToday,
  formatMeDateTime,
  formatOvertimeToday,
  formatWorkStartTime,
} from './utils';

type Props = {
  user: UserOut;
};

export function UserStatsPanel({ user }: Props) {
  return (
    <GlassPanel style={styles.statsPanel}>
      <Text style={styles.cardTitle}>Статистика</Text>
      <View style={styles.statsBlock}>
        <Text style={styles.statsSubheading}>Сегодня</Text>
        <Text style={styles.profileLine}>
          Время начала работы: {formatWorkStartTime(user.office?.work_start_time)}
        </Text>
        <Text style={styles.profileLine}>Опоздание: {formatLateToday(user.late_minutes_today)}</Text>
        <Text style={styles.profileLine}>Переработка: {formatOvertimeToday(user.overtime_minutes_today)}</Text>
      </View>
      <View style={styles.statsBlock}>
        <Text style={styles.statsSubheading}>Последние события</Text>
        <Text style={styles.profileLine}>Вход: {formatMeDateTime(user.last_in_at)}</Text>
        <Text style={styles.profileLine}>Выход: {formatMeDateTime(user.last_out_at)}</Text>
        <Text style={styles.profileLine}>Перерыв, ушёл: {formatMeDateTime(user.last_break_out_at)}</Text>
        <Text style={styles.profileLine}>Перерыв, вернулся: {formatMeDateTime(user.last_break_in_at)}</Text>
        <Text style={styles.profileLine}>
          Длительность перерыва: {formatBreakDurationSeconds(user.last_break_duration_seconds)}
        </Text>
      </View>
    </GlassPanel>
  );
}
