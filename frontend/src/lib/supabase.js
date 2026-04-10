import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Subscribe to realtime changes
 * @param {string} table - Table name (vitals, alerts, patients)
 * @param {function} callback - Callback function for changes
 * @returns {function} Unsubscribe function
 */
export const subscribeToChanges = (table, callback) => {
  const subscription = supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
      },
      (payload) => {
        callback(payload.eventType, payload.new, payload.old);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export default supabase;
