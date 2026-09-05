import { View, Text, StyleSheet } from 'react-native';
import { SearchX } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { Button } from './Button';

export function EmptyState({ icon: Icon = SearchX, title = 'Aucun resultat', message, action, actionLabel }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon size={40} color={colors.textMuted} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {action && actionLabel && (
        <Button title={actionLabel} onPress={action} variant="secondary" size="sm" style={{ marginTop: 20 }} fullWidth={false} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, minHeight: 200 },
  iconWrap:  { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title:     { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 },
  message:   { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
