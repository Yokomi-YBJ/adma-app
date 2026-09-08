import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Headphones,
  Mail,
  MessageSquareText,
  ShieldAlert,
  HelpCircle,
  UserPlus,
  ShieldCheck,
  CreditCard,
  Bell,
  AlertCircle,
  ExternalLink,
  FileText,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';

// ─── Données FAQ enrichies ───────────────────────────────────────────────────

const FAQS = [
  {
    id: 'register',
    icon: UserPlus,
    question: 'Comment créer un compte ADMA ?',
    answer: 'Téléchargez l’application, cliquez sur "S’inscrire", entrez votre numéro de téléphone (+237). Vous recevrez un code OTP par SMS. Saisissez-le pour finaliser votre inscription.',
  },
  {
    id: 'provider',
    icon: ShieldCheck,
    question: 'Comment devenir prestataire ?',
    answer: 'Connectez-vous, allez dans votre profil, cliquez sur "Devenir prestataire" et remplissez le formulaire (nom, spécialité, localisation, contact). Une fois validée, votre fiche sera visible des clients.',
  },
  {
    id: 'verification',
    icon: ShieldAlert,
    question: 'Comment fonctionne la vérification d’identité ?',
    answer: 'Soumettez une photo recto/verso de votre CNI depuis la section "Vérification". Notre équipe examine votre demande sous 48h. Vous recevez un badge "Vérifié" si tout est conforme.',
  },
  {
    id: 'subscription',
    icon: CreditCard,
    question: 'Quels sont les plans d’abonnement ?',
    answer: 'ADMA propose quatre niveaux : Free (gratuit), Premium, Professional et Enterprise. Les plans payants offrent plus de visibilité, des statistiques avancées et un support prioritaire.',
  },
  {
    id: 'payment',
    icon: CreditCard,
    question: 'Comment payer un abonnement ?',
    answer: 'Depuis la page "Abonnement", choisissez votre plan, puis sélectionnez votre opérateur (Orange Money, MTN Mobile Money). Le paiement se fait via KPay, sécurisé et instantané.',
  },
  {
    id: 'notifications',
    icon: Bell,
    question: 'Pourquoi je ne reçois pas de notifications ?',
    answer: 'Vérifiez que vous avez autorisé les notifications dans les paramètres de votre téléphone et de l’application. Assurez-vous également d’être connecté à Internet. Si le problème persiste, contactez le support.',
  },
  {
    id: 'reviews',
    icon: FileText,
    question: 'Puis-je modifier ou supprimer un avis ?',
    answer: 'Oui, vous pouvez modifier votre avis depuis la fiche du prestataire. Cliquez sur "Modifier mon avis" et mettez à jour votre commentaire ou votre verdict (recommandation, neutre, déconseille).',
  },
  {
    id: 'report',
    icon: AlertCircle,
    question: 'Comment signaler un problème (prestataire, avis, contenu) ?',
    answer: 'Depuis la fiche du prestataire, cliquez sur le bouton "Signaler" en bas de page. Choisissez le motif et décrivez le problème. Notre équipe traitera votre signalement rapidement.',
  },
];

// ─── Composant FAQ ────────────────────────────────────────────────────────────

function FAQItem({ item, isLast }) {
  const Icon = item.icon;
  return (
    <View style={[styles.faqItem, !isLast && styles.faqBorder]}>
      <View style={styles.faqIconWrap}>
        <Icon size={20} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={styles.faqBody}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      </View>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const initialTab = params.tab === 'contact' ? 'contact' : 'faq';
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabOptions = useMemo(() => [
    { key: 'faq', label: 'FAQ', icon: HelpCircle },
    { key: 'contact', label: 'Contact', icon: Headphones },
  ], []);

  const openLink = async (url) => {
    try {
      await Linking.openURL(url);
    } catch {
      // Fallback : on ne fait rien si l'URL est invalide
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={colors.navy} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support & Aide</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Onglets ── */}
      <View style={styles.tabsContainer}>
        {tabOptions.map(({ key, label, icon: Icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
            activeOpacity={0.7}
          >
            <Icon size={18} color={activeTab === key ? colors.primary : colors.textMuted} strokeWidth={2} />
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'faq' ? (
          <>
            {/* ── Hero ── */}
            <View style={styles.hero}>
              <HelpCircle size={32} color={colors.primary} strokeWidth={2} />
              <Text style={styles.heroTitle}>Foire aux questions</Text>
              <Text style={styles.heroSub}>
                Les réponses aux questions les plus fréquentes sur ADMA.
              </Text>
            </View>

            {/* ── Liste FAQ ── */}
            <View style={styles.card}>
              {FAQS.map((item, i) => (
                <FAQItem key={item.id} item={item} isLast={i === FAQS.length - 1} />
              ))}
            </View>
          </>
        ) : (
          <>
            {/* ── Hero contact ── */}
            <View style={styles.hero}>
              <Headphones size={32} color={colors.primary} strokeWidth={2} />
              <Text style={styles.heroTitle}>Nous contacter</Text>
              <Text style={styles.heroSub}>
                Une question ? Un problème ? Nous sommes là pour vous aider.
              </Text>
            </View>

            {/* ── Cartes contact ── */}
            <View style={styles.contactList}>
              <TouchableOpacity style={styles.contactCard} onPress={() => openLink('mailto:support@adma.cm')} activeOpacity={0.8}>
                <View style={[styles.contactIconWrap, { backgroundColor: colors.primaryBg }]}>
                  <Mail size={22} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.contactTitle}>E-mail</Text>
                  <Text style={styles.contactMeta}>support@adma.cm</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactCard} onPress={() => openLink('tel:+237690000000')} activeOpacity={0.8}>
                <View style={[styles.contactIconWrap, { backgroundColor: colors.surface }]}>
                  <Headphones size={22} color={colors.navy} strokeWidth={2} />
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.contactTitle}>Téléphone</Text>
                  <Text style={styles.contactMeta}>+237 6 90 00 00 00</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactCard} onPress={() => openLink('https://adma.cm/support')} activeOpacity={0.8}>
                <View style={[styles.contactIconWrap, { backgroundColor: colors.primaryBg }]}>
                  <MessageSquareText size={22} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.contactTitle}>Centre d’aide en ligne</Text>
                  <Text style={styles.contactMeta}>Consultez notre base de connaissances</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ── Avertissement ── */}
            <View style={styles.notice}>
              <ShieldAlert size={16} color={colors.primary} />
              <Text style={styles.noticeText}>
                Le support répond généralement dans les 24 à 48 heures ouvrées.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Scroll
  scroll: {
    padding: 16,
    gap: 16,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 12,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },

  // Card FAQ
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 14,
  },
  faqBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  faqIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  faqBody: {
    flex: 1,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  // Contact
  contactList: {
    gap: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 18,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  contactIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  contactMeta: {
    marginTop: 3,
    fontSize: 13,
    color: colors.textMuted,
  },

  // Notice
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});