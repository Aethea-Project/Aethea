import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppError } from './AppError.js';

let cachedClient: SupabaseClient | null = null;

/**
 * Service-role Supabase client for admin-only backend operations.
 */
export const getSupabaseAdminClient = (): SupabaseClient => {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new AppError('Supabase admin client is not configured', 503, 'SUPABASE_ADMIN_UNAVAILABLE');
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
};
