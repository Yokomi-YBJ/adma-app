import { MaterialIcons } from '@expo/vector-icons';

const BADGE_COLORS = {
  verified_id: '#1D9BF0',
  verified:    '#FFD400',
};

export function getBadgeColor(type) {
  return BADGE_COLORS[type] || null;
}

export default function VerifiedBadge({ type, size = 16, style }) {
  if (!type || type === 'none' || type === 'pending') return null;
  const color = BADGE_COLORS[type];
  if (!color) return null;
  return <MaterialIcons name="verified" size={size} color={color} style={style} />;
}