import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Credenciais do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://cyuokqtbwydfymfffaqw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dW9rcXRid3lkZnltZmZmYXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjMyODAsImV4cCI6MjA4Nzg5OTI4MH0.tJx9Zi0CfDfkRTEhSpYpeSCKxg0LNUodrckiC5_F7z0';

let supabase: SupabaseClient | null = null;
export const diagnosticLog: string[] = [];

function addLog(msg: string) {
  const time = new Date().toLocaleTimeString('pt-BR');
  diagnosticLog.push(`[${time}] ${msg}`);
  console.log(msg);
  if (diagnosticLog.length > 20) diagnosticLog.shift();
}

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'sifau_auth',
      },
      realtime: {
        params: { eventsPerSecond: 10 }
      },
    });
    addLog('✅ Cliente Supabase criado');
  } catch (e: any) {
    addLog(`❌ Erro ao criar cliente: ${e?.message || e}`);
    supabase = null;
  }
} else {
  addLog('⚠️ Supabase não configurado — modo offline');
}

export { supabase, addLog };
