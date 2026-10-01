/**
 * ADMA — Contrôleur Catégories Admin
 */
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getCategories(req, res) {
  const [rows] = await query(`
    SELECT c.*,
           p.name_fr AS parent_name,
           (SELECT COUNT(*) FROM providers prov WHERE prov.category_id = c.id AND prov.deleted_at IS NULL) AS provider_count
    FROM categories c
    LEFT JOIN categories p ON p.id = c.parent_id
    ORDER BY c.sort_order ASC, c.name_fr ASC
  `);

  res.json({ success: true, data: rows });
}

export async function createCategory(req, res) {
  const { nameFr, nameEn, nameFul, parentId, icon, sortOrder = 0 } = req.body;

  if (!nameFr || !nameEn) {
    throw new AppError('Les noms en français et en anglais sont obligatoires', 400, 'VALIDATION_ERROR');
  }

  const slug = nameFr
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');

  const [result] = await query(
    `INSERT INTO categories (parent_id, name_fr, name_en, name_ful, slug, icon, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
    [parentId || null, nameFr.trim(), nameEn.trim(), (nameFul || '').trim(), slug, icon || null, parseInt(sortOrder, 10) || 0]
  );

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'category_create', 'category', result.insertId, JSON.stringify({ nameFr, slug })]
  );

  res.status(201).json({ success: true, message: 'Catégorie créée avec succès', data: { id: result.insertId } });
}

export async function updateCategory(req, res) {
  const { id } = req.params;
  const { nameFr, nameEn, nameFul, parentId, icon, sortOrder, isActive } = req.body;

  const sets = [];
  const vals = [];

  if (nameFr !== undefined) {
    sets.push('name_fr = ?');
    vals.push(nameFr.trim());
    const slug = nameFr
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    sets.push('slug = ?');
    vals.push(slug);
  }

  if (nameEn !== undefined) { sets.push('name_en = ?'); vals.push(nameEn.trim()); }
  if (nameFul !== undefined) { sets.push('name_ful = ?'); vals.push(nameFul.trim()); }
  if (parentId !== undefined) { sets.push('parent_id = ?'); vals.push(parentId || null); }
  if (icon !== undefined) { sets.push('icon = ?'); vals.push(icon); }
  if (sortOrder !== undefined) { sets.push('sort_order = ?'); vals.push(parseInt(sortOrder, 10)); }
  if (isActive !== undefined) { sets.push('is_active = ?'); vals.push(isActive ? 1 : 0); }

  if (!sets.length) {
    return res.json({ success: true });
  }

  vals.push(id);
  await query(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, vals);

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'category_update', 'category', id, JSON.stringify(req.body)]
  );

  res.json({ success: true, message: 'Catégorie mise à jour avec succès' });
}

export async function deleteCategory(req, res) {
  const { id } = req.params;

  // Vérifier si des prestataires utilisent cette catégorie
  const [[{ count }]] = await query(
    'SELECT COUNT(*) AS count FROM providers WHERE category_id = ? AND deleted_at IS NULL',
    [id]
  );

  if (count > 0) {
    throw new AppError(
      `Impossible de supprimer cette catégorie car ${count} prestataire(s) y sont rattaché(s). Veuillez d'abord les réassigner.`,
      400,
      'CATEGORY_IN_USE'
    );
  }

  // Vérifier si elle a des sous-catégories
  const [[{ subCount }]] = await query('SELECT COUNT(*) AS subCount FROM categories WHERE parent_id = ?', [id]);
  if (subCount > 0) {
    throw new AppError(
      'Impossible de supprimer cette catégorie car elle contient des sous-catégories. Supprimez-les d\'abord.',
      400,
      'CATEGORY_HAS_CHILDREN'
    );
  }

  await query('DELETE FROM categories WHERE id = ?', [id]);

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'category_delete', 'category', id]
  );

  res.json({ success: true, message: 'Catégorie supprimée avec succès' });
}
