import { BadgeCheck } from 'lucide-react-native';
import { colors } from '../../constants/colors';

const BADGE_COLORS = {
  verified_id: colors.infoDark,
  verified:    colors.warningDark,
};

export function getBadgeColor(type) {
  return BADGE_COLORS[type] || null;
}

export default function VerifiedBadge({ type, size = 16, style }) {
  if (!type || type === 'none' || type === 'pending') return null;
  const color = BADGE_COLORS[type];
  if (!color) return null;
  return <BadgeCheck size={size} color={color} style={style} />;
}