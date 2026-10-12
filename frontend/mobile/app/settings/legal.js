import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
  Linking, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, ShieldCheck, FileText, UserCheck,
  AlertTriangle, ExternalLink, Lock, Eye, Trash2,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';

// Les données de sections sont calculées à l'intérieur du composant
// pour avoir accès à t() (les traductions doivent être dynamiques)

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

export default function LegalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();

  const SECTIONS = [
    { id: 'data',           icon: Lock,           color: colors.primary, bg: colors.primaryBg, label: t('legal.dataTitle'),           text: t('legal.dataText') },
    { id: 'usage',          icon: UserCheck,      color: '#22C55E',      bg: '#ECFDF5',         label: t('legal.usageTitle'),          text: t('legal.usageText') },
    { id: 'responsibility', icon: AlertTriangle,  color: '#F59E0B',      bg: '#FFFBEB',         label: t('legal.responsibilityTitle'), text: t('legal.responsibilityText') },
    { id: 'access',         icon: Eye,            color: '#8B5CF6',      bg: '#F5F3FF',         label: t('legal.rightsTitle'),         text: t('legal.rightsText') },
    { id: 'deletion',       icon: Trash2,         color: '#EF4444',      bg: '#FEF2F2',         label: t('legal.cniTitle'),            text: t('legal.cniText') },
  ];

  const documents = [
    { id: 'terms', title: t('legal.termsTitle'), url: 'https://adma-app-website.vercel.app/cgu.html' },
    { id: 'privacy', title: t('legal.policyTitle'), url: 'https://adma-app-website.vercel.app/politique-confidentialite.html' },
    { id: 'mentions', title: t('legal.mentionsTitle'), url: 'https://adma-app-website.vercel.app/mentions-legales.html' },
  ];

  const openDocument = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={colors.navy} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('legal.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <ShieldCheck size={34} color={colors.white} strokeWidth={2} />
          </View>
          <Text style={styles.heroTitle}>{t('legal.heroTitle')}</Text>
          <Text style={styles.heroSub}>{t('legal.heroSub')}</Text>
        </View>

        <View style={styles.card}>
          {SECTIONS.map((item, i) => (
            <Section key={item.id} item={item} isLast={i === SECTIONS.length - 1} />
          ))}
        </View>

        {documents.map((document) => (
          <TouchableOpacity
            key={document.id}
            style={styles.linkCard}
            onPress={() => openDocument(document.url)}
            activeOpacity={0.8}
            accessibilityRole="link"
          >
            <View style={styles.linkLeft}>
              <View style={styles.linkIconWrap}>
                <FileText size={20} color={colors.white} strokeWidth={2} />
              </View>
              <View style={styles.linkTextWrap}>
                <Text style={styles.linkTitle}>{document.title}</Text>
                <Text style={styles.linkUrl}>{document.url.replace('https://', '')}</Text>
              </View>
            </View>
            <ExternalLink size={20} color={colors.white} strokeWidth={2} />
          </TouchableOpacity>
        ))}

        <Text style={styles.footer}>{t('legal.footer')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  headerTitle: {
    fontSize: 18, fontWeight: '700', color: colors.navy,
    letterSpacing: -0.3, flex: 1, textAlign: 'center',
  },
  scroll: { padding: 16, gap: 16 },

  hero: {
    alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24,
    backgroundColor: colors.white, borderRadius: 24,
    borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  heroIconWrap: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 18,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  heroTitle: {
    fontSize: 22, fontWeight: '800', color: colors.navy,
    textAlign: 'center', letterSpacing: -0.5, marginBottom: 8,
  },
  heroSub: {
    fontSize: 14, lineHeight: 22, color: colors.textSecondary,
    textAlign: 'center', maxWidth: 300,
  },

  card: {
    backgroundColor: colors.white, borderRadius: 24,
    borderWidth: 1, borderColor: colors.borderLight,
    overflow: 'hidden',
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  section: { flexDirection: 'row', alignItems: 'flex-start', padding: 18, gap: 16 },
  sectionBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  sectionIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, marginTop: 2,
  },
  sectionBody: { flex: 1 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 6, letterSpacing: -0.2 },
  sectionText: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },

  linkCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, borderRadius: 20, padding: 18,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  linkIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  linkTextWrap: { flex: 1 },
  linkTitle: { fontSize: 15, fontWeight: '700', color: colors.white, marginBottom: 2 },
  linkUrl: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  footer: {
    fontSize: 12, color: colors.textMuted, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 16, marginTop: 8,
  },
});