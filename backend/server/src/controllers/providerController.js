/**
 * ADMA — Contrôleur Prestataires
 */
import multer from 'multer';
import { query } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { uploadProviderPhoto, uploadGalleryPhoto, uploadCNIDocument, deleteImage } from '../services/imgdbService.js';
import { notifyNewFavorite } from '../services/notificationService.js';
import { invalidateCache } from '../services/cacheService.js';

const PAGE_SIZE = 20;

// ── Recherche ─────────────────────────────────────────────────────
export const searchProviders = asyncHandler(async (req, res) => {
  const { q, categoryId, cityId, neighborhoodId, isVerified, availability, page = 1 } = req.query;
  const userId = req.user?.id || null;
  const offset = (Math.max(1, parseInt(page)) - 1) * PAGE_SIZE;
  const conds  = ['p.is_active=TRUE', 'p.deleted_at IS NULL'];
  const params = [];

  if (categoryId)     { conds.push('p.category_id=?');   params.push(parseInt(categoryId)); }
  if (cityId)         { conds.push('p.city_id=?');        params.push(parseInt(cityId)); }
  if (neighborhoodId) { conds.push('p.neighborhood_id=?');params.push(parseInt(neighborhoodId)); }
  if (availability)   { conds.push('p.availability=?');   params.push(availability); }
  if (isVerified === 'true') conds.push("p.verification_status IN ('verified_id','verified')");
  if (q?.trim().length >= 2) {
    conds.push('(MATCH(p.name,p.specialty,p.description) AGAINST (? IN BOOLEAN MODE) OR p.name LIKE ?)');
    params.push(`${q.trim()}*`, `%${q.trim()}%`);
  }

  const where = conds.join(' AND ');
  const favSub = userId
    ? `(SELECT 1 FROM favorites f WHERE f.user_id=${parseInt(userId)} AND f.provider_id=p.id LIMIT 1) IS NOT NULL`
    : 'FALSE';

  const [rows] = await query(`
    SELECT p.id, p.name, p.specialty, p.photo_url, p.availability,
           p.trust_score, p.review_count, p.recommend_count, p.ranking_score,
           p.verification_status, p.plan, p.created_at,
           c.name_fr AS category_name_fr,
           ci.name AS city_name, n.name AS neighborhood_name,
           ${favSub} AS is_favorite
    FROM providers p
    JOIN categories c  ON c.id=p.category_id
    JOIN cities ci     ON ci.id=p.city_id
    JOIN neighborhoods n ON n.id=p.neighborhood_id
    WHERE ${where}
    ORDER BY p.ranking_score DESC, p.created_at DESC
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `, params);

  const [[{ total }]] = await query(
    `SELECT COUNT(*) AS total FROM providers p
     JOIN categories c ON c.id=p.category_id WHERE ${where}`, params
  );

  res.json({ success: true, data: {
    providers:  rows.map(formatProvider),
    pagination: { page: parseInt(page), limit: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) },
  }});
});

// ── Détail ────────────────────────────────────────────────────────
export const getProvider = asyncHandler(async (req, res) => {
  const providerId = parseInt(req.params.id);
  const userId     = req.user?.id || null;
  const favSub     = userId
    ? `(SELECT 1 FROM favorites f WHERE f.user_id=${userId} AND f.provider_id=p.id LIMIT 1) IS NOT NULL`
    : 'FALSE';

  const [rows] = await query(`
    SELECT p.*, c.name_fr AS category_name_fr, c.name_en AS category_name_en,
           ci.name AS city_name, n.name AS neighborhood_name,
           ${favSub} AS is_favorite,
           (SELECT COUNT(*) FROM contact_events ce
            WHERE ce.provider_id=p.id AND ce.event_type='profile_view'
            AND ce.created_at >= DATE_FORMAT(NOW(),'%Y-%m-01')) AS views_this_month,
           (SELECT COUNT(*) FROM favorites fv WHERE fv.provider_id=p.id) AS total_favorites
    FROM providers p
    JOIN categories c  ON c.id=p.category_id
    JOIN cities ci     ON ci.id=p.city_id
    JOIN neighborhoods n ON n.id=p.neighborhood_id
    WHERE p.id=? AND p.is_active=TRUE AND p.deleted_at IS NULL
  `, [providerId]);

  if (!rows.length) throw new AppError('Prestataire introuvable', 404, 'PROVIDER_NOT_FOUND');

  const [photos]  = await query('SELECT id, photo_url, caption, position FROM provider_photos WHERE provider_id=? ORDER BY position ASC', [providerId]);
  const [reviews] = await query(`
    SELECT r.id, r.verdict, r.comment, r.created_at,
           CONCAT(u.first_name,' ',u.last_name) AS reviewer_name,
           rr.comment AS response, rr.created_at AS response_at
    FROM reviews r JOIN users u ON u.id=r.reviewer_id
    LEFT JOIN review_responses rr ON rr.review_id=r.id
    WHERE r.provider_id=? AND r.status='active'
    ORDER BY r.created_at DESC LIMIT 10
  `, [providerId]);

  res.json({ success: true, data: { ...formatProvider(rows[0], true), photos, reviews } });
});

// ── Infos contact ─────────────────────────────────────────────────
export const getContact = asyncHandler(async (req, res) => {
  const [rows] = await query(
    'SELECT phone_number, whatsapp_number, contact_method FROM providers WHERE id=? AND is_active=TRUE',
    [req.params.id]
  );
  if (!rows.length) throw new AppError('Prestataire introuvable', 404, 'PROVIDER_NOT_FOUND');
  const { phone_number, whatsapp_number, contact_method } = rows[0];
  res.json({ success: true, data: {
    contactMethod:  contact_method,
    phoneNumber:    contact_method !== 'whatsapp' ? phone_number   : null,
    whatsappNumber: contact_method !== 'phone'    ? whatsapp_number : null,
  }});
});

// ── Ma fiche ──────────────────────────────────────────────────────
export const getMyProvider = asyncHandler(async (req, res) => {
  const [rows] = await query('SELECT id FROM providers WHERE user_id=? AND deleted_at IS NULL', [req.user.id]);
  if (!rows.length) return res.json({ success: true, data: null });
  req.params.id = rows[0].id;
  return getProvider(req, res);
});

// ── Créer fiche ───────────────────────────────────────────────────
export const createProvider = asyncHandler(async (req, res) => {
  const [existing] = await query('SELECT id FROM providers WHERE user_id=? AND deleted_at IS NULL', [req.user.id]);
  if (existing.length) throw new AppError('Vous avez déjà une fiche prestataire', 409, 'PROVIDER_EXISTS');

  const {
    categoryId, name, specialty, description, cityId, neighborhoodId,
    contactMethod = 'both', phoneNumber, whatsappNumber, availability = 'available', hoursJson,
  } = req.body;

  if (!categoryId || !name?.trim() || !specialty?.trim() || !cityId || !neighborhoodId) {
    throw new AppError('Champs obligatoires manquants', 422, 'MISSING_FIELDS');
  }

  let photoUrl = null; let cloudinaryId = null;
  if (req.file) {
    const up = await uploadProviderPhoto(req.file, req.user.id);
    photoUrl = up.url; cloudinaryId = up.publicId;
  }

  const [result] = await query(`
    INSERT INTO providers
      (user_id, category_id, name, specialty, description, city_id, neighborhood_id,
       phone_number, whatsapp_number, contact_method, photo_url, cloudinary_id,
       hours_json, availability)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `, [
    req.user.id, categoryId, name.trim(), specialty.trim(),
    description?.trim() || null, cityId, neighborhoodId,
    phoneNumber || null, whatsappNumber || null, contactMethod,
    photoUrl, cloudinaryId, hoursJson ? JSON.stringify(hoursJson) : null, availability,
  ]);

  invalidateCache('home_providers');
  req.params.id = result.insertId;
  res.status(201);
  return getProvider(req, res);
});

// ── Modifier fiche ────────────────────────────────────────────────
export const updateProvider = asyncHandler(async (req, res) => {
  const providerId = parseInt(req.params.id);
  const [rows] = await query('SELECT id, user_id, cloudinary_id FROM providers WHERE id=? AND deleted_at IS NULL', [providerId]);
  if (!rows.length || rows[0].user_id !== req.user.id) throw new AppError('Accès refusé', 403, 'FORBIDDEN');

  const allowed = { name:'name', specialty:'specialty', description:'description',
    contactMethod:'contact_method', phoneNumber:'phone_number', whatsappNumber:'whatsapp_number',
    websiteUrl:'website_url', availability:'availability', cityId:'city_id', neighborhoodId:'neighborhood_id' };

  const sets = []; const vals = [];
  for (const [jsKey, dbCol] of Object.entries(allowed)) {
    if (req.body[jsKey] !== undefined) { sets.push(`${dbCol}=?`); vals.push(req.body[jsKey]); }
  }

  if (req.file) {
    const up = await uploadProviderPhoto(req.file, providerId);
    sets.push('photo_url=?', 'cloudinary_id=?');
    vals.push(up.url, up.publicId);
    if (rows[0].cloudinary_id) deleteImage(rows[0].cloudinary_id).catch(() => {});
  }

  if (!sets.length) throw new AppError('Aucune donnée à mettre à jour', 400, 'NO_DATA');
  vals.push(providerId);
  await query(`UPDATE providers SET ${sets.join(',')} WHERE id=?`, vals);
  invalidateCache('home_providers');
  return getProvider(req, res);
});

// ── Supprimer fiche ───────────────────────────────────────────────
export const deleteProvider = asyncHandler(async (req, res) => {
  const [rows] = await query('SELECT id, user_id, cloudinary_id FROM providers WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!rows.length) throw new AppError('Fiche introuvable', 404, 'NOT_FOUND');
  await query('UPDATE providers SET is_active=FALSE, deleted_at=NOW() WHERE id=?', [req.params.id]);
  if (rows[0].cloudinary_id) deleteImage(rows[0].cloudinary_id).catch(() => {});
  invalidateCache('home_providers');
  res.json({ success: true, message: 'Fiche supprimée' });
});

// ── Statistiques ──────────────────────────────────────────────────
export const getProviderStats = asyncHandler(async (req, res) => {
  const [rows] = await query('SELECT id FROM providers WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!rows.length) throw new AppError('Accès refusé', 403, 'FORBIDDEN');

  const [[stats]] = await query(`
    SELECT
      SUM(event_type='profile_view')   AS total_views,
      SUM(event_type='phone_click')    AS total_phone_clicks,
      SUM(event_type='whatsapp_click') AS total_wa_clicks,
      SUM(event_type='profile_view' AND created_at>=DATE_FORMAT(NOW(),'%Y-%m-01'))   AS views_month,
      SUM(event_type='phone_click'    AND created_at>=DATE_FORMAT(NOW(),'%Y-%m-01')) AS phone_month,
      SUM(event_type='whatsapp_click' AND created_at>=DATE_FORMAT(NOW(),'%Y-%m-01')) AS wa_month
    FROM contact_events WHERE provider_id=?
  `, [req.params.id]);

  const [[fav]]  = await query('SELECT COUNT(*) AS total FROM favorites WHERE provider_id=?', [req.params.id]);
  const [[prov]] = await query('SELECT review_count, recommend_count, trust_score FROM providers WHERE id=?', [req.params.id]);

  res.json({ success: true, data: {
    totalViews:         stats.total_views        || 0,
    totalPhoneClicks:   stats.total_phone_clicks || 0,
    totalWaClicks:      stats.total_wa_clicks    || 0,
    viewsThisMonth:     stats.views_month        || 0,
    phoneThisMonth:     stats.phone_month        || 0,
    waThisMonth:        stats.wa_month           || 0,
    totalFavorites:     fav.total                || 0,
    reviewCount:        prov.review_count        || 0,
    recommendCount:     prov.recommend_count     || 0,
    trustScore:         prov.trust_score         || 0,
  }});
});

// ── Demande vérification ──────────────────────────────────────────
export const requestVerification = asyncHandler(async (req, res) => {
  const [provRows] = await query(
    'SELECT id, verification_status FROM providers WHERE user_id=? AND deleted_at IS NULL', [req.user.id]
  );
  if (!provRows.length) throw new AppError('Aucune fiche prestataire', 404, 'NO_PROVIDER');
  if (['pending','reviewing'].includes(provRows[0].verification_status)) {
    throw new AppError('Une demande est déjà en cours', 409, 'REQUEST_PENDING');
  }
  const cniFront = req.files?.cniFront?.[0];
  const cniBack  = req.files?.cniBack?.[0];
  if (!cniFront) throw new AppError('Photo recto de CNI requise', 400, 'MISSING_CNI');

  const frontUp = await uploadCNIDocument(cniFront, `req_${provRows[0].id}`, 'front');
  let backUp    = null;
  if (cniBack) backUp = await uploadCNIDocument(cniBack, `req_${provRows[0].id}`, 'back');

  await query(
    `INSERT INTO verification_requests
       (provider_id, cni_front_url, cni_back_url, cni_front_cld, cni_back_cld, message)
     VALUES (?,?,?,?,?,?)`,
    [provRows[0].id, frontUp.url, backUp?.url || null, frontUp.publicId, backUp?.publicId || null, req.body.message || null]
  );
  await query("UPDATE providers SET verification_status='pending' WHERE id=?", [provRows[0].id]);
  res.status(201).json({ success: true, message: 'Demande de vérification envoyée' });
});

// ── Formateur ─────────────────────────────────────────────────────
function formatProvider(row, withDetails = false) {
  const base = {
    id:                 row.id,
    name:               row.name,
    specialty:          row.specialty,
    description:        row.description,
    categoryId:         row.category_id,
    categoryName:       row.category_name_fr,
    city:               row.city_name,
    neighborhood:       row.neighborhood_name,
    photoUrl:           row.photo_url,
    availability:       row.availability,
    contactMethod:      row.contact_method,
    verificationStatus: row.verification_status,
    plan:               row.plan,
    reviewCount:        row.review_count    || 0,
    recommendCount:     row.recommend_count || 0,
    trustScore:         row.trust_score     || 0,
    trustBadge:         getTrustBadge(row.trust_score, row.review_count),
    isFavorite:         !!row.is_favorite,
    viewsThisMonth:     row.views_this_month || 0,
    createdAt:          row.created_at,
  };
  if (withDetails) {
    base.websiteUrl     = row.website_url;
    base.totalFavorites = row.total_favorites || 0;
    base.planExpiresAt  = row.plan_expires_at;
  }
  return base;
}

function getTrustBadge(score, count) {
  if (!count) return 'new';
  if (score >= 80) return 'reliable';
  if (score >= 50) return 'correct';
  return 'caution';
}

// ── Rayons par plan (km) ──────────────────────────────────────────
const PLAN_RADIUS = {
  free:         3,
  premium:      6,
  professional: 9,
  enterprise:   null, // illimité
};

// ── Recherche géographique "Autour de moi" ────────────────────────
export const searchNearby = asyncHandler(async (req, res) => {
  const { lat, lng, categoryId, page = 1 } = req.query;

  if (!lat || !lng) {
    throw new AppError('Coordonnées GPS requises', 400, 'MISSING_COORDS');
  }

  const clientLat = parseFloat(lat);
  const clientLng = parseFloat(lng);

  if (isNaN(clientLat) || isNaN(clientLng)) {
    throw new AppError('Coordonnées invalides', 400, 'INVALID_COORDS');
  }

  const offset    = (Math.max(1, parseInt(page)) - 1) * PAGE_SIZE;
  const userId    = req.user?.id || null;

  const catFilter = categoryId ? 'AND p.category_id = ?' : '';
  const catParams = categoryId ? [parseInt(categoryId)] : [];

  const favSub = userId
    ? `(SELECT 1 FROM favorites f WHERE f.user_id=${parseInt(userId)} AND f.provider_id=p.id LIMIT 1) IS NOT NULL`
    : 'FALSE';

  // Formule Haversine — distance en km entre le client et le prestataire
  // Le rayon autorisé dépend du plan du prestataire
  const [rows] = await query(`
    SELECT
      p.id, p.name, p.specialty, p.photo_url, p.availability,
      p.trust_score, p.review_count, p.recommend_count,
      p.verification_status, p.plan,
      c.name_fr  AS category_name_fr,
      ci.name    AS city_name,
      n.name     AS neighborhood_name,
      ${favSub}  AS is_favorite,
      ROUND(
        6371 * ACOS(
          GREATEST(-1, LEAST(1,
            COS(RADIANS(?)) * COS(RADIANS(p.latitude))
            * COS(RADIANS(p.longitude) - RADIANS(?))
            + SIN(RADIANS(?)) * SIN(RADIANS(p.latitude))
          ))
        ), 2
      ) AS distance_km
    FROM providers p
    JOIN categories c    ON c.id  = p.category_id
    JOIN cities ci       ON ci.id = p.city_id
    JOIN neighborhoods n ON n.id  = p.neighborhood_id
    WHERE p.is_active    = TRUE
      AND p.deleted_at   IS NULL
      AND p.latitude     IS NOT NULL
      AND p.longitude    IS NOT NULL
      ${catFilter}
    HAVING distance_km <= CASE p.plan
      WHEN 'free'         THEN 3
      WHEN 'premium'      THEN 6
      WHEN 'professional' THEN 9
      ELSE 99999
    END
    ORDER BY distance_km ASC
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `, [clientLat, clientLng, clientLat, ...catParams]);

  // Compte total (sans LIMIT)
  const [[{ total }]] = await query(`
    SELECT COUNT(*) AS total FROM (
      SELECT p.id,
        ROUND(
          6371 * ACOS(
            GREATEST(-1, LEAST(1,
              COS(RADIANS(?)) * COS(RADIANS(p.latitude))
              * COS(RADIANS(p.longitude) - RADIANS(?))
              + SIN(RADIANS(?)) * SIN(RADIANS(p.latitude))
            ))
          ), 2
        ) AS distance_km
      FROM providers p
      WHERE p.is_active=TRUE AND p.deleted_at IS NULL
        AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        ${catFilter}
      HAVING distance_km <= CASE p.plan
        WHEN 'free' THEN 3 WHEN 'premium' THEN 6
        WHEN 'professional' THEN 9 ELSE 99999 END
    ) sub
  `, [clientLat, clientLng, clientLat, ...catParams]);

  res.json({
    success: true,
    data: {
      providers: rows.map(r => ({ ...formatProvider(r), distanceKm: r.distance_km })),
      pagination: { page: parseInt(page), limit: PAGE_SIZE, total, pages: Math.ceil(total / PAGE_SIZE) },
    },
  });
});

// ── Définir / mettre à jour la zone de service (GPS) ─────────────
export const updateGeoLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    throw new AppError('Coordonnées requises', 400, 'MISSING_COORDS');
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  // Validation : Ngaoundéré est approximativement dans ces bornes
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError('Coordonnées GPS invalides', 400, 'INVALID_COORDS');
  }

  const [rows] = await query(
    'SELECT id FROM providers WHERE user_id=? AND deleted_at IS NULL',
    [req.user.id]
  );
  if (!rows.length) throw new AppError('Aucune fiche prestataire', 404, 'NO_PROVIDER');

  await query(
    'UPDATE providers SET latitude=?, longitude=?, geo_updated_at=NOW() WHERE id=?',
    [lat, lng, rows[0].id]
  );

  res.json({
    success: true,
    message: 'Zone de service mise à jour',
    data: { latitude: lat, longitude: lng },
  });
});

// ── Supprimer la position GPS ─────────────────────────────────────
export const removeGeoLocation = asyncHandler(async (req, res) => {
  const [rows] = await query(
    'SELECT id FROM providers WHERE user_id=? AND deleted_at IS NULL',
    [req.user.id]
  );
  if (!rows.length) throw new AppError('Aucune fiche prestataire', 404, 'NO_PROVIDER');

  await query(
    'UPDATE providers SET latitude=NULL, longitude=NULL, geo_updated_at=NOW() WHERE id=?',
    [rows[0].id]
  );

  res.json({ success: true, message: 'Position GPS supprimée' });
});
