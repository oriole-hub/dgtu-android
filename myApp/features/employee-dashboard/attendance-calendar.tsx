import { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { GlassPanel } from '@/components/glass-panel';

import { WEEKDAYS_SHORT } from './constants';
import { styles } from './styles';
import { attendanceCellKey } from './utils';

export type CalendarMark = 'ontime' | 'late';

const TABLE_COLS = 7;
/** Горизонтальный зазор между «ячейками» таблицы (как border-spacing) */
const TABLE_GAP = 2;

function chunkWeeks(days: Array<number | null>): Array<Array<number | null>> {
  const rows: Array<Array<number | null>> = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }
  return rows;
}

/** Ширины 7 колонок в сумме дают ровно `tableWidth` с учётом зазоров (без «плавающего» flex). */
function columnWidthsPx(tableWidth: number): number[] {
  if (tableWidth <= 0) return Array(TABLE_COLS).fill(0);
  const inner = tableWidth - (TABLE_COLS - 1) * TABLE_GAP;
  const base = Math.floor(inner / TABLE_COLS);
  const remainder = inner - base * TABLE_COLS;
  return Array.from({ length: TABLE_COLS }, (_, i) => base + (i < remainder ? 1 : 0));
}

type Props = {
  monthTitle: string;
  gridDays: Array<number | null>;
  attendanceCalendarMarks: Record<string, CalendarMark>;
  currentYear: number;
  currentMonth: number;
  onMonthPrev: () => void;
  onMonthNext: () => void;
  attendanceLoading: boolean;
  attendanceError: string;
  /** Посещения за выбранный месяц (по `days` из ответа) */
  visitsCount: number;
};

export function AttendanceCalendar({
  monthTitle,
  gridDays,
  attendanceCalendarMarks,
  currentYear,
  currentMonth,
  onMonthPrev,
  onMonthNext,
  attendanceLoading,
  attendanceError,
  visitsCount,
}: Props) {
  const weeks = useMemo(() => chunkWeeks(gridDays), [gridDays]);
  const { width: screenW } = useWindowDimensions();
  const estimatedW = Math.max(260, screenW - 44 - 36);
  const [tableWidth, setTableWidth] = useState(estimatedW);

  const onTableLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w <= 0) return;
    setTableWidth((prev) => (Math.abs(w - prev) >= 0.5 ? w : prev));
  }, []);

  const colW = useMemo(() => columnWidthsPx(tableWidth), [tableWidth]);

  return (
    <GlassPanel style={styles.calendarPanel}>
      <Text style={styles.cardTitle}>Календарь посещений</Text>
      <View style={styles.visitsCounterRow}>
        <Text style={styles.visitsCounterValue}>Посещений: {visitsCount}</Text>
        <Text style={styles.visitsCounterHint}>за этот месяц</Text>
      </View>
      <View style={styles.calendarLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendSwatchOntime]} />
          <Text style={styles.legendText}>вовремя</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendSwatchLate]} />
          <Text style={styles.legendText}>опоздал</Text>
        </View>
      </View>
      <View style={styles.calendarMonthRow}>
        <Pressable onPress={onMonthPrev} style={styles.monthNavBtn} hitSlop={8}>
          <Text style={styles.monthNavText}>‹</Text>
        </Pressable>
        <Text style={styles.calendarMonth} numberOfLines={1}>
          {monthTitle}
        </Text>
        <Pressable onPress={onMonthNext} style={styles.monthNavBtn} hitSlop={8}>
          <Text style={styles.monthNavText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.calendarTableWrap} onLayout={onTableLayout}>
        <View style={[styles.calendarTableHeaderRow, { columnGap: TABLE_GAP }]}>
          {WEEKDAYS_SHORT.map((day, ci) => (
            <View
              key={day}
              accessibilityRole="header"
              style={[styles.calendarTableTh, { width: colW[ci] ?? 0 }]}>
              <Text style={styles.weekHeadCell}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.calendarTableBody}>
          {weeks.map((row, ri) => (
            <View key={`cal-row-${ri}`} style={[styles.calendarTableRow, { columnGap: TABLE_GAP }]}>
              {row.map((day, ci) => {
                const idx = ri * TABLE_COLS + ci;
                const w = colW[ci] ?? 0;
                const cellFrameStyle = [styles.calendarTableCell, { width: w, height: w }];
                if (!day) {
                  return (
                    <View key={`e-${idx}`} style={cellFrameStyle}>
                      <View style={[styles.calendarDaySquare, styles.calendarDaySquareMuted]} />
                    </View>
                  );
                }
                const k = attendanceCellKey(currentYear, currentMonth, day);
                const mark = attendanceCalendarMarks[k];
                const squareStyle =
                  mark === 'ontime'
                    ? styles.calendarDaySquareOntime
                    : mark === 'late'
                      ? styles.calendarDaySquareLate
                      : styles.calendarDaySquareNeutral;
                const textStyle =
                  mark === 'ontime'
                    ? styles.calendarDayTextOntime
                    : mark === 'late'
                      ? styles.calendarDayTextLate
                      : null;
                return (
                  <View key={`d-${day}-${idx}`} style={cellFrameStyle}>
                    <View style={[styles.calendarDaySquare, squareStyle]}>
                      <Text style={[styles.calendarDayText, textStyle]}>{day}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      {attendanceLoading ? <Text style={styles.historyHint}>Загружаем историю...</Text> : null}
      {!attendanceLoading && attendanceError ? (
        <Text style={styles.historyHint}>{attendanceError}</Text>
      ) : null}
    </GlassPanel>
  );
}
