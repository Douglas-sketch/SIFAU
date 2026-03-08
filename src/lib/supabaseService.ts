import { supabase, addLog } from './supabase';
import { Profile, Denuncia, Relatorio, AutoInfracao, HistoricoAtividade, Mensagem } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

/* eslint-disable @typescript-eslint/no-explicit-any */

let supabaseReady = false;

// ============================================
// HEALTH CHECK
// ============================================
export async function checkConnection(): Promise<boolean> {
  if (!supabase) {
    addLog('❌ Cliente Supabase não existe');
    return false;
  }

  try {
    addLog('🔍 Testando conexão...');
    
    // Step 1: Simple fetch test to see if the URL is reachable
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome')
      .limit(1);

    if (error) {
      addLog(`❌ Erro: ${error.message}`);
      if (error.code === '42P01' || error.message.includes('relation')) {
        addLog('⚠️ TABELAS NÃO EXISTEM! Execute o SQL no Supabase.');
      }
      if (error.message.includes('FetchError') || error.message.includes('fetch')) {
        addLog('⚠️ Servidor não acessível. Verifique a URL.');
      }
      if (error.message.includes('JWT') || error.message.includes('apikey')) {
        addLog('⚠️ Chave API inválida.');
      }
      supabaseReady = false;
      return false;
    }

    if (!data || data.length === 0) {
      addLog('⚠️ Conexão OK mas tabela profiles está VAZIA');
      addLog('⚠️ Execute o SQL com os INSERTs dos usuários');
      supabaseReady = false;
      return false;
    }

    addLog(`✅ Supabase OK! ${data.length} profile(s) encontrado(s): ${data[0]?.nome}`);
    supabaseReady = true;
    return true;
  } catch (e: any) {
    addLog(`❌ Exceção: ${e?.message || String(e)}`);
    supabaseReady = false;
    return false;
  }
}

function ok() {
  return supabase && supabaseReady;
}

// ============================================
// PROFILES
// ============================================
export async function loginUser(matricula: string, senha: string): Promise<Profile | null> {
  if (!ok()) return null;
  try {
    const { data, error } = await supabase!
      .from('profiles')
      .select('*')
      .ilike('matricula', matricula)
      .eq('senha', senha)
      .single();

    if (error || !data) {
      addLog(`⚠️ Login Supabase falhou: ${matricula}`);
      return null;
    }

    await supabase!.from('profiles').update({ status: 'online' }).eq('id', data.id);
    addLog(`✅ Login Supabase OK: ${data.nome}`);
    return mapProfile(data);
  } catch (e: any) {
    addLog(`❌ Erro login: ${e?.message}`);
    return null;
  }
}

export async function logoutUser(userId: string): Promise<void> {
  if (!ok()) return;
  try {
    await supabase!.from('profiles').update({ status: 'offline' }).eq('id', userId);
  } catch { /* */ }
}

export async function getAllProfiles(): Promise<Profile[]> {
  if (!ok()) return [];
  try {
    const { data } = await supabase!.from('profiles').select('*').order('nome');
    return (data || []).map(mapProfile);
  } catch { return []; }
}

export async function updateProfileStatus(userId: string, status: string): Promise<void> {
  if (!ok()) return;
  try {
    await supabase!.from('profiles').update({ status }).eq('id', userId);
  } catch { /* */ }
}

export async function updateProfilePontos(userId: string, pontos: number): Promise<void> {
  if (!ok()) return;
  try {
    await supabase!.from('profiles').update({ pontos }).eq('id', userId);
  } catch { /* */ }
}

// ============================================
// DENÚNCIAS
// ============================================
export async function getAllDenuncias(): Promise<Denuncia[]> {
  if (!ok()) return [];
  try {
    const { data } = await supabase!
      .from('denuncias')
      .select('*')
      .order('created_at', { ascending: false });
    return (data || []).map(mapDenuncia);
  } catch { return []; }
}

export async function createDenuncia(d: Denuncia): Promise<Denuncia | null> {
  if (!ok()) return null;
  try {
    const insertData: Record<string, any> = {
      id: d.id,
      protocolo: d.protocolo,
      tipo: d.tipo,
      descricao: d.descricao || '',
      endereco: d.endereco || '',
      latitude: d.lat || 0,
      longitude: d.lng || 0,
      status: d.status || 'pendente',
      denunciante_nome: d.denunciante_nome || null,
      denunciante_anonimo: d.denunciante_anonimo || false,
      sla_horas: (d.sla_dias || 3) * 24,
      pontos_provisorio: d.pontos_provisorio || 0,
      auth_email: d.auth_email || null,
    };
    addLog(`📝 Criando denúncia: ${d.protocolo} (email: ${d.auth_email || 'N/A'})`);
    const { data, error } = await supabase!.from('denuncias').insert(insertData).select().single();
    if (error) { addLog(`❌ Erro criar denúncia: ${error.message} | Code: ${error.code}`); return null; }
    addLog(`✅ Denúncia criada no Supabase: ${d.protocolo}`);
    return data ? mapDenuncia(data) : null;
  } catch (e: any) { addLog(`❌ Exceção criar denúncia: ${e?.message}`); return null; }
}

export async function updateDenuncia(id: string, updates: Partial<Record<string, any>>): Promise<void> {
  if (!ok()) return;
  try {
    const { error } = await supabase!.from('denuncias').update(updates).eq('id', id);
    if (error) addLog(`❌ Erro update denúncia: ${error.message}`);
  } catch { /* */ }
}

// ============================================
// RELATÓRIOS
// ============================================
export async function getAllRelatorios(): Promise<Relatorio[]> {
  if (!ok()) return [];
  try {
    const { data } = await supabase!
      .from('relatorios')
      .select('*')
      .order('created_at', { ascending: false });
    return (data || []).map(mapRelatorio);
  } catch { return []; }
}

export async function getRelatorio(denunciaId: string): Promise<Relatorio | null> {
  if (!ok()) return null;
  try {
    const { data } = await supabase!
      .from('relatorios')
      .select('*')
      .eq('denuncia_id', denunciaId)
      .maybeSingle();
    return data ? mapRelatorio(data) : null;
  } catch { return null; }
}

export async function upsertRelatorio(r: Relatorio): Promise<void> {
  if (!ok()) return;
  try {
    await supabase!.from('relatorios').upsert({
      id: r.id,
      denuncia_id: r.denuncia_id,
      fiscal_id: r.fiscal_id,
      texto: r.texto,
      assinatura_base64: r.assinatura_base64,
      dados_extras: { os_2_0: r.os_2_0, os_4_0: r.os_4_0, fotos: r.fotos || [] },
      created_at: r.created_at,
    });
  } catch { /* */ }
}

// ============================================
// AUTOS DE INFRAÇÃO
// ============================================
export async function getAllAutos(): Promise<AutoInfracao[]> {
  if (!ok()) return [];
  try {
    const { data } = await supabase!
      .from('autos_infracao')
      .select('*')
      .order('created_at', { ascending: false });
    return (data || []).map(mapAuto);
  } catch { return []; }
}

export async function getAutosByDenuncia(denunciaId: string): Promise<AutoInfracao[]> {
  if (!ok()) return [];
  try {
    const { data } = await supabase!
      .from('autos_infracao')
      .select('*')
      .eq('denuncia_id', denunciaId);
    return (data || []).map(mapAuto);
  } catch { return []; }
}

export async function createAuto(a: AutoInfracao): Promise<void> {
  if (!ok()) return;
  try {
    await supabase!.from('autos_infracao').insert({
      id: a.id,
      denuncia_id: a.denuncia_id,
      fiscal_id: a.fiscal_id,
      tipo: a.tipo,
      valor: a.valor,
      embargo: a.embargo,
      created_at: a.created_at,
    });
  } catch { /* */ }
}

// ============================================
// HISTÓRICO
// ============================================
export async function getHistoricoByFiscal(fiscalId: string): Promise<HistoricoAtividade[]> {
  if (!ok()) return [];
  try {
    const { data } = await supabase!
      .from('historico_atividades')
      .select('*')
      .eq('fiscal_id', fiscalId)
      .order('created_at', { ascending: false });
    return (data || []).map(mapHistorico);
  } catch { return []; }
}

export async function createHistorico(h: HistoricoAtividade): Promise<void> {
  if (!ok()) return;
  try {
    await supabase!.from('historico_atividades').insert({
      id: h.id,
      fiscal_id: h.fiscal_id,
      denuncia_id: h.denuncia_id,
      tipo: h.tipo_acao,
      descricao: h.descricao,
      pontos: h.pontos,
      created_at: h.created_at,
    });
  } catch { /* */ }
}

// ============================================
// FOTOS
// ============================================
export async function getFotosByDenuncia(denunciaId: string): Promise<string[]> {
  if (!ok()) return [];
  try {
    const { data } = await supabase!
      .from('fotos')
      .select('base64')
      .eq('denuncia_id', denunciaId)
      .order('created_at');
    return (data || []).map((f: any) => f.base64);
  } catch { return []; }
}

export async function createFoto(denunciaId: string, base64: string, tipo: string = 'denuncia'): Promise<void> {
  if (!ok()) return;
  try {
    await supabase!.from('fotos').insert({
      id: `foto-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      denuncia_id: denunciaId,
      base64,
      tipo,
    });
  } catch { /* */ }
}

// ============================================
// MENSAGENS
// ============================================
export async function getMensagens(userId: string): Promise<Mensagem[]> {
  if (!ok()) return [];
  try {
    const { data } = await supabase!
      .from('mensagens')
      .select('*')
      .or(`de_id.eq.${userId},para_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    return (data || []).map(mapMensagem);
  } catch { return []; }
}

export async function enviarMensagem(msg: {
  de_id: string;
  para_id: string;
  de_nome: string;
  para_nome: string;
  texto: string;
  denuncia_id?: string;
}): Promise<Mensagem | null> {
  if (!ok()) return null;
  try {
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { data, error } = await supabase!.from('mensagens').insert({
      id,
      de_id: msg.de_id,
      para_id: msg.para_id,
      de_nome: msg.de_nome,
      para_nome: msg.para_nome,
      texto: msg.texto,
      denuncia_id: msg.denuncia_id || null,
      lida: false,
    }).select().single();
    if (error) { addLog(`❌ Erro enviar msg: ${error.message}`); return null; }
    return data ? mapMensagem(data) : null;
  } catch (e: any) { addLog(`❌ Erro enviar msg: ${e?.message}`); return null; }
}

export async function marcarMensagensComoLidas(userId: string, deId: string): Promise<void> {
  if (!ok()) return;
  try {
    await supabase!
      .from('mensagens')
      .update({ lida: true })
      .eq('para_id', userId)
      .eq('de_id', deId);
  } catch { /* */ }
}

// ============================================
// REALTIME
// ============================================
export function subscribeToMensagens(
  userId: string,
  onNewMessage: (msg: Mensagem) => void
): RealtimeChannel | null {
  if (!ok()) return null;
  try {
    return supabase!
      .channel(`msgs-${userId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: `para_id=eq.${userId}`,
      }, (payload) => { onNewMessage(mapMensagem(payload.new)); })
      .subscribe();
  } catch { return null; }
}

export function subscribeToDenuncias(
  onUpdate: (d: Denuncia) => void
): RealtimeChannel | null {
  if (!ok()) return null;
  try {
    return supabase!
      .channel(`den-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'denuncias',
      }, (payload) => {
        if (payload.new) onUpdate(mapDenuncia(payload.new as any));
      })
      .subscribe();
  } catch { return null; }
}

export function unsubscribe(channel: RealtimeChannel | null): void {
  if (channel && supabase) {
    try { supabase.removeChannel(channel); } catch { /* */ }
  }
}

// ============================================
// USER ACCOUNTS (per-email registration)
// ============================================
export async function deleteUserAccount(email: string): Promise<boolean> {
  if (!ok() || !email || email === 'anonymous') return false;
  try {
    // Mark as scheduled for deletion (30 day recovery)
    const { error } = await supabase!.from('user_accounts').update({
      scheduled_deletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('email', email);
    if (error) {
      addLog(`❌ Erro agendar exclusão: ${error.message}`);
      return false;
    }
    // Delete denuncias by this email
    await supabase!.from('denuncias').delete().eq('auth_email', email);
    addLog(`✅ Conta ${email} agendada para exclusão em 30 dias`);
    return true;
  } catch (e: any) {
    addLog(`❌ Exceção exclusão: ${e?.message}`);
    return false;
  }
}

export async function registerUserAccount(email: string, provider: string = 'email'): Promise<void> {
  // NÃO depende de ok() — tenta SEMPRE salvar no Supabase diretamente
  if (!supabase || !email || email === 'anonymous') {
    addLog(`⚠️ registerUserAccount: sem supabase ou email inválido (${email})`);
    return;
  }
  try {
    addLog(`📧 Registrando conta no Supabase: ${email}...`);
    
    // Tentar upsert direto
    const { error } = await supabase
      .from('user_accounts')
      .upsert({
        id: `ua-${email.replace(/[^a-z0-9]/gi, '-')}`,
        email: email.toLowerCase(),
        provider,
        ultimo_acesso: new Date().toISOString(),
        dispositivo: navigator.userAgent.substring(0, 100),
      }, { onConflict: 'email' });

    if (error) {
      addLog(`⚠️ Upsert falhou: ${error.message}, tentando insert...`);
      // Fallback: tentar insert simples
      const { error: insertError } = await supabase
        .from('user_accounts')
        .insert({
          id: `ua-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          email: email.toLowerCase(),
          provider,
          dispositivo: navigator.userAgent.substring(0, 100),
        });
      if (insertError) {
        // Pode ser duplicata - tentar update
        if (insertError.message.includes('duplicate') || insertError.code === '23505') {
          await supabase
            .from('user_accounts')
            .update({ 
              ultimo_acesso: new Date().toISOString(),
              dispositivo: navigator.userAgent.substring(0, 100),
            })
            .eq('email', email.toLowerCase());
          addLog(`✅ Conta atualizada: ${email}`);
        } else {
          addLog(`❌ Erro insert conta: ${insertError.message}`);
        }
      } else {
        addLog(`✅ Conta inserida: ${email}`);
      }
    } else {
      addLog(`✅ Conta registrada (upsert): ${email}`);
    }
  } catch (e: any) {
    addLog(`❌ Exceção registrar conta: ${e?.message}`);
  }
}

// ============================================
// MAPPERS
// ============================================
function mapProfile(r: any): Profile {
  return {
    id: r.id,
    nome: r.nome,
    tipo: r.tipo,
    matricula: r.matricula,
    senha: r.senha,
    status_online: r.status || 'offline',
    pontos_total: r.pontos || 0,
    lat: r.latitude,
    lng: r.longitude,
  };
}

function mapDenuncia(r: any): Denuncia {
  return {
    id: r.id,
    protocolo: r.protocolo,
    tipo: r.tipo,
    endereco: r.endereco || '',
    lat: r.latitude || 0,
    lng: r.longitude || 0,
    descricao: r.descricao || '',
    status: r.status || 'pendente',
    sla_dias: r.sla_horas ? Math.ceil(r.sla_horas / 24) : 3,
    fiscal_id: r.fiscal_id || undefined,
    gerente_id: r.gerente_id || undefined,
    denunciante_nome: r.denunciante_nome,
    denunciante_anonimo: r.denunciante_anonimo || false,
    created_at: r.created_at,
    updated_at: r.updated_at || r.created_at,
    pontos_provisorio: r.pontos_provisorio || 0,
    fotos: [],
    motivo_rejeicao: r.motivo_rejeicao,
    auth_email: r.auth_email || '',
  };
}

function mapRelatorio(r: any): Relatorio {
  const extras = r.dados_extras || {};
  return {
    id: r.id,
    denuncia_id: r.denuncia_id,
    fiscal_id: r.fiscal_id,
    texto: r.texto,
    assinatura_base64: r.assinatura_base64,
    fotos: extras.fotos || [],
    os_2_0: extras.os_2_0 || false,
    os_4_0: extras.os_4_0 || false,
    created_at: r.created_at,
  };
}

function mapAuto(r: any): AutoInfracao {
  return {
    id: r.id,
    denuncia_id: r.denuncia_id,
    fiscal_id: r.fiscal_id,
    valor: Number(r.valor),
    tipo: r.tipo,
    embargo: r.embargo,
    created_at: r.created_at,
  };
}

function mapHistorico(r: any): HistoricoAtividade {
  return {
    id: r.id,
    fiscal_id: r.fiscal_id,
    denuncia_id: r.denuncia_id || '',
    tipo_acao: r.tipo,
    descricao: r.descricao,
    pontos: r.pontos || 0,
    created_at: r.created_at,
  };
}

function mapMensagem(r: any): Mensagem {
  return {
    id: r.id,
    de_id: r.de_id,
    para_id: r.para_id,
    de_nome: r.de_nome || '',
    para_nome: r.para_nome || '',
    texto: r.texto,
    lida: r.lida,
    created_at: r.created_at,
    denuncia_id: r.denuncia_id,
  };
}
