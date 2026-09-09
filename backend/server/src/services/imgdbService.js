/**
 * ADMA — Service de stockage d'images (Cloudinary)
 * Nommé imgdbService pour compatibilité avec les imports existants
 */
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Vérification et configuration
const cloudName = config.cloudinary?.cloudName;
const apiKey = config.cloudinary?.apiKey;
const apiSecret = config.cloudinary?.apiSecret;

if (!cloudName || !apiKey || !apiSecret) {
  logger.error('❌ Cloudinary configuration manquante ou invalide !');
  logger.error(`cloudName: ${cloudName ? '✅' : '❌'}, apiKey: ${apiKey ? '✅' : '❌'}, apiSecret: ${apiSecret ? '✅' : '❌'}`);
} else {
  logger.info('✅ Cloudinary configuré avec succès');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file) {
  if (!file) throw new Error('Aucun fichier fourni');
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    throw new Error(`Format non supporté. Acceptés : ${ALLOWED_MIMES.join(', ')}`);
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Fichier trop volumineux. Maximum : 5 Mo');
  }
}

export async function uploadImage(file, folder = 'adma/misc', options = {}) {
  validateImageFile(file);
  try {
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    logger.info(`📤 Upload vers Cloudinary : ${folder}`);
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: 'image',
      ...options,
    });
    logger.info(`✅ Upload réussi : ${result.secure_url}`);
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    // Log détaillé de l'erreur
    logger.error('❌ Cloudinary upload error', {
      message: err.message,
      http_code: err.http_code,
      error: err.error,
      folder,
    });
    // Propager l'erreur réelle
    throw new Error(`Cloudinary : ${err.message || 'Erreur inconnue'}`);
  }
}

export async function uploadProviderPhoto(file, providerId) {
  return uploadImage(file, `adma/providers/${providerId}`, {
    public_id: 'profile',
    overwrite: true,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
  });
}

export async function uploadGalleryPhoto(file, providerId) {
  return uploadImage(file, `adma/providers/${providerId}/gallery`, {
    transformation: [
      { width: 800, height: 600, crop: 'limit', quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
  });
}

export async function uploadUserAvatar(file, userId) {
  return uploadImage(file, `adma/users/${userId}`, {
    public_id: 'avatar',
    overwrite: true,
    transformation: [
      { width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
  });
}

export async function uploadCNIDocument(file, requestId, side) {
  validateImageFile(file);
  try {
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `adma/verification/${requestId}`,
      public_id: `cni_${side}`,
      overwrite: true,
      type: 'private',
    });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    logger.error('CNI upload error', err.message);
    throw new Error(`Erreur lors de l'upload du document : ${err.message}`);
  }
}

export async function deleteImage(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    logger.info(`🗑️ Image supprimée: ${publicId}`);
  } catch (err) {
    logger.warn(`Échec suppression Cloudinary ${publicId}: ${err.message}`);
  }
}

export async function deleteImages(publicIds) {
  if (!publicIds?.length) return;
  try {
    await cloudinary.api.delete_resources(publicIds, { resource_type: 'image' });
  } catch (err) {
    logger.warn('Échec suppression batch Cloudinary', err.message);
  }
}