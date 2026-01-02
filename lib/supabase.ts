import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/database';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase.ts:5',message:'ENV vars on module load',data:{url:process.env.EXPO_PUBLIC_SUPABASE_URL,key:process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.substring(0,20),allEnvKeys:Object.keys(process.env).filter(k=>k.startsWith('EXPO_PUBLIC'))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H3'})}).catch(()=>{});
// #endregion

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// #region agent log
fetch('http://127.0.0.1:7242/ingest/068831e1-39c2-46d3-afd8-7578e38ed77a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/supabase.ts:8',message:'Extracted env values',data:{urlValue:supabaseUrl,urlType:typeof supabaseUrl,keyValue:supabaseAnonKey?.substring(0,20),keyType:typeof supabaseAnonKey},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H5'})}).catch(()=>{});
// #endregion

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

