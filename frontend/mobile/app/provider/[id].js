/**
 * ADMA — Écran détail prestataire
 * Design complet : galerie, avis, contact, signalement
 * + comptage des vues avec cooldown de 4h par utilisateur
 * + affichage et modification de l'avis de l'utilisateur
 * + pull-to-refresh pour recharger les données
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Share,
  FlatList,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  TrendingUp,
  Eye,
  MapPin,
  Star,
  Phone,
  MessageCircle,
  ChevronRight,
  Share2,
  Flag,
  Heart,
  CheckCircle2,
  Shield,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Edit3,
  X,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import api from '../../services/api';
import { getCache, setCache } from '../../services/cache';
import { useAuthStore } from '../../store/auth.store';
import { useTranslation } from 'react-i18next';
import { CACHE_TTL } from '../../constants/config';
import { SkeletonProviderDetail } from '../../components/ui/Skeleton';
import { showAppModal } from '../../components/ui/AppModal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

// ─── TrustMeter ──────────────────────────────────────────────────
function TrustMeter({ score, reviewCount }) {
  const { t } = useTranslation();
  if (reviewCount === 0) {
    return (
      <View style={meter.container}>
        <Text style={meter.label}>{t('provider.newProvider', 'Nouveau prestataire')}</Text>
        <Text style={meter.hint}>{t('provider.noReviews', 'Aucun avis pour le moment')}</Text>
      </View>
    );
  }
  const color = score >= 80 ? colors.success : score >= 50 ? colors.warning : colors.danger;
  const badgeLabel = score >= 80 ? t('trustBadge.reliable', 'Très fiable') : score >= 50 ? t('trustBadge.correct', 'Correct') : t('trustBadge.caution', 'Prudence');
  return (
    <View style={meter.container}>
      <View style={meter.row}>
        <Text style={meter.label}>{t('provider.trustScore', 'Score de confiance')}</Text>
        <Text style={[meter.score, { color }]}>{score}%</Text>
      </View>
      <View style={meter.barBg}>
        <View style={[meter.barFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <View style={meter.meta}>
        <View style={[meter.badge, { backgroundColor: color + '20' }]}>
          <Text style={[meter.badgeText, { color }]}>{badgeLabel}</Text>
        </View>
        <Text style={meter.reviewCount}>{reviewCount} {t('provider.reviews', 'avis')}</Text>
      </View>
    </View>
  );
}

const meter = StyleSheet.create({
  container: { marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  score: { fontSize: 20, fontWeight: '800' },
  hint: { fontSize: 13, color: colors.textMuted },
  barBg: { height: 6, borderRadius: 3, backgroundColor: colors.surface, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  reviewCount: { fontSize: 12, color: colors.textMuted },
});

// ─── ReviewItem ──────────────────────────────────────────────────
function ReviewItem({ review, isOwnReview }) {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'fr';
  const icons = {
    recommend: <ThumbsUp size={14} color={colors.success} fill={colors.success} />,
    neutral: <Minus size={14} color={colors.warning} />,
    discourage: <ThumbsDown size={14} color={colors.danger} fill={colors.danger} />,
  };
  const bgColors = {
    recommend: colors.successBg,
    neutral: colors.warningBg,
    discourage: colors.dangerBg,
  };
  return (
    <View style={[rv.item, isOwnReview && rv.ownReview]}>
      <View style={rv.header}>
        <View style={[rv.verdict, { backgroundColor: bgColors[review.verdict] || colors.surface }]}>
          {icons[review.verdict]}
        </View>
        <Text style={rv.reviewer}>
          {isOwnReview ? 'Votre avis' : (review.reviewerName || review.reviewer_name || 'Utilisateur')}
        </Text>
        {isOwnReview && (
          <View style={rv.ownBadge}>
            <Text style={rv.ownBadgeText}>Vous</Text>
          </View>
        )}
        <Text style={rv.date}>
          {new Date(review.createdAt || review.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>
      {review.comment && <Text style={rv.comment}>{review.comment}</Text>}
      {review.response && (
        <View style={rv.response}>
          <Text style={rv.responseLabel}>Réponse du prestataire :</Text>
          <Text style={rv.responseText}>{review.response.comment || review.response}</Text>
        </View>
      )}
    </View>
  );
}

const rv = StyleSheet.create({
  item: {
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  ownReview: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg + '30',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  verdict: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  reviewer: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  ownBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ownBadgeText: { fontSize: 9, fontWeight: '800', color: colors.white },
  date: { fontSize: 11, color: colors.textMuted },
  comment: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  response: { marginTop: 10, padding: 10, backgroundColor: colors.primaryBg, borderRadius: 8 },
  responseLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  responseText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
});

// ─── Modal d'édition d'avis ─────────────────────────────────────
function EditReviewModal({ visible, review, onClose, onSave }) {
  const [verdict, setVerdict] = useState(review?.verdict || 'recommend');
  const [comment, setComment] = useState(review?.comment || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (review) {
      setVerdict(review.verdict || 'recommend');
      setComment(review.comment || '');
    }
  }, [review]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({ verdict, comment: comment.trim() || undefined });
      onClose();
    } catch (err) {
      showAppModal({
        title: 'Erreur',
        message: err.response?.data?.message || 'Impossible de mettre à jour l\'avis',
        confirmText: 'OK',
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  const VERDICTS = [
    { id: 'recommend',  label: 'Je recommande',   Icon: ThumbsUp,   color: colors.success, bg: colors.successBg },
    { id: 'neutral',    label: 'Neutre',           Icon: Minus,      color: colors.warning,  bg: colors.warningBg },
    { id: 'discourage', label: 'Je déconseille',   Icon: ThumbsDown, color: colors.danger,   bg: colors.dangerBg },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.modalHeader, { paddingTop: 16 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <X size={22} color={colors.navy} />
          </TouchableOpacity>
          <Text style={styles.title}>Modifier mon avis</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.question}>Quelle est votre appréciation ?</Text>

          <View style={styles.verdictRow}>
            {VERDICTS.map((v) => {
              const active = verdict === v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.verdictBtn, { borderColor: active ? v.color : colors.border, backgroundColor: active ? v.bg : colors.white }]}
                  onPress={() => setVerdict(v.id)}
                  activeOpacity={0.8}
                >
                  <v.Icon size={28} color={active ? v.color : colors.textMuted} fill={active ? v.color : 'none'} />
                  <Text style={[styles.verdictLabel, active && { color: v.color, fontWeight: '700' }]}>{v.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Commentaire (facultatif)"
            value={comment}
            onChangeText={setComment}
            placeholder="Décrivez votre expérience avec ce prestataire..."
            multiline
            numberOfLines={4}
            maxLength={500}
            showCharCount
          />

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              Votre avis doit être honnête et basé sur une expérience réelle. Les faux avis seront supprimés.
            </Text>
          </View>

          <Button
            title={loading ? 'Mise à jour...' : 'Mettre à jour'}
            onPress={handleSave}
            loading={loading}
            disabled={!verdict}
            size="lg"
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Écran principal ─────────────────────────────────────────────
export default function ProviderDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const providerId = Array.isArray(id) ? id[0] : id;

  const user = useAuthStore((s) => s.user);
  const userProvider = useAuthStore((s) => s.provider);

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const [userReview, setUserReview] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const isOwnProfile = userProvider?.id === parseInt(providerId);

  useEffect(() => {
    loadProvider();
  }, [providerId]);

  // ─── Chargement avec possibilité de forcer (ignorer cache) ─────
  async function loadProvider(force = false) {
    const cacheKey = `provider_${providerId}`;
    try {
      if (!force) {
        const cached = await getCache(cacheKey);
        if (cached) {
          setProvider(cached);
          setIsFavorite(cached.isFavorite);
          setLoading(false);
          sendViewEvent(providerId);
        }
      }

      const res = await api.get(`/providers/${providerId}`);
      const data = res.data.data;
      setProvider(data);
      setIsFavorite(data.isFavorite);
      await setCache(cacheKey, data, CACHE_TTL.providerDetail);

      // Récupérer l'avis de l'utilisateur si connecté
      if (user) {
        try {
          const reviewRes = await api.get(`/reviews?providerId=${providerId}&userId=${user.id}`);
          const reviewsData = reviewRes.data.data || [];
          if (reviewsData.length > 0) {
            setUserReview(reviewsData[0]);
          } else {
            setUserReview(null);
          }
        } catch {
          setUserReview(null);
        }
      }
    } catch (err) {
      if (!provider) {
        showAppModal({
          title: 'Erreur',
          message: t('provider.notFound'),
          confirmText: 'OK',
          variant: 'danger',
          onConfirm: () => router.back(),
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ─── Pull-to-refresh ───────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    await loadProvider(true);
    setRefreshing(false);
  };

  // ─── Envoi de la vue avec cooldown de 4h ──────────────────────
  async function sendViewEvent(pid) {
    if (!user) return;
    const storageKey = `view_${pid}_${user.id}`;
    try {
      const lastView = await AsyncStorage.getItem(storageKey);
      const now = Date.now();
      const cooldown = 4 * 60 * 60 * 1000;
      if (!lastView || now - parseInt(lastView) >= cooldown) {
        await api.post('/contacts', { providerId: parseInt(pid), eventType: 'profile_view' });
        await AsyncStorage.setItem(storageKey, now.toString());
      }
    } catch (error) {
      console.warn('View event failed', error);
    }
  }

  // ─── Favoris ────────────────────────────────────────────────────
  async function toggleFavorite() {
    if (!user) {
      showAppModal({
        title: 'Connexion requise',
        message: 'Connectez-vous pour ajouter aux favoris',
        confirmText: 'Se connecter',
        onConfirm: () => router.push('/(auth)/login'),
      });
      return;
    }
    setFavLoading(true);
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${parseInt(providerId)}`);
        setIsFavorite(false);
      } else {
        await api.post('/favorites', { providerId: parseInt(providerId) });
        setIsFavorite(true);
      }
      await setCache(`provider_${providerId}`, { ...provider, isFavorite: !isFavorite }, CACHE_TTL.providerDetail);
    } catch (error) {
      const msg = error.response?.data?.message || 'Erreur lors de la mise à jour des favoris';
      showAppModal({ title: 'Erreur', message: msg, confirmText: 'OK', variant: 'danger' });
    } finally {
      setFavLoading(false);
    }
  }

  // ─── Contact ────────────────────────────────────────────────────
  async function revealContactInfo(type) {
    if (!contactInfo) {
      try {
        const res = await api.get(`/providers/${providerId}/contact`);
        setContactInfo(res.data.data);
        api.post('/contacts', { providerId: parseInt(providerId), eventType: `${type}_click` }).catch(() => {});
        openContact(res.data.data, type);
      } catch {
        showAppModal({
          title: 'Erreur',
          message: 'Impossible de recuperer les coordonnees',
          confirmText: 'OK',
          variant: 'danger',
        });
      }
    } else {
      api.post('/contacts', { providerId: parseInt(providerId), eventType: `${type}_click` }).catch(() => {});
      openContact(contactInfo, type);
    }
  }

  function openContact(info, type) {
    const rawPhone = type === 'whatsapp' ? info.whatsappNumber : info.phoneNumber;
    if (!rawPhone) {
      showAppModal({
        title: 'Information',
        message: 'Coordonnees non disponibles',
        confirmText: 'OK',
        variant: 'warning',
      });
      return;
    }
    let phone = String(rawPhone).replace(/\s/g, '');
    if (type === 'whatsapp') {
      const digits = phone.replace(/\D/g, '');
      const international = digits.startsWith('237') ? digits : `237${digits}`;
      const url = `https://wa.me/${international}`;
      Linking.openURL(url).catch(() => {
        showAppModal({
          title: 'Erreur',
          message: "Impossible d'ouvrir WhatsApp",
          confirmText: 'OK',
          variant: 'danger',
        });
      });
    } else {
      const url = `tel:${phone.replace(/\D/g, '')}`;
      Linking.openURL(url).catch(() => {
        showAppModal({
          title: 'Erreur',
          message: "Impossible de passer l'appel",
          confirmText: 'OK',
          variant: 'danger',
        });
      });
    }
  }

  // ─── Partager ────────────────────────────────────────────────────
  async function shareProvider() {
    try {
      const deepLink = `adma://provider/${providerId}`;
      const locationText = [
        provider.neighborhood || provider.neighborhoodName || provider.neighborhood_name,
        provider.city || provider.cityName || provider.city_name,
      ].filter(Boolean).join(', ');

      const message =
        `Découvrez ${provider.name} sur ADMA — ${provider.specialty}${locationText ? ` à ${locationText}` : ''}\n\n` +
        `Téléchargez l'app : https://adma.app/download\n` +
        `Ouvrir dans l'app : ${deepLink}`;
      await Share.share({
        message,
        title: provider.name,
        url: deepLink,
      });
    } catch {
      showAppModal({
        title: 'Erreur',
        message: 'Impossible de partager la fiche',
        confirmText: 'OK',
        variant: 'danger',
      });
    }
  }

  // ─── Signaler (style amélioré) ──────────────────────────────────
  function reportProvider() {
    if (!user) {
      showAppModal({
        title: 'Connexion requise',
        message: 'Connectez-vous pour signaler',
        confirmText: 'OK',
      });
      return;
    }
    router.push(`/report?type=provider&id=${providerId}`);
  }

  // ─── Mise à jour de l'avis avec force reload ──────────────────
  async function handleUpdateReview({ verdict, comment }) {
    if (!userReview) return;
    try {
      await api.put(`/reviews/${userReview.id}`, { verdict, comment });
      await loadProvider(true);
      showAppModal({ title: 'Avis mis à jour', variant: 'success' });
    } catch (err) {
      showAppModal({
        title: 'Erreur',
        message: err.response?.data?.message || 'Impossible de mettre à jour l\'avis',
        confirmText: 'OK',
        variant: 'danger',
      });
    }
  }

  // ─── Rendu ──────────────────────────────────────────────────────
  if (loading) return <SkeletonProviderDetail />;
  if (!provider) return null;

  const method = provider.contactMethod || provider.contact_method || 'both';
  const showPhone = method === 'phone' || method === 'both';
  const showWA = method === 'whatsapp' || method === 'both';
  const reviews = provider.reviews || [];
  const photos = provider.photos || [];
  const verStatus = provider.verificationStatus || provider.verification_status || 'none';

  const reviewCount = Number(provider.reviewCount ?? provider.review_count ?? reviews.length);
  const trustScore = Number(provider.trustScore ?? provider.trust_score ?? 0);
  const neighborhoodName = provider.neighborhood || provider.neighborhoodName || provider.neighborhood_name || '';
  const cityName = provider.city || provider.cityName || provider.city_name || '';
  const locationDisplay = [neighborhoodName, cityName].filter(Boolean).join(', ');

  // Organisation des avis : celui de l'utilisateur en premier (si existant)
  let sortedReviews = [...reviews];
  if (userReview && user) {
    const userReviewId = userReview.id;
    const ownIdx = sortedReviews.findIndex(r => r.id === userReviewId);
    if (ownIdx !== -1) {
      const [own] = sortedReviews.splice(ownIdx, 1);
      sortedReviews = [own, ...sortedReviews];
    }
  }

  const statsTitle = isOwnProfile
    ? t('profile.stats', 'Mes statistiques')
    : t('provider.stats', 'Statistiques');

  return (
    <SafeAreaView style={styles.flex}>
      {/* Barre flottante avec ajustement pour l'encoche */}
      <View style={[styles.floatingNav]}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.navy} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.navActions}>
          {/* Bouton favoris masqué pour le propriétaire */}
          {!isOwnProfile && (
            <TouchableOpacity style={styles.navBtn} onPress={toggleFavorite} disabled={favLoading}>
              <Heart
                size={20}
                color={isFavorite ? colors.danger : colors.navy}
                fill={isFavorite ? colors.danger : 'none'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.navBtn} onPress={shareProvider}>
            <Share2 size={20} color={colors.navy} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.photoArea}>
          {provider.photoUrl || provider.photo_url ? (
            <Image source={{ uri: provider.photoUrl || provider.photo_url }} style={styles.mainPhoto} />
          ) : (
            <View style={[styles.mainPhoto, styles.photoPlaceholder]}>
              <Text style={styles.photoInitial}>{provider.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View
            style={[
              styles.availBadge,
              { backgroundColor: provider.availability === 'available' ? colors.successBg : colors.surface },
            ]}
          >
            <View
              style={[
                styles.availDot,
                { backgroundColor: provider.availability === 'available' ? colors.success : colors.textMuted },
              ]}
            />
            <Text
              style={[
                styles.availText,
                { color: provider.availability === 'available' ? colors.success : colors.textMuted },
              ]}
            >
              {provider.availability === 'available'
                ? 'Disponible'
                : provider.availability === 'busy'
                ? 'Occupé'
                : 'Indisponible'}
            </Text>
          </View>
        </View>

        <View style={styles.mainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{provider.name}</Text>
            {verStatus === 'verified' && (
              <View style={styles.verifiedChip}>
                <CheckCircle2 size={14} color={colors.primary} fill={colors.primaryBg} />
                <Text style={styles.verifiedText}>{t('provider.verified', 'Vérifié')}</Text>
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
              {locationDisplay || t('provider.locationNotSet', 'Localisation non définie')}
            </Text>
          </View>
          {provider.plan && provider.plan !== 'free' && (
            <View style={styles.planChip}>
              <Star size={12} color={colors.primary} fill={colors.primary} />
              <Text style={styles.planText}>{provider.plan.charAt(0).toUpperCase() + provider.plan.slice(1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <TrustMeter score={trustScore} reviewCount={reviewCount} />
        </View>

        {provider.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('provider.description', 'Description')}</Text>
            <Text style={styles.description}>{provider.description}</Text>
          </View>
        )}

        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('provider.gallery', 'Galerie')}</Text>
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

        {/* Section statistiques avec titre adapté et affichage conditionnel des favoris */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{statsTitle}</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Eye size={18} color={colors.primary} />
              <Text style={styles.statValue}>{provider.viewsThisMonth || 0}</Text>
              <Text style={styles.statLabel}>{t('provider.viewsThisMonth', 'vues ce mois')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <TrendingUp size={18} color={colors.success} />
              <Text style={styles.statValue}>{provider.recommendCount || provider.recommend_count || 0}</Text>
              <Text style={styles.statLabel}>Recommandations</Text>
            </View>
            {/* Afficher les favoris uniquement si c'est le propriétaire */}
            {isOwnProfile && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Heart size={18} color={colors.danger} />
                  <Text style={styles.statValue}>{provider.totalFavorites || 0}</Text>
                  <Text style={styles.statLabel}>{t('favorites.title', 'Favoris')}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Section avis */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>
              {t('provider.reviews', 'Avis')} ({reviewCount})
            </Text>
            {!isOwnProfile && user && (
              userReview ? (
                <TouchableOpacity
                  style={styles.addReviewBtn}
                  onPress={() => setEditModalVisible(true)}
                >
                  <Edit3 size={14} color={colors.primary} />
                  <Text style={styles.addReviewText}>Modifier mon avis</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.addReviewBtn}
                  onPress={() => router.push(`/reviews/${providerId}`)}
                >
                  <Text style={styles.addReviewText}>{t('provider.leaveReview', 'Laisser un avis')}</Text>
                  <ChevronRight size={14} color={colors.primary} />
                </TouchableOpacity>
              )
            )}
          </View>
          {sortedReviews.length === 0 ? (
            <Text style={styles.noReviews}>{t('provider.noReviews', 'Aucun avis pour le moment')}</Text>
          ) : (
            sortedReviews.slice(0, 5).map((r) => (
              <ReviewItem
                key={r.id}
                review={r}
                isOwnReview={user && userReview && r.id === userReview.id}
              />
            ))
          )}
          {sortedReviews.length > 5 && (
            <TouchableOpacity style={styles.seeMoreBtn}>
              <Text style={styles.seeMoreText}>Voir les {sortedReviews.length - 5} avis restants</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bouton signaler (amélioré) */}
        {!isOwnProfile && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.reportBtn} onPress={reportProvider}>
              <Flag size={16} color={colors.textMuted} />
              <Text style={styles.reportText}>{t('provider.report', 'Signaler')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Barre de contact en bas */}
      {!isOwnProfile ? (
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
      ) : (
        <View style={[styles.contactBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.contactBtn, styles.callBtn]}
            onPress={() => router.push('/provider/edit')}
          >
            <Text style={styles.contactBtnText}>Modifier ma fiche</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal d'édition d'avis */}
      {userReview && (
        <EditReviewModal
          visible={editModalVisible}
          review={userReview}
          onClose={() => setEditModalVisible(false)}
          onSave={handleUpdateReview}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  floatingNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 200,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white + 'EE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  navActions: {
    flexDirection: 'row',
    gap: 8,
  },

  photoArea: { position: 'relative' },
  mainPhoto: { width: '100%', height: 280, backgroundColor: colors.surface },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryBg },
  photoInitial: { fontSize: 80, fontWeight: '900', color: colors.primary },
  availBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 12, fontWeight: '700' },

  mainInfo: { padding: 20, backgroundColor: colors.white },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  name: { fontSize: 22, fontWeight: '800', color: colors.navy, flex: 1 },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  specialty: { fontSize: 15, color: colors.textSecondary, marginBottom: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 13, color: colors.textMuted },
  planChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  planText: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },

  card: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.navy, marginBottom: 14 },
  description: { fontSize: 15, color: colors.textSecondary, lineHeight: 24 },
  galleryImg: { width: 160, height: 120, borderRadius: 12, backgroundColor: colors.surface },

  statsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, backgroundColor: colors.borderLight, marginVertical: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.navy },
  statLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  addReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addReviewText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  noReviews: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  seeMoreBtn: { padding: 14, alignItems: 'center' },
  seeMoreText: { fontSize: 14, color: colors.primary, fontWeight: '600' },

  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reportText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },

  contactBar: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  callBtn: { backgroundColor: colors.navy },
  waBtn: { backgroundColor: colors.whatsapp },
  contactBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  body: {
    padding: 24,
    paddingBottom: 60,
  },
  question: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 20,
  },
  verdictRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  verdictBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  verdictLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  disclaimer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
});