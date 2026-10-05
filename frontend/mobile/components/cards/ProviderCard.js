import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Star, Navigation, ThumbsUp } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTranslation } from 'react-i18next';
import VerifiedBadge from '../ui/VerifiedBadge';

const PLAN_STYLES = {
  enterprise:   { bg: '#0B162C', text: '#F8FAFC', border: '#1E293B', label: 'ENTREPRISE' },
  professional: { bg: '#1E293B', text: '#E2E8F0', border: '#334155', label: 'PRO' },
  premium:      { bg: '#EBF7F7', text: '#0D9488', border: '#9FDEDA', label: 'PREMIUM' },
};

function TrustBadge({ reviewCount, trustScore }) {
  const { t } = useTranslation();

  if (!reviewCount || reviewCount === 0) {
    return (
      <View style={[styles.trustBadge, { backgroundColor: colors.surface }]}>
        <View style={[styles.trustDot, { backgroundColor: colors.textDisabled }]} />
        <Text style={[styles.trustText, { color: colors.textMuted }]}>
          {t('trustBadge.new', 'Nouveau')}
        </Text>
      </View>
    );
  }

  if (trustScore >= 80) {
    return (
      <View style={[styles.trustBadge, { backgroundColor: colors.successBg }]}>
        <View style={[styles.trustDot, { backgroundColor: colors.success }]} />
        <Text style={[styles.trustText, { color: colors.successDark }]}>
          {t('trustBadge.trusted', 'Très apprécié')}
        </Text>
      </View>
    );
  }

  return null;
}

function DistanceBadge({ distanceKm }) {
  if (distanceKm === undefined || distanceKm === null) return null;
  return (
    <View style={styles.distanceBadge}>
      <Navigation size={10} color={colors.primaryDark} strokeWidth={2.5} />
      <Text style={styles.distanceText}>{distanceKm} km</Text>
    </View>
  );
}

export function ProviderCard({ provider, onPress, showDistance = false }) {
  const photoUri   = provider.photoUrl     || provider.photo_url;
  const name       = provider.name         || '';
  const specialty  = provider.specialty    || '';
  const city       = provider.cityName     || provider.city_name || provider.city || '';
  const neigh      = provider.neighborhoodName || provider.neighborhood_name || provider.neighborhood || '';
  const verStatus  = provider.verificationStatus || provider.verification_status;
  const plan       = provider.plan;
  const reviews    = provider.reviewCount  || provider.review_count || 0;
  const trustScore = provider.trustScore   || provider.trust_score  || 0;
  const avail      = provider.availability || 'available';

  const planStyle  = PLAN_STYLES[plan];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Photo Avatar */}
      <View style={styles.imageWrapper}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>{name.charAt(0).toUpperCase() || 'P'}</Text>
          </View>
        )}
        <View style={[
          styles.onlineDot,
          avail === 'busy' ? styles.dotBusy : avail === 'unavailable' ? styles.dotUnavailable : styles.dotAvailable
        ]} />
      </View>

      {/* Informations */}
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <View style={styles.nameWrap}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <VerifiedBadge type={verStatus} size={15} style={{ marginLeft: 4 }} />
          </View>
          {planStyle && (
            <View style={[styles.planBadge, { backgroundColor: planStyle.bg, borderColor: planStyle.border }]}>
              <Star size={9} color={planStyle.text} fill={planStyle.text} />
              <Text style={[styles.planText, { color: planStyle.text }]}>{planStyle.label}</Text>
            </View>
          )}
        </View>

        <Text style={styles.specialty} numberOfLines={1}>{specialty}</Text>

        <View style={styles.locationRow}>
          <MapPin size={11} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.location} numberOfLines={1}>
            {neigh ? `${neigh}, ` : ''}{city}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <TrustBadge reviewCount={reviews} trustScore={trustScore} />
          {showDistance && <DistanceBadge distanceKm={provider.distanceKm} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  image: {
    width: 78,
    height: 78,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  imagePlaceholderText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.white,
  },
  dotAvailable:   { backgroundColor: colors.success },
  dotBusy:        { backgroundColor: colors.warning },
  dotUnavailable: { backgroundColor: colors.danger },

  info: {
    marginLeft: 14,
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 6 },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: -0.2,
  },
  specialty: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  location: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 20,
  },
  trustDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  planText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
