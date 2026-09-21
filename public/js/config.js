// CACTF Platform - Client Configuration
// Environment: production
// Last updated: 2024-10-15

const CACTF_CONFIG = {
  api: {
    baseUrl: '/api',
    version: 'v2',
    key: 'sk-ctf-2024-s3cur1ty-k3y-d0nt-sh4r3',
    timeout: 30000
  },
  database: {
    host: 'db.cactf-platform.com',
    user: 'platform_admin',
    password: 'sup3r_s3cr3t_db_p4ss!',
    port: 5432
  },
  stripe: {
    publishableKey: 'pk_live_51HG3...',
    webhookSecret: 'whsec_test_...'
  },
  analytics: {
    trackingId: 'UA-12345678-1',
    debug: true
  }
};

if (CACTF_CONFIG.analytics.debug) {
  console.log('[CACTF] Config loaded — env: production');
}
