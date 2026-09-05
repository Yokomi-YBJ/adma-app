import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { colors } from '../../constants/colors';

export function Input({
  label, value, onChangeText, placeholder, error,
  hint, secureTextEntry = false, keyboardType = 'default',
  multiline = false, numberOfLines = 1, maxLength,
  prefix, suffix, icon: Icon, editable = true,
  autoCapitalize = 'sentences', style, containerStyle,
  rightAction, returnKeyType, onSubmitEditing,
  showCharCount = false,
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible]  = useState(false);

  const isSecure = secureTextEntry && !visible;
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      )}
      <View style={[
        styles.inputWrapper,
        { borderColor },
        focused && styles.focused,
        !editable && styles.disabled,
        multiline && styles.multiline,
      ]}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        {Icon && <Icon size={18} color={focused ? colors.primary : colors.textMuted} style={styles.icon} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          maxLength={maxLength}
          editable={editable}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            multiline && styles.textArea,
            style,
          ]}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setVisible(!visible)} style={styles.eyeBtn}>
            {visible
              ? <EyeOff size={18} color={colors.textMuted} />
              : <Eye    size={18} color={colors.textMuted} />
            }
          </TouchableOpacity>
        )}
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
        {rightAction}
      </View>
      <View style={styles.footer}>
        {error ? (
          <View style={styles.errorRow}>
            <AlertCircle size={13} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
        {showCharCount && maxLength && (
          <Text style={styles.charCount}>{(value || '').length}/{maxLength}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { marginBottom: 16 },
  label:        { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  labelError:   { color: colors.danger },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  focused:    { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  disabled:   { backgroundColor: colors.surface, opacity: 0.6 },
  multiline:  { alignItems: 'flex-start', paddingVertical: 12 },
  icon:       { marginRight: 10 },
  prefix:     { fontSize: 15, fontWeight: '700', color: colors.primary, marginRight: 8 },
  suffix:     { fontSize: 14, color: colors.textMuted, marginLeft: 4 },
  input: {
    flex: 1, fontSize: 15, color: colors.text,
    paddingVertical: 11,
  },
  textArea:   { textAlignVertical: 'top', paddingTop: 4 },
  eyeBtn:     { padding: 4, marginLeft: 4 },
  footer:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  errorRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText:  { fontSize: 12, color: colors.danger },
  hint:       { fontSize: 12, color: colors.textMuted },
  charCount:  { fontSize: 11, color: colors.textMuted },
});
