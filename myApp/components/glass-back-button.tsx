import type { ViewStyle } from 'react-native';

import { GlassButton } from '@/components/glass-button';

type Props = {
  onPress: () => void;
  /** По умолчанию «← Назад» */
  label?: string;
  containerStyle?: ViewStyle;
};

/** «Назад» в той же стеклянной стилистике, что и GlassButton */
export function GlassBackButton({ onPress, label = '← Назад', containerStyle }: Props) {
  return (
    <GlassButton
      title={label}
      onPress={onPress}
      variant="medium"
      containerStyle={[{ alignSelf: 'flex-start' }, containerStyle]}
    />
  );
}
