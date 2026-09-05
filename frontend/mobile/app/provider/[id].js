/**
 * ADMA — Écran détail prestataire
 * Design complet : galerie, avis, contact, signalement
 */
import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Linking, Share, Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, Star, Clock3, Phone, MessageCircle, ChevronRight, Share2, Flag, Heart, CheckCircle2, Shield, AlertCircle, ArrowUpRight, Navigation, BadgeCheck, Camera, LayoutGrid } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { getCache, setCache } from '../../services/cache';
import { useAuthStore } from '../../store/auth.store';
import { useTranslation } from 'react-i18next';
import { CACHE_TTL } from '../../constants/config';
import { SkeletonProviderDetail } from '../../components/ui/Skeleton';
import { showAppModal } from '../../components/ui/AppModal';

function TrustMeter({ score, reviewCount }) {
  const { t } = useTranslation();
  if (reviewCount === 0) {
    return (
      <View style={meter.container}>
        <Text style={meter.label}>Nouveau prestataire</Text>
        <Text style={meter.hint}>Aucun avis pour le moment</Text>
      </View>
    );
  }
  const color = score >= 80 ? colors.success : score >= 50 ? colors.warning : colors.danger;
  const badgeLabel = score >= 80 ? 'Tres fiable' : score >= 50 ? 'Correct' : 'Prudence';
  return (
    <View style={meter.container}>
      <View style={meter.row}>
        <Text style={meter.label}>Score de confiance</Text>
        <Text style={[meter.score, { color }]}>{score}%</Text>
      </View>
      <View style={meter.barBg}>
        <View style={[meter.barFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <View style={meter.meta}>
        <View style={[meter.badge, { backgroundColor: color + '20' }]}>
          <Text style={[meter.badgeText, { color }]}>{badgeLabel}</Text>
        </View>
        <Text style={meter.reviewCount}>{reviewCount} avis</Text>
      </View>
    </View>
  );
}

const meter = StyleSheet.create({
  container: { marginBottom: 4 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label:     { fontSize: 13, fontWeight: '600', color: colors.text },
  score:     { fontSize: 20, fontWeight: '800' },
  hint:      { fontSize: 13, color: colors.textMuted },
  barBg:     { height: 6, borderRadius: 3, backgroundColor: colors.surface, overflow: 'hidden' },
  barFill:   { height: 6, borderRadius: 3 },
  meta:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  reviewCount: { fontSize: 12, color: colors.textMuted },
});

function ReviewItem({ review }) {
  const icons = {
    recommend: <ThumbsUp  size={14} color={colors.success} fill={colors.success} />,
    neutral:   <Minus     size={14} color={colors.warning} />,
    discourage:<ThumbsDown size={14} color={colors.danger}  fill={colors.danger} />,
  };
  const bgColors = {
    recommend: colors.successBg,
    neutral:   colors.warningBg,
    discourage:colors.dangerBg,
  };
  return (
    <View style={rv.item}>
      <View style={rv.header}>
        <View style={[rv.verdict, { backgroundColor: bgColors[review.verdict] || colors.surface }]}>
          {icons[review.verdict]}
        </View>
        <Text style={rv.reviewer}>{review.reviewerName || 'Utilisateur'}</Text>
        <Text style={rv.date}>{new Date(review.createdAt || review.created_at).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}</Text>
      </View>
      {review.comment && <Text style={rv.comment}>{review.comment}</Text>}
      {review.response && (
        <View style={rv.response}>
          <Text style={rv.responseLabel}>Reponse du prestataire :</Text>
          <Text style={rv.responseText}>{review.response.comment || review.response}</Text>
        </View>
      )}
    </View>
  );
}

const rv = StyleSheet.create({
  item:         { padding: 14, backgroundColor: colors.white, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  verdict:      { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  reviewer:     { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  date:         { fontSize: 11, color: colors.textMuted },
  comment:      { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  response:     { marginTop: 10, padding: 10, backgroundColor: colors.primaryBg, borderRadius: 8 },
  responseLabel:{ fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  responseText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
});

export default function ProviderDetailScreen() {
  const { t }       = useTranslation();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const { id }      = useLocalSearchParams();
  const user        = useAuthStore((s) => s.user);
  const userProvider= useAuthStore((s) => s.provider);

  const [provider,    setProvider]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [isFavorite,  setIsFavorite]  = useState(false);
  const [favLoading,  setFavLoading]  = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const [showContact, setShowContact] = useState(false);

  const scrollY    = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 120], outputRange: [0, 1], extrapolate: 'clamp' });

  const isOwnProfile = userProvider?.id === parseInt(id);

  useEffect(() => { loadProvider(); }, [id]);

  async function loadProvider() {
    const cacheKey = `provider_${id}`;
    try {
      const cached = await getCache(cacheKey);
      if (cached) { setProvider(cached); setIsFavorite(cached.isFavorite); setLoading(false); }

      const res = await api.get(`/providers/${id}`);
      const data = res.data.data;
      setProvider(data);
      setIsFavorite(data.isFavorite);
      await setCache(cacheKey, data, CACHE_TTL.providerDetail);

      // Enregistrer la vue
      api.post('/contacts', { providerId: parseInt(id), eventType: 'profile_view' }).catch(() => {});
    } catch {
      if (!provider) {
        showAppModal({ title: 'Erreur', message: t('provider.notFound'), confirmText: 'OK', variant: 'danger', onConfirm: () => router.back() });
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleFavorite() {
    if (!user) { router.push('/(auth)/login'); return; }
    setFavLoading(true);
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${id}`);
        setIsFavorite(false);
      } else {
        await api.post('/favorites', { providerId: parseInt(id) });
        setIsFavorite(true);
      }
    } catch {}
    setFavLoading(false);
  }

  async function revealContactInfo(type) {
    if (!contactInfo) {
      try {
        const res = await api.get(`/providers/${id}/contact`);
        setContactInfo(res.data.data);
        api.post('/contacts', { providerId: parseInt(id), eventType: `${type}_click` }).catch(() => {});
        openContact(res.data.data, type);
      } catch {
        showAppModal({ title: 'Erreur', message: 'Impossible de recuperer les coordonnees', confirmText: 'OK', variant: 'danger' });
      }
    } else {
      api.post('/contacts', { providerId: parseInt(id), eventType: `${type}_click` }).catch(() => {});
      openContact(contactInfo, type);
    }
  }

  function openContact(info, type) {
    const phone = type === 'whatsapp' ? info.whatsappNumber : info.phoneNumber;
    if (!phone) { showAppModal({ title: 'Information', message: 'Coordonnees non disponibles', confirmText: 'OK', variant: 'warning' }); return; }
    const url = type === 'whatsapp'
      ? `https://wa.me/${phone.replace(/\D/g, '')}`
      : `tel:${phone}`;
    Linking.openURL(url).catch(() => showAppModal({ title: 'Information', message: 'Impossible d\'ouvrir l\'application', confirmText: 'OK', variant: 'warning' }));
  }

  async function shareProvider() {
    try {
      await Share.share({
        message: `Decouvrez ${provider.name} sur ADMA — ${provider.specialty} a ${provider.neighborhoodName || ''}, ${provider.cityName || ''}`,
        title: provider.name,
      });
    } catch {}
  }

  function reportProvider() {
    router.push(`/report?type=provider&id=${id}`);
  }

  if (loading) return <SkeletonProviderDetail />;
  if (!provider) return null;

  const method      = provider.contactMethod || provider.contact_method || 'both';
  const showPhone   = method === 'phone' || method === 'both';
  const showWA      = method === 'whatsapp' || method === 'both';
  const reviews     = provider.reviews  || [];
  const photos      = provider.photos   || [];
  const verStatus   = provider.verificationStatus || provider.verification_status || 'none';

  return (
    <View style={styles.flex}>
      {/* Header transparent qui devient opaque au scroll */}
      <Animated.View style={[styles.stickyHeader, { paddingTop: insets.top, opacity: headerOpacity }]}>
        <TouchableOpacity style={styles.stickyBack} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.stickyTitle} numberOfLines={1}>{provider.name}</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Barre de navigation flottante */}
        <View style={[styles.floatingNav, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={colors.navy} />
          </TouchableOpacity>
          <View style={styles.navActions}>
            <TouchableOpacity style={styles.navBtn} onPress={toggleFavorite} disabled={favLoading}>
              <Heart
                size={20}
                color={isFavorite ? colors.danger : colors.navy}
                fill={isFavorite ? colors.danger : 'none'}
                strokeWidth={2}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={shareProvider}>
              <Share2 size={20} color={colors.navy} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Photo principale */}
        <View style={styles.photoArea}>
          {provider.photoUrl || provider.photo_url ? (
            <Image
              source={{ uri: provider.photoUrl || provider.photo_url }}
              style={styles.mainPhoto}
            />
          ) : (
            <View style={[styles.mainPhoto, styles.photoPlaceholder]}>
              <Text style={styles.photoInitial}>{provider.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {/* Disponibilité */}
          <View style={[
            styles.availBadge,
            { backgroundColor: provider.availability === 'available' ? colors.successBg : colors.surface }
          ]}>
            <View style={[
              styles.availDot,
              { backgroundColor: provider.availability === 'available' ? colors.success : colors.textMuted }
            ]} />
            <Text style={[
              styles.availText,
              { color: provider.availability === 'available' ? colors.success : colors.textMuted }
            ]}>
              {provider.availability === 'available' ? 'Disponible' : provider.availability === 'busy' ? 'Occupe' : 'Indisponible'}
            </Text>
          </View>
        </View>

        {/* Infos principales */}
        <View style={styles.mainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{provider.name}</Text>
            {verStatus === 'verified' && (
              <View style={styles.verifiedChip}>
                <CheckCircle2 size={14} color={colors.primary} fill={colors.primaryBg} />
                <Text style={styles.verifiedText}>Verifie</Text>
              </View>
            )}
            {verStatus === 'verified_id' && (
              <View style={[styles.verifiedChip, { backgroundColor: colors.infoBg }]}>
                <Shield size={14} color={colors.info} />
                <Text style={[styles.verifiedText, { color: colors.info }]}>ID</Text>
              </View>
            )}
          </View>
          <Text style={styles.specialty}>{provider.specialty}</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.textMuted} />
            <Text style={styles.locationText}>
              {[provider.neighborhoodName || provider.neighborhood_name, provider.cityName || provider.city_name]
                .filter(Boolean).join(', ')}
            </Text>
          </View>

          {provider.plan && provider.plan !== 'free' && (
            <View style={styles.planChip}>
              <Star size={12} color={colors.primary} fill={colors.primary} />
              <Text style={styles.planText}>{provider.plan.charAt(0).toUpperCase() + provider.plan.slice(1)}</Text>
            </View>
          )}
        </View>

        {/* Score de confiance */}
        <View style={styles.card}>
          <TrustMeter
            score={provider.trustScore || provider.trust_score || 0}
            reviewCount={provider.reviewCount || provider.review_count || 0}
          />
        </View>

        {/* Description */}
        {provider.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('provider.description')}</Text>
            <Text style={styles.description}>{provider.description}</Text>
          </View>
        )}

        {/* Galerie */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('provider.gallery')}</Text>
            <FlatList
              horizontal
              data={photos}
              keyExtractor={(item) => item.id?.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
              renderItem={({ item }) => (
                <Image source={{ uri: item.photo_url }} style={styles.galleryImg} />
              )}
            />
          </View>
        )}

        {/* Statistiques publiques */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Eye size={18} color={colors.primary} />
              <Text style={styles.statValue}>{provider.viewsThisMonth || 0}</Text>
              <Text style={styles.statLabel}>{t('provider.viewsThisMonth')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <TrendingUp size={18} color={colors.success} />
              <Text style={styles.statValue}>{provider.recommendCount || provider.recommend_count || 0}</Text>
              <Text style={styles.statLabel}>Recommandations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Heart size={18} color={colors.danger} />
              <Text style={styles.statValue}>{provider.totalFavorites || 0}</Text>
              <Text style={styles.statLabel}>Favoris</Text>
            </View>
          </View>
        </View>

        {/* Avis */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>
              {t('provider.reviews')} ({reviews.length})
            </Text>
            {!isOwnProfile && user && (
              <TouchableOpacity
                style={styles.addReviewBtn}
                onPress={() => router.push(`/reviews/${id}`)}
              >
                <Text style={styles.addReviewText}>{t('provider.leaveReview')}</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          {reviews.length === 0 ? (
            <Text style={styles.noReviews}>{t('provider.noReviews')}</Text>
          ) : (
            reviews.slice(0, 5).map((r) => <ReviewItem key={r.id} review={r} />)
          )}
          {reviews.length > 5 && (
            <TouchableOpacity style={styles.seeMoreBtn}>
              <Text style={styles.seeMoreText}>Voir les {reviews.length - 5} avis restants</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actions secondaires */}
        {!isOwnProfile && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.reportBtn} onPress={reportProvider}>
              <Flag size={16} color={colors.textMuted} />
              <Text style={styles.reportText}>{t('provider.report')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* Boutons de contact fixes en bas */}
      {!isOwnProfile && (
        <View style={[styles.contactBar, { paddingBottom: insets.bottom + 12 }]}>
          {showPhone && (
            <TouchableOpacity
              style={[styles.contactBtn, styles.callBtn]}
              onPress={() => revealContactInfo('phone')}
              activeOpacity={0.8}
            >
              <Phone size={20} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.contactBtnText}>{t('provider.call')}</Text>
            </TouchableOpacity>
          )}
          {showWA && (
            <TouchableOpacity
              style={[styles.contactBtn, styles.waBtn]}
              onPress={() => revealContactInfo('whatsapp')}
              activeOpacity={0.8}
            >
              <MessageCircle size={20} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.contactBtnText}>{t('provider.whatsapp')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {isOwnProfile && (
        <View style={[styles.contactBar, { paddingBottom: insets.bottom + 12 }]}>
          <Button
            title="Modifier ma fiche"
            onPress={() => router.push('/provider/edit')}
            variant="secondary"
            size="lg"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  stickyBack:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  stickyTitle:  { flex: 1, fontSize: 16, fontWeight: '700', color: colors.navy, textAlign: 'center' },

  floatingNav: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16,
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.white + 'EE',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  navActions:   { flexDirection: 'row', gap: 8 },

  photoArea:    { position: 'relative' },
  mainPhoto:    { width: '100%', height: 280, backgroundColor: colors.surface },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryBg },
  photoInitial: { fontSize: 80, fontWeight: '900', color: colors.primary },
  availBadge: {
    position: 'absolute', bottom: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    shadowColor: colors.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  availDot:     { width: 8, height: 8, borderRadius: 4 },
  availText:    { fontSize: 12, fontWeight: '700' },

  mainInfo:     { padding: 20, backgroundColor: colors.white },
  nameRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  name:         { fontSize: 22, fontWeight: '800', color: colors.navy, flex: 1 },
  verifiedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  verifiedText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  specialty:    { fontSize: 15, color: colors.textSecondary, marginBottom: 10 },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 13, color: colors.textMuted },
  planChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    alignSelf: 'flex-start', marginTop: 10,
  },
  planText:     { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },

  card: {
    margin: 16, padding: 16,
    backgroundColor: colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight,
  },

  section:      { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.navy, marginBottom: 14 },
  description:  { fontSize: 15, color: colors.textSecondary, lineHeight: 24 },
  galleryImg:   { width: 160, height: 120, borderRadius: 12, backgroundColor: colors.surface },

  statsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight,
    padding: 16,
  },
  statItem:     { flex: 1, alignItems: 'center', gap: 4 },
  statDivider:  { width: 1, backgroundColor: colors.borderLight, marginVertical: 4 },
  statValue:    { fontSize: 20, fontWeight: '800', color: colors.navy },
  statLabel:    { fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  reviewsHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  addReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  addReviewText:{ fontSize: 13, color: colors.primary, fontWeight: '600' },
  noReviews:    { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  seeMoreBtn:   { padding: 14, alignItems: 'center' },
  seeMoreText:  { fontSize: 14, color: colors.primary, fontWeight: '600' },

  reportBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 12 },
  reportText:   { fontSize: 13, color: colors.textMuted },

  contactBar: {
    backgroundColor: colors.white,
    paddingHorizontal: 20, paddingTop: 12,
    flexDirection: 'row', gap: 12,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
    shadowColor: colors.navy, shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14,
  },
  callBtn:      { backgroundColor: colors.navy },
  waBtn:        { backgroundColor: colors.whatsapp },
  contactBtnText:{ color: colors.white, fontSize: 15, fontWeight: '700' },
});
