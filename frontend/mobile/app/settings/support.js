import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Headphones, Mail, MessageSquareText, ShieldAlert } from 'lucide-react-native';
import { colors } from '../../constants/colors';

const faqs = [
  {
    question: 'Comment créer une fiche prestataire ?',
    answer: 'Depuis le profil, ouvrez “Créer ma fiche”, renseignez vos informations, votre secteur et votre localisation.',
  },
  {
    question: 'Comment fonctionne la vérification ?',
    answer: 'Envoyez une photo de votre pièce d’identité, puis attendez la validation de l’équipe de modération.',
  },
  {
    question: 'Que faire si mon compte est bloqué ?',
    answer: 'Contactez le support avec les détails du problème afin d’obtenir une réponse rapide et un accompagnement.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const tab = params.tab || 'faq';
  const [activeTab, setActiveTab] = useState(tab === 'contact' ? 'contact' : 'faq');

  const tabOptions = useMemo(() => [
    { key: 'faq', label: 'FAQ' },
    { key: 'contact', label: 'Contact' },
  ], []);

  async function openLink(url) {
    await Linking.openURL(url);
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        {tabOptions.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.tab, activeTab === item.key && styles.tabActive]}
            onPress={() => setActiveTab(item.key)}
          >
            <Text style={[styles.tabText, activeTab === item.key && styles.tabTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'faq' ? (
          <View style={styles.card}>
            {faqs.map((item) => (
              <View key={item.question} style={styles.item}>
                <Text style={styles.question}>{item.question}</Text>
                <Text style={styles.answer}>{item.answer}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.contactList}>
            <TouchableOpacity style={styles.contactCard} onPress={() => openLink('mailto:support@adma.cm')}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryBg }]}>
                <Mail size={18} color={colors.primary} />
              </View>
              <View style={styles.contactText}>
                <Text style={styles.contactTitle}>E-mail</Text>
                <Text style={styles.contactMeta}>support@adma.cm</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard} onPress={() => openLink('tel:+237690000000')}>
              <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
                <Headphones size={18} color={colors.navy} />
              </View>
              <View style={styles.contactText}>
                <Text style={styles.contactTitle}>Téléphone</Text>
                <Text style={styles.contactMeta}>+237 6 90 00 00 00</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactCard} onPress={() => openLink('https://adma.cm/support')}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryBg }]}>
                <MessageSquareText size={18} color={colors.primary} />
              </View>
              <View style={styles.contactText}>
                <Text style={styles.contactTitle}>Centre d’aide</Text>
                <Text style={styles.contactMeta}>Ouvrir la page d’assistance</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.notice}>
          <ShieldAlert size={16} color={colors.primary} />
          <Text style={styles.noticeText}>Le support répond généralement dans les 24 à 48 heures ouvrées.</Text>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primaryBg,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 8,
  },
  item: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  question: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 6,
  },
  answer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
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
    padding: 16,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  contactMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.primaryBg,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
