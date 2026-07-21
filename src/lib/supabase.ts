import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Simple validation helper
const isValidHttpUrl = (str: string | undefined): boolean => {
  if (!str) return false;
  return str.startsWith('http://') || str.startsWith('https://');
};

// Recursive proxy mock to prevent any crashes on chained query/auth methods when config is invalid
const defaultMockValue = {
  data: {
    session: null,
    user: null,
    subscription: { unsubscribe: () => {} },
    publicUrl: ''
  },
  error: null
};

const makeChainedMock = (val: any = defaultMockValue) => {
  const fn = () => {};
  const proxy: any = new Proxy(fn, {
    get: (target, prop) => {
      if (prop === 'then') {
        return (resolve: any) => Promise.resolve(val).then(resolve);
      }
      if (prop === 'catch') {
        return (cb: any) => Promise.resolve(val).catch(cb);
      }
      if (prop === 'finally') {
        return (cb: any) => { cb(); return Promise.resolve(val); };
      }
      if (typeof prop === 'symbol') {
        return undefined;
      }
      if (prop === 'toString' || prop === 'valueOf') {
        return () => '[MockSupabase]';
      }
      if (prop === 'subscription') {
        return { unsubscribe: () => {} };
      }
      if (prop === 'publicUrl') {
        return '';
      }
      return proxy;
    },
    apply: (target, thisArg, argumentsList) => {
      return proxy;
    }
  });
  return proxy;
};

export const mockSupabase = makeChainedMock();

let supabaseInstance: SupabaseClient | null = null;

const clientOptions = {
  auth: {
    persistSession: true,
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    fetch: (url: string | URL, options?: any) => {
      return fetch(url, {
        ...options,
        cache: 'no-store'
      });
    }
  }
};

export const getSupabase = (): SupabaseClient => {
  if (!supabaseUrl || !supabaseAnonKey || !isValidHttpUrl(supabaseUrl)) {
    return mockSupabase as unknown as SupabaseClient;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
  }
  return supabaseInstance;
};

// Return a safe mocked client if config is invalid to prevent module-load crashes
export const supabase = isValidHttpUrl(supabaseUrl) && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, clientOptions)
  : mockSupabase as unknown as SupabaseClient;

