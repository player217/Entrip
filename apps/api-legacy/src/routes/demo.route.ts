import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Dev-only demo endpoints guard
function demoEnabled() {
  // Enabled when explicit flag set, or when not in production
  return process.env.ENABLE_DEMO_ENDPOINTS === 'true' || process.env.NODE_ENV !== 'production';
}

// Map DB company codes to login form company codes shown in UI
function mapCompanyCodeForLogin(dbCode: string): string {
  switch (dbCode) {
    case 'ENTRIP_MAIN':
      return 'entrip';
    case 'j1':
      return 'j1';
    case 'star':
      return 'startour';
    case 'happy':
      return 'happytravel';
    default:
      return dbCode.toLowerCase();
  }
}

// GET /api/demo-accounts
// Returns a curated list of active demo accounts by company for quick login buttons.
router.get('/demo-accounts', async (req, res) => {
  if (!demoEnabled()) {
    return res.status(404).json({ code: 404, message: 'Not Found' });
  }

  try {
    const companies = ['ENTRIP_MAIN', 'j1', 'star', 'happy'];

    // Fetch a few representative users per company (admin + managers + a user)
    const results: any[] = [];

    for (const companyCode of companies) {
      const users = await prisma.user.findMany({
        where: { companyCode, isActive: true },
        select: { id: true, email: true, name: true, role: true, companyCode: true },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        take: 10,
      });

      // Prefer deterministic subset: first admin, up to two managers, and first user
      const admin = users.find(u => String(u.role).toUpperCase() === 'ADMIN');
      const managers = users.filter(u => String(u.role).toUpperCase() === 'MANAGER').slice(0, 2);
      const aUser = users.find(u => String(u.role).toUpperCase() === 'USER');

      const subset = [admin, ...managers, aUser].filter(Boolean) as typeof users;
      for (const u of subset) {
        results.push({
          label: `${companyCode} ${String(u.role).toUpperCase()}`,
          companyCode: mapCompanyCodeForLogin(u.companyCode),
          username: u.email,
          role: String(u.role).toUpperCase(),
        });
      }
    }

    return res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to load demo accounts:', err);
    return res.status(500).json({ success: false, message: 'Failed to load demo accounts' });
  }
});

export default router;

