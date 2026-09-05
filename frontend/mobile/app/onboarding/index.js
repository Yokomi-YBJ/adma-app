/**
 * ADMA — Onboarding
 * Illustrations SVG personnalisées + design slide coloré
 */
import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, StatusBar,
} from 'react-native';
import { useRouter }           from 'expo-router';
import { useSafeAreaInsets }   from 'react-native-safe-area-context';
import AsyncStorage            from '@react-native-async-storage/async-storage';
import { ChevronRight }        from 'lucide-react-native';
import { SvgXml }              from 'react-native-svg';
import { colors }              from '../../constants/colors';

const { width, height } = Dimensions.get('window');

// ── Illustrations SVG inline ──────────────────────────────────────

const SVG_1 = `<svg viewBox="0 0 320 280" xmlns="http://www.w3.org/2000/svg">
  <circle cx="160" cy="140" r="110" fill="#5FC2BA" opacity="0.10"/>
  <circle cx="260" cy="60"  r="36"  fill="#5FC2BA" opacity="0.18"/>
  <circle cx="55"  cy="220" r="24"  fill="#0B162C" opacity="0.07"/>
  <circle cx="100" cy="62" r="26" fill="#F5C5A3"/>
  <ellipse cx="100" cy="48" rx="26" ry="16" fill="#2C1810"/>
  <ellipse cx="80"  cy="62" rx="8"  ry="14" fill="#2C1810"/>
  <ellipse cx="120" cy="62" rx="8"  ry="14" fill="#2C1810"/>
  <rect x="76" y="88" width="48" height="68" rx="12" fill="#5FC2BA"/>
  <rect x="80" y="150" width="18" height="52" rx="9" fill="#1C2942"/>
  <rect x="102" y="150" width="18" height="52" rx="9" fill="#1C2942"/>
  <ellipse cx="89"  cy="202" rx="14" ry="7" fill="#0B162C"/>
  <ellipse cx="111" cy="202" rx="14" ry="7" fill="#0B162C"/>
  <rect x="52" y="96" width="16" height="50" rx="8" fill="#F5C5A3" transform="rotate(20,60,96)"/>
  <rect x="124" y="90" width="16" height="44" rx="8" fill="#F5C5A3" transform="rotate(-30,132,90)"/>
  <rect x="40" y="120" width="34" height="56" rx="6" fill="#0B162C"/>
  <rect x="44" y="125" width="26" height="42" rx="4" fill="#EBF7F7"/>
  <circle cx="57" cy="141" r="9" fill="none" stroke="#5FC2BA" stroke-width="3"/>
  <line x1="63" y1="147" x2="70" y2="154" stroke="#5FC2BA" stroke-width="3" stroke-linecap="round"/>
  <circle cx="224" cy="70" r="24" fill="#D4956A"/>
  <ellipse cx="224" cy="57" rx="24" ry="13" fill="#1A0F0A"/>
  <rect x="202" y="94" width="44" height="62" rx="11" fill="#1C2942"/>
  <rect x="206" y="150" width="16" height="50" rx="8" fill="#3B556D"/>
  <rect x="226" y="150" width="16" height="50" rx="8" fill="#3B556D"/>
  <ellipse cx="214" cy="200" rx="13" ry="6" fill="#0B162C"/>
  <ellipse cx="234" cy="200" rx="13" ry="6" fill="#0B162C"/>
  <rect x="188" y="98" width="15" height="42" rx="7" fill="#D4956A" transform="rotate(15,195,98)"/>
  <rect x="242" y="88" width="15" height="40" rx="7" fill="#D4956A" transform="rotate(-25,250,88)"/>
  <path d="M268 36 C259 36 252 43 252 52 C252 63 268 76 268 76 C268 76 284 63 284 52 C284 43 277 36 268 36Z" fill="#5FC2BA"/>
  <circle cx="268" cy="52" r="6" fill="white"/>
  <rect x="130" y="105" width="62" height="28" rx="14" fill="white" opacity="0.92"/>
  <circle cx="148" cy="119" r="5" fill="none" stroke="#5FC2BA" stroke-width="1.5"/>
  <line x1="152" y1="123" x2="156" y2="127" stroke="#5FC2BA" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="158" y="115" width="28" height="3" rx="1.5" fill="#D1D5DB"/>
  <rect x="158" y="121" width="20" height="3" rx="1.5" fill="#E5E7EB"/>
</svg>`;

const SVG_2 = `<svg viewBox="0 0 320 280" xmlns="http://www.w3.org/2000/svg">
  <circle cx="160" cy="140" r="108" fill="#4B6BFB" opacity="0.09"/>
  <circle cx="50"  cy="55"  r="30"  fill="#4B6BFB" opacity="0.14"/>
  <circle cx="275" cy="230" r="22"  fill="#0B162C" opacity="0.06"/>
  <circle cx="160" cy="58" r="28" fill="#D4956A"/>
  <ellipse cx="160" cy="42" rx="28" ry="15" fill="#1A0F0A"/>
  <ellipse cx="136" cy="62" rx="9"  ry="15" fill="#1A0F0A"/>
  <ellipse cx="132" cy="62" rx="6" ry="8" fill="#D4956A"/>
  <ellipse cx="188" cy="62" rx="6" ry="8" fill="#D4956A"/>
  <rect x="132" y="86" width="56" height="70" rx="14" fill="#4B6BFB"/>
  <rect x="136" y="150" width="20" height="54" rx="10" fill="#1C2942"/>
  <rect x="160" y="150" width="20" height="54" rx="10" fill="#1C2942"/>
  <ellipse cx="146" cy="205" rx="15" ry="7" fill="#0B162C"/>
  <ellipse cx="170" cy="205" rx="15" ry="7" fill="#0B162C"/>
  <rect x="100" y="90" width="18" height="50" rx="9" fill="#D4956A" transform="rotate(18,109,90)"/>
  <rect x="202" y="94" width="18" height="46" rx="9" fill="#D4956A" transform="rotate(-15,211,94)"/>
  <path d="M96 96 L96 130 C96 148 110 158 120 163 C130 158 144 148 144 130 L144 96 L120 88 Z" fill="#5FC2BA"/>
  <polyline points="110,123 118,131 132,113" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="175" y="100" width="100" height="60" rx="12" fill="white" opacity="0.92"/>
  <rect x="185" y="112" width="60" height="3" rx="1.5" fill="#E5E7EB"/>
  <rect x="185" y="120" width="80" height="3" rx="1.5" fill="#FBBF24"/>
  <rect x="185" y="128" width="50" height="3" rx="1.5" fill="#E5E7EB"/>
  <rect x="185" y="145" width="70" height="3" rx="1.5" fill="#5FC2BA" opacity="0.6"/>
  <circle cx="56" cy="185" r="20" fill="#5FC2BA"/>
  <polyline points="47,185 53,191 66,178" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const SVG_3 = `<svg viewBox="0 0 320 280" xmlns="http://www.w3.org/2000/svg">
  <circle cx="160" cy="140" r="110" fill="#16A34A" opacity="0.09"/>
  <circle cx="280" cy="50"  r="32"  fill="#16A34A" opacity="0.15"/>
  <circle cx="40"  cy="230" r="20"  fill="#0B162C" opacity="0.06"/>
  <rect x="108" y="60" width="104" height="170" rx="18" fill="#0B162C"/>
  <rect x="114" y="68" width="92"  height="154" rx="13" fill="#EBF7F7"/>
  <rect x="144" y="63" width="32" height="7" rx="3.5" fill="#1C2942"/>
  <rect x="118" y="72" width="84" height="24" rx="6" fill="#25D366"/>
  <rect x="142" y="79" width="36" height="4" rx="2" fill="white" opacity="0.8"/>
  <rect x="142" y="86" width="24" height="3" rx="1.5" fill="white" opacity="0.5"/>
  <rect x="122" y="102" width="54" height="16" rx="8" fill="#DCF8C6"/>
  <rect x="130" y="106" width="36" height="3" rx="1.5" fill="#3B556D" opacity="0.4"/>
  <rect x="126" y="124" width="46" height="16" rx="8" fill="white"/>
  <rect x="130" y="128" width="30" height="3" rx="1.5" fill="#3B556D" opacity="0.4"/>
  <rect x="122" y="148" width="76" height="28" rx="14" fill="#25D366"/>
  <rect x="160" y="158" width="26" height="4" rx="2" fill="white" opacity="0.85"/>
  <rect x="160" y="165" width="18" height="3" rx="1.5" fill="white" opacity="0.6"/>
  <circle cx="72" cy="72" r="26" fill="#F5C5A3"/>
  <ellipse cx="72" cy="57" rx="26" ry="14" fill="#2C1810"/>
  <ellipse cx="50" cy="74" rx="7"  ry="13" fill="#2C1810"/>
  <path d="M63 78 Q72 86 81 78" fill="none" stroke="#C47A55" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="50" y="98" width="44" height="62" rx="12" fill="#16A34A"/>
  <rect x="54" y="154" width="16" height="50" rx="8" fill="#1C2942"/>
  <rect x="74" y="154" width="16" height="50" rx="8" fill="#1C2942"/>
  <ellipse cx="62" cy="204" rx="13" ry="6" fill="#0B162C"/>
  <ellipse cx="82" cy="204" rx="13" ry="6" fill="#0B162C"/>
  <rect x="36" y="102" width="16" height="42" rx="8" fill="#F5C5A3" transform="rotate(15,44,102)"/>
  <rect x="93"  y="96" width="16" height="46" rx="8" fill="#F5C5A3" transform="rotate(-20,101,96)"/>
  <circle cx="252" cy="76" r="24" fill="#D4956A"/>
  <ellipse cx="252" cy="63" rx="24" ry="13" fill="#1A0F0A"/>
  <rect x="232" y="100" width="40" height="58" rx="11" fill="#1C2942"/>
  <rect x="236" y="152" width="15" height="48" rx="7" fill="#3B556D"/>
  <rect x="255" y="152" width="15" height="48" rx="7" fill="#3B556D"/>
  <ellipse cx="244" cy="200" rx="13" ry="6" fill="#0B162C"/>
  <ellipse cx="263" cy="200" rx="13" ry="6" fill="#0B162C"/>
  <rect x="218" y="104" width="15" height="40" rx="7" fill="#D4956A" transform="rotate(20,226,104)"/>
  <rect x="270" y="100" width="15" height="40" rx="7" fill="#D4956A" transform="rotate(-15,278,100)"/>
  <path d="M290 60 Q298 70 290 80" fill="none" stroke="#25D366" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
  <path d="M296 54 Q308 70 296 86" fill="none" stroke="#25D366" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
  <path d="M302 48 Q318 70 302 92" fill="none" stroke="#25D366" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
  <rect x="218" y="40" width="56" height="22" rx="11" fill="#16A34A"/>
  <rect x="228" y="47" width="36" height="3" rx="1.5" fill="white" opacity="0.9"/>
  <rect x="232" y="53" width="28" height="3" rx="1.5" fill="white" opacity="0.7"/>
</svg>`;

const SLIDES = [
  {
    id:          '1',
    bg:          '#EBF7F7',
    accent:      '#5FC2BA',
    svg:         SVG_1,
    title:       'Trouvez le bon prestataire',
    description: 'Mécaniciens, électriciens, couturiers...\nTous les artisans de Ngaoundéré réunis en un seul endroit.',
    btnLabel:    'Suivant',
  },
  {
    id:          '2',
    bg:          '#EEF2FF',
    accent:      '#4B6BFB',
    svg:         SVG_2,
    title:       'Vérifiez avant de contacter',
    description: 'Score de confiance, avis réels et badges de vérification\npour faire le bon choix en toute sécurité.',
    btnLabel:    'Suivant',
  },
  {
    id:          '3',
    bg:          '#F0FDF4',
    accent:      '#16A34A',
    svg:         SVG_3,
    title:       'Contactez directement',
    description: 'Un appel ou un message WhatsApp en un tap.\nPas d\'intermédiaire, pas de commission.',
    btnLabel:    'Commencer',
  },
];

// ── Dots ──────────────────────────────────────────────────────────
function Dots({ current, total, accent }) {
  return (
    <View style={st.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            st.dot,
            i === current
              ? [st.dotActive, { backgroundColor: accent }]
              : st.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ── Slide ─────────────────────────────────────────────────────────
function Slide({ item }) {
  return (
    <View style={[st.slide, { width, backgroundColor: item.bg }]}>
      <View style={st.svgWrap}>
        <SvgXml xml={item.svg} width="100%" height="100%" />
      </View>
    </View>
  );
}

// ── Écran ─────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const listRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const current = SLIDES[idx];
  const isLast  = idx === SLIDES.length - 1;

  async function finish() {
    await AsyncStorage.setItem('adma_onboarded', '1');
    router.replace('/(auth)/login');
  }

  function next() {
    if (!isLast) {
      const n = idx + 1;
      listRef.current?.scrollToIndex({ index: n, animated: true });
      setIdx(n);
    } else {
      finish();
    }
  }

  function onMomentumScrollEnd(e) {
    const n = Math.round(e.nativeEvent.contentOffset.x / width);
    setIdx(n);
  }

  return (
    <View style={[st.flex, { backgroundColor: current.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={current.bg} />

      {/* Bouton Passer */}
      <View style={[st.topBar, { paddingTop: insets.top + 12 }]}>
        <View />
        {!isLast && (
          <TouchableOpacity style={st.skipBtn} onPress={finish}>
            <Text style={[st.skipText, { color: current.accent }]}>Passer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Carrousel */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={s => s.id}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item }) => <Slide item={item} />}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />

      {/* Footer : texte + navigation */}
      <View style={[st.footer, { paddingBottom: insets.bottom + 28 }]}>
        <View style={st.textBlock}>
          <Text style={st.title}>{current.title}</Text>
          <Text style={st.desc}>{current.description}</Text>
        </View>

        <View style={st.navRow}>
          <Dots current={idx} total={SLIDES.length} accent={current.accent} />

          <TouchableOpacity
            style={[st.nextBtn, { backgroundColor: current.accent }]}
            onPress={next}
            activeOpacity={0.85}
          >
            <Text style={st.nextBtnText}>{current.btnLabel}</Text>
            {!isLast && <ChevronRight size={20} color="#fff" strokeWidth={2.5} />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  flex:        { flex: 1 },
  topBar:      { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 8 },
  skipBtn:     { paddingHorizontal: 14, paddingVertical: 8 },
  skipText:    { fontSize: 14, fontWeight: '600' },

  slide:       { alignItems: 'center', paddingTop: 24 },
  svgWrap:     { width: width * 0.85, height: height * 0.40 },

  footer:      { paddingHorizontal: 28, paddingTop: 20, gap: 24 },
  textBlock:   { gap: 10 },
  title:       { fontSize: 26, fontWeight: '800', color: colors.navy, letterSpacing: -0.3, lineHeight: 32 },
  desc:        { fontSize: 15, color: colors.textSecondary, lineHeight: 24 },

  navRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  dotsRow:     { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dot:         { height: 8, borderRadius: 4 },
  dotActive:   { width: 24 },
  dotInactive: { width: 8, backgroundColor: '#D1D5DB' },

  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
