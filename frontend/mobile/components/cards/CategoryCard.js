import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import {
  Wrench, Scissors, Home, Briefcase, GraduationCap, UtensilsCrossed,
  Car, Zap, Paintbrush, Camera, Laptop, Smartphone,
  Shield, Truck, Sparkles, BookOpen, Layers
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTranslation } from 'react-i18next';

// Mapping icônes par slug ou id
const ICON_MAP = {
  // Catégories parentes
  'reparation-technique':  Wrench,
  'artisanat-mode':        Scissors,
  'construction-habitat':  Home,
  'services-quotidiens':   Briefcase,
  'formation-education':   GraduationCap,
  'alimentation-traiteur': UtensilsCrossed,

  // Sous-catégories courantes
  'mecanicien-auto':       Car,
  'mecanicien-moto':       Car,
  'electricien':           Zap,
  'plombier':              Wrench,
  'soudeur':               Wrench,
  'reparateur-telephone':  Smartphone,
  'reparateur-informatique': Laptop,
  'couturier':             Scissors,
  'coiffeur':              Scissors,
  'peintre':               Paintbrush,
  'photographe':           Camera,
  'livreur':               Truck,
  'repetiteur':            BookOpen,
};

const PALETTES = [
  { bg: '#EBF7F7', border: '#BBEAE5', icon: '#0D9488' }, // Teal
  { bg: '#EEF2FF', border: '#C7D2FE', icon: '#4F46E5' }, // Indigo
  { bg: '#FEF3C7', border: '#FDE68A', icon: '#D97706' }, // Amber
  { bg: '#F0FDF4', border: '#BBF7D0', icon: '#16A34A' }, // Emerald
  { bg: '#FCE7F3', border: '#FBCFE8', icon: '#DB2777' }, // Rose
  { bg: '#F3E8FF', border: '#E9D5FF', icon: '#9333EA' }, // Purple
  { bg: '#E0F2FE', border: '#BAE6FD', icon: '#0284C7' }, // Sky
];

export function CategoryCard({ category, onPress, compact = false }) {
  const { i18n } = useTranslation();
  const lang   = i18n.language;
  const label  = category[`name_${lang}`] || category.name_fr || category.name || '';
  const slug   = category.slug || '';
  const count  = category.provider_count || 0;

  const IconComponent = ICON_MAP[slug] || ICON_MAP[category.icon] || Layers;
  const palette = PALETTES[(category.id || 1) % PALETTES.length];

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.white }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.compactIconWrap, { backgroundColor: palette.bg }]}>
          <IconComponent size={18} color={palette.icon} strokeWidth={2.2} />
        </View>
        <Text style={styles.compactLabel} numberOfLines={1}>{label}</Text>
        {count > 0 && (
          <View style={styles.compactCount}>
            <Text style={styles.compactCountText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <IconComponent size={24} color={palette.icon} strokeWidth={2} />
        {count > 0 && (
          <View style={[styles.countBadge, { backgroundColor: palette.icon }]}>
            <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 88,
    alignItems: 'center',
    marginRight: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    position: 'relative',
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  countText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.white,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 2,
  },

  // Compact variant for search / filters
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: 8,
    marginBottom: 8,
    gap: 8,
  },
  compactIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  compactCount: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  compactCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
