/**
 * ADMA — Contrôleur Dashboard Admin
 */
import { query } from '../../config/database.js';

export async function getDashboardStats(req, res) {
  const [[users]]       = await query('SELECT COUNT(*) AS total FROM users WHERE status="active"');
  const [[newUsers]]    = await query('SELECT COUNT(*) AS total FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
  const [[providers]]   = await query('SELECT COUNT(*) AS total FROM providers WHERE is_active=TRUE AND deleted_at IS NULL');
  const [[verifiedProv]]= await query('SELECT COUNT(*) AS total FROM providers WHERE is_active=TRUE AND deleted_at IS NULL AND verification_status IN ("verified_id","verified")');
  const [[reviews]]     = await query('SELECT COUNT(*) AS total FROM reviews WHERE status="active"');
  const [[reports]]     = await query('SELECT COUNT(*) AS total FROM reports WHERE status="pending"');
  const [[verPending]]  = await query('SELECT COUNT(*) AS total FROM verification_requests WHERE status IN ("pending","reviewing")');
  const [[revenue]]     = await query('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status="completed" AND MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW())');
  const [[prevRevenue]] = await query('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status="completed" AND MONTH(created_at)=MONTH(DATE_SUB(NOW(),INTERVAL 1 MONTH)) AND YEAR(created_at)=YEAR(DATE_SUB(NOW(),INTERVAL 1 MONTH))');
  const [[totalRevenue]]= await query('SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status="completed"');
  
  const [planDist]      = await query('SELECT plan, COUNT(*) AS count FROM providers WHERE is_active=TRUE AND deleted_at IS NULL GROUP BY plan ORDER BY count DESC');
  const [cityDist]      = await query('SELECT ci.name, COUNT(*) AS count FROM providers p JOIN cities ci ON ci.id=p.city_id WHERE p.is_active=TRUE AND p.deleted_at IS NULL GROUP BY ci.id ORDER BY count DESC LIMIT 8');
  const [catDist]       = await query(`
    SELECT c.name_fr AS name, COUNT(p.id) AS count
    FROM categories c
    LEFT JOIN providers p ON p.category_id=c.id AND p.is_active=TRUE AND p.deleted_at IS NULL
    WHERE c.parent_id IS NULL
    GROUP BY c.id
    ORDER BY count DESC
    LIMIT 6
  `);
  
  const [dailyReg]      = await query('SELECT DATE(created_at) AS date, COUNT(*) AS count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY date ASC');
  const [dailyRevenue]  = await query('SELECT DATE(created_at) AS date, COALESCE(SUM(amount),0) AS amount FROM payments WHERE status="completed" AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY date ASC');
  const [recentActions] = await query('SELECT al.*, a.full_name AS admin_name, a.email AS admin_email FROM admin_logs al JOIN admins a ON a.id=al.admin_id ORDER BY al.created_at DESC LIMIT 8');

  res.json({
    success: true,
    data: {
      users: users.total,
      newUsers30d: newUsers.total,
      providers: providers.total,
      verifiedProviders: verifiedProv.total,
      reviews: reviews.total,
      pendingReports: reports.total,
      pendingVerifications: verPending.total,
      revenueThisMonth: Number(revenue.total),
      revenuePrevMonth: Number(prevRevenue.total),
      totalRevenue: Number(totalRevenue.total),
      planDistribution: planDist,
      cityDistribution: cityDist,
      categoryDistribution: catDist,
      dailyRegistrations: dailyReg,
      dailyRevenue: dailyRevenue,
      recentActions,
    }
  });
}
