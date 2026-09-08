import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ShieldCheck,
  FileText,
  UserCheck,
  AlertTriangle,
  ExternalLink,
  Lock,
  Eye,
  Trash2,
  Sparkles,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';

// ─── Données des sections ────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'data',
    icon: Lock,
    label: 'Protection des données',
    color: colors.primary,
    bg: colors.primaryBg,
    text: `ADMA collecte uniquement les informations nécessaires à la mise en relation entre clients et prestataires : coordonnées, photos de profil et identifiants de compte. Ces données sont chiffrées en transit (HTTPS) et stockées sur des serveurs sécurisés. Elles ne sont jamais vendues à des tiers.`,
  },
  {
    id: 'usage',
    icon: UserCheck,
    label: "Conditions d'utilisation",
    color: '#22C55E',
    bg: '#ECFDF5',
    text: `L'application est réservée à un usage légal et responsable. Il est interdit d'y publier des contenus illicites, des menaces, du spam ou des informations mensongères. Les prestataires s'engagent à fournir des informations exactes et à jour. Tout manquement peut entraîner la suspension du compte.`,
  },
  {
    id: 'responsibility',
    icon: AlertTriangle,
    label: 'Responsabilité',
    color: '#F59E0B',
    bg: '#FFFBEB',
    text: `ADMA joue le rôle d'intermédiaire de mise en relation. La prise de contact, la négociation et les transactions sont effectuées sous la responsabilité exclusive des parties. ADMA se réserve le droit de bloquer ou supprimer tout compte en cas de comportement abusif, fraude ou non-respect de la charte.`,
  },
  {
    id: 'access',
    icon: Eye,
    label: "Droit d'accès & portabilité",
    color: '#8B5CF6',
    bg: '#F5F3FF',
    text: `Vous disposez d'un droit d'accès, de rectification et d'effacement de vos données personnelles. Ces actions sont disponibles directement depuis les paramètres de votre compte. Les demandes sont traitées dans les meilleurs délais, dans le respect des contraintes légales applicables.`,
  },
  {
    id: 'deletion',
    icon: Trash2,
    label: 'Suppression du compte',
    color: '#EF4444',
    bg: '#FEF2F2',
    text: `La suppression de votre compte entraîne l'effacement définitif de votre profil, de vos données de contact et de votre historique d'activité dans un délai de 30 jours. Certaines données peuvent être conservées plus longtemps si la loi l'exige ou en cas de litige en cours.`,
  },
];

// ─── Composant section ────────────────────────────────────────────────────────

function Section({ item, isLast }) {
  const Icon = item.icon;
  return (
    <View style={[styles.section, !isLast && styles.sectionBorder]}>
      <View style={[styles.sectionIconWrap, { backgroundColor: item.bg }]}>
        <Icon size={22} color={item.color} strokeWidth={2.2} />
      </View>
      <View style={styles.sectionBody}>
        <Text style={[styles.sectionLabel, { color: item.color }]}>{item.label}</Text>
        <Text style={styles.sectionText}>{item.text}</Text>
      </View>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function LegalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const openPrivacyPolicy = () => {
    Linking.openURL('https://adma.onrender.com/confidentialite').catch(() => {
      // Fallback : on essaie d'ouvrir dans le navigateur par défaut
      Linking.openURL('https://adma.onrender.com/confidentialite');
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={colors.navy} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confidentialité & CGU</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <ShieldCheck size={34} color={colors.white} strokeWidth={2} />
          </View>
          <Text style={styles.heroTitle}>Vos données, votre contrôle</Text>
          <Text style={styles.heroSub}>
            ADMA s'engage à protéger votre vie privée et à traiter vos données avec transparence.
          </Text>
        </View>

        {/* ── Carte des sections ── */}
        <View style={styles.card}>
          {SECTIONS.map((item, i) => (
            <Section key={item.id} item={item} isLast={i === SECTIONS.length - 1} />
          ))}
        </View>

        {/* ── Lien externe ── */}
        <TouchableOpacity
          style={styles.linkCard}
          onPress={openPrivacyPolicy}
          activeOpacity={0.8}
        >
          <View style={styles.linkLeft}>
            <View style={styles.linkIconWrap}>
              <FileText size={20} color={colors.white} strokeWidth={2} />
            </View>
            <View style={styles.linkTextWrap}>
              <Text style={styles.linkTitle}>Politique de confidentialité</Text>
              <Text style={styles.linkUrl}>adma.onrender.com/confidentialite</Text>
            </View>
          </View>
          <ExternalLink size={20} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>

        {/* ── Footer ── */}
        <Text style={styles.footer}>
          En utilisant ADMA, vous acceptez les présentes conditions.{'\n'}
          Dernière mise à jour : septembre 2026
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC', // fond plus doux
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'center',
  },

  // Scroll
  scroll: {
    padding: 16,
    gap: 16,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  // Section
  section: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 18,
    gap: 16,
  },
  sectionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  sectionBody: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  // Lien externe
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  linkIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkTextWrap: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  linkUrl: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  // Footer
  footer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginTop: 8,
  },
});