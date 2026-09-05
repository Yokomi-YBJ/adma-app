import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import { colors } from '../../constants/colors';

export default function LegalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>Confidentialité & CGU</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <ShieldCheck size={20} color={colors.primary} />
          </View>

          <Text style={styles.sectionTitle}>Protection des données</Text>
          <Text style={styles.text}>
            ADMA collecte uniquement les informations nécessaires à la mise en relation entre clients et prestataires.
            Les données de contact, les photos et les identifiants sont traités avec un niveau de sécurité adapté à la plateforme.
          </Text>

          <Text style={styles.sectionTitle}>Utilisation</Text>
          <Text style={styles.text}>
            L’application ne doit pas être utilisée pour diffuser des contenus illicites, des menaces, du spam ou des informations mensongères.
            Les prestataires doivent fournir des informations exactes et les clients doivent utiliser la plateforme de manière responsable.
          </Text>

          <Text style={styles.sectionTitle}>Responsabilité</Text>
          <Text style={styles.text}>
            ADMA agit comme un intermédiaire de mise en relation. La vérification, les contacts et les transactions restent sous la responsabilité des parties concernées.
            L’application peut supprimer ou bloquer un compte en cas de comportement abusif, fraude ou non-respect de la charte.
          </Text>

          <Text style={styles.sectionTitle}>Droit d’accès</Text>
          <Text style={styles.text}>
            Vous pouvez demander l’accès, la modification ou la suppression de vos données personnelles depuis les paramètres de votre compte.
            Les demandes peuvent être traitées selon les règles applicables et les contraintes de sécurité liées à la plateforme.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 20,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  text: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
