import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Save, UserRound } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';
import { showAppModal } from '../../components/ui/AppModal';

export default function EditProfileScreen() {
  const { t }   = useTranslation();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const user    = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || user.first_name || '');
      setLastName(user.lastName || user.last_name || '');
    }
  }, [user]);

  const avatarUri = user?.avatarUrl || user?.avatar_url;
  const initials = useMemo(() => {
    const name = [firstName || user?.firstName || user?.first_name, lastName || user?.lastName || user?.last_name]
      .filter(Boolean)
      .join(' ') || 'AD';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [firstName, lastName, user]);

  // ─── Changer la photo de profil ────────────────────────────────
  async function handleAvatarPress() {
    if (uploadingAvatar) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAppModal({
        title: t('common.error', 'Erreur'),
        message: t('create.permPhoto', 'Autorisez l\'accès à vos photos.'),
        confirmText: 'OK',
        variant: 'warning',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      setUploadingAvatar(true);
      try {
        const uri = result.assets[0].uri;
        const formData = new FormData();
        formData.append('avatar', {
          uri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        });

        const res = await api.post('/users/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        // Mettre à jour le store avec la nouvelle URL
        updateUser({
          avatarUrl: res.data.data.avatarUrl,
          avatar_url: res.data.data.avatarUrl,
        });

        showAppModal({
          title: t('common.success', 'Succès'),
          message: t('editProfile.avatarUpdated', 'Photo de profil mise à jour'),
          confirmText: 'OK',
          variant: 'success',
        });
      } catch (error) {
        showAppModal({
          title: t('common.error', 'Erreur'),
          message: error?.response?.data?.message || t('editProfile.avatarError', 'Impossible de mettre à jour la photo.'),
          confirmText: 'OK',
          variant: 'danger',
        });
      } finally {
        setUploadingAvatar(false);
      }
    }
  }

  // ─── Enregistrer les modifications du profil ──────────────────
  async function handleSave() {
    const payload = {};
    const nextFirst = firstName.trim();
    const nextLast = lastName.trim();

    if (nextFirst && nextFirst !== (user?.firstName || user?.first_name || '')) payload.firstName = nextFirst;
    if (nextLast && nextLast !== (user?.lastName || user?.last_name || '')) payload.lastName = nextLast;

    if (!Object.keys(payload).length) {
      showAppModal({
        title: t('common.info', 'Information'),
        message: t('editProfile.noChanges', 'Modifiez votre profil pour enregistrer.'),
        confirmText: 'OK',
        variant: 'info',
      });
      return;
    }

    setSaving(true);
    try {
      await api.put('/users/me', payload);
      updateUser({
        ...payload,
        first_name: nextFirst || user?.first_name,
        last_name: nextLast || user?.last_name,
      });
      showAppModal({
        title: t('common.success', 'Succès'),
        message: t('editProfile.saved', 'Profil mis à jour avec succès.'),
        confirmText: 'OK',
        variant: 'success',
        onConfirm: () => router.back(),
      });
    } catch (error) {
      showAppModal({
        title: t('common.error', 'Erreur'),
        message: error?.response?.data?.message || t('common.saveError', 'La mise à jour a échoué.'),
        confirmText: 'OK',
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.navy} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('editProfile.title', 'Modifier le profil')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarCard}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleAvatarPress}
            disabled={uploadingAvatar}
            activeOpacity={0.7}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            {uploadingAvatar && (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="small" color={colors.white} />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.avatarMeta}>
            <Text style={styles.avatarTitle}>{t('create.photoLabel', 'Photo de profil')}</Text>
            <Text style={styles.avatarHint}>{t('editProfile.avatarHint', 'Appuyez pour modifier la photo.')}</Text>
          </View>

          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={handleAvatarPress}
            disabled={uploadingAvatar}
            activeOpacity={0.8}
          >
            <Camera size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Input
            label={t('editProfile.firstNameLabel', 'Prénom')}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('editProfile.firstNamePlaceholder', 'Votre prénom')}
            autoCapitalize="words"
          />

          <Input
            label={t('editProfile.lastNameLabel', 'Nom')}
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('editProfile.lastNamePlaceholder', 'Votre nom')}
            autoCapitalize="words"
          />

          <View style={styles.callout}>
            <UserRound size={18} color={colors.primary} />
            <Text style={styles.calloutText}>
              {t('editProfile.calloutText', 'Ces informations seront visibles sur vos avis et vos échanges.')}
            </Text>
          </View>
        </View>

        <Button
          title={saving ? t('common.saving', 'Enregistrement...') : t('common.saveChanges', 'Enregistrer les modifications')}
          onPress={handleSave}
          loading={saving}
          icon={Save}
          iconPosition="left"
          size="lg"
          style={{ marginTop: 16 }}
        />
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    width: 66,
    height: 66,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: '800',
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMeta: {
    flex: 1,
    marginLeft: 14,
  },
  avatarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  avatarHint: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  cameraBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.primaryBg,
  },
  calloutText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
