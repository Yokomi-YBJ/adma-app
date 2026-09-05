import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors } from '../../constants/colors';

const VARIANTS = {
  primary:   { bg: colors.primary,   text: colors.white,  border: colors.primary },
  secondary: { bg: colors.white,     text: colors.primary, border: colors.primary },
  danger:    { bg: colors.danger,    text: colors.white,  border: colors.danger },
  ghost:     { bg: 'transparent',    text: colors.primary, border: 'transparent' },
  navy:      { bg: colors.navy,      text: colors.white,  border: colors.navy },
  outline:   { bg: colors.white,     text: colors.text,   border: colors.border },
};

const SIZES = {
  sm:  { paddingVertical: 8,  paddingHorizontal: 16, fontSize: 13, borderRadius: 10 },
  md:  { paddingVertical: 13, paddingHorizontal: 20, fontSize: 15, borderRadius: 12 },
  lg:  { paddingVertical: 16, paddingHorizontal: 24, fontSize: 16, borderRadius: 14 },
  xl:  { paddingVertical: 18, paddingHorizontal: 28, fontSize: 17, borderRadius: 16 },
};

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  disabled = false, loading = false, style,
  icon: Icon, iconPosition = 'left', fullWidth = true,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size]       || SIZES.md;
  const opacity = disabled ? 0.45 : 1;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor:   v.bg,
          borderColor:       v.border,
          paddingVertical:   s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius:      s.borderRadius,
          opacity,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <View style={styles.inner}>
          {Icon && iconPosition === 'left' && <Icon size={s.fontSize + 2} color={v.text} style={styles.iconLeft} />}
          <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }]}>{title}</Text>
          {Icon && iconPosition === 'right' && <Icon size={s.fontSize + 2} color={v.text} style={styles.iconRight} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:      { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  inner:     { flexDirection: 'row', alignItems: 'center' },
  text:      { fontWeight: '700', letterSpacing: 0.1 },
  iconLeft:  { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});
