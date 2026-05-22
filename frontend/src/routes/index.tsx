export const adminRoutes = [
  '/admin/dashboard',
  '/admin/accounts',
  '/admin/accounts/new',
  '/admin/packages',
  '/admin/dns',
  '/admin/email',
  '/admin/databases',
  '/admin/backups',
  '/admin/security',
  '/admin/server/status',
  '/admin/notifications',
  '/admin/settings'
] as const;

export const userRoutes = [
  '/panel/dashboard',
  '/panel/files',
  '/panel/domains',
  '/panel/email',
  '/panel/databases',
  '/panel/backups',
  '/panel/ssl',
  '/panel/software',
  '/panel/preferences'
] as const;
