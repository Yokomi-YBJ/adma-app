import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { colors } from '../../constants/colors';

export default function SuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Check size={36} color={colors.white} strokeWidth={3} />
        </View>

        <Text style={styles.title}>{t('payment.success.title')}</Text>
        <Text style={styles.body}>
          {t('payment.success.body', { plan: params.plan })}
        </Text>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>{t('payment.success.amountLabel')}</Text>
          <Text style={styles.amountValue}>
            {parseInt(params.amount || 0, 10).toLocaleString('fr-FR')} FCFA
          </Text>
        </View>

        <Text style={styles.hint}>{t('payment.success.hint')}</Text>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.doneBtn} onPress={() => router.replace('/(tabs)/profile')}>
          <Text style={styles.doneBtnText}>{t('payment.success.done')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.success || '#10B981',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, textAlign: 'center', marginBottom: 8 },
  body: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 32, paddingHorizontal: 16 },
  amountBox: {
    backgroundColor: colors.white, borderRadius: 16, paddingVertical: 16,
    paddingHorizontal: 32, borderWidth: 1, borderColor: colors.borderLight,
    alignItems: 'center', marginBottom: 24,
  },
  amountLabel: {
    fontSize: 12, color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 6,
  },
  amountValue: { fontSize: 24, fontWeight: '800', color: colors.navy },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  footer: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 0 : 24, paddingTop: 12 },
  doneBtn: {
    backgroundColor: colors.navy, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  doneBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});