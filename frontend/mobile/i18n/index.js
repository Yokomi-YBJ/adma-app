/**
 * ADMA — Configuration i18n
 * Langues : Français / Anglais / Fulfulde
 * Détection automatique depuis la locale du téléphone
 */
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-pluralrules/locale-data/fr.js';
import '@formatjs/intl-pluralrules/locale-data/ff.js';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr  from './fr.json';
import en  from './en.json';
import ful from './ful.json';

const LANG_KEY   = 'adma_language';
const SUPPORTED  = ['fr', 'en', 'ful'];
const DEFAULT    = 'fr';

// ── Alias 'ful' → 'ff' ──────────────────────────────────────────
// 'ful' n'existe pas dans CLDR (base Intl). Le fulfulde y est référencé
// sous 'ff'. On patche Intl.PluralRules pour rediriger silencieusement.
if (typeof Intl !== 'undefined' && Intl.PluralRules && !Intl.PluralRules.__admaPatched) {
  const Original = Intl.PluralRules;

  const Patched = function (locales, options) {
    const normalized =
      locales === 'ful' ? 'ff' :
      Array.isArray(locales) ? locales.map(l => (l === 'ful' ? 'ff' : l)) :
      locales;
    return new Original(normalized, options);
  };

  Patched.prototype = Original.prototype;
  Patched.supportedLocalesOf = Original.supportedLocalesOf;
  Patched.__admaPatched = true;

  Intl.PluralRules = Patched;
}

function detectSystemLanguage() {
  const locale = Localization.getLocales()[0]?.languageCode || DEFAULT;
  // 'ful' interne, mais on accepte aussi les codes 'ff' / 'fula' du système
  if (['ff', 'ful', 'fula', 'fuv'].includes(locale)) return 'ful';
  if (locale.startsWith('fr')) return 'fr';
  if (locale.startsWith('en')) return 'en';
  return DEFAULT;
}

export async function initI18n() {
  let savedLang = null;
  // If storage is unavailable, choose the device language instead.
  try { savedLang = await AsyncStorage.getItem(LANG_KEY); } catch {}

  const language = SUPPORTED.includes(savedLang) ? savedLang : detectSystemLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      fr:  { translation: fr  },
      en:  { translation: en  },
      ful: { translation: ful },
    },
    lng:             language,
    fallbackLng:     'fr',
    interpolation:   { escapeValue: false },
    compatibilityJSON: 'v4',
  });

  return i18n;
}

export async function setLanguage(lang) {
  if (!SUPPORTED.includes(lang)) return;
  await i18n.changeLanguage(lang);
  // Language change remains active for this run even if persistence is unavailable.
  try { await AsyncStorage.setItem(LANG_KEY, lang); } catch {}
}

export function getCurrentLanguage() { return i18n.language; }

export default i18n;