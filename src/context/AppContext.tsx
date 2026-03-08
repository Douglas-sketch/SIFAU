import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Profile, Denuncia, Relatorio, AutoInfracao, HistoricoAtividade, Mensagem, DenunciaStatus } from '../types';
import { mockProfiles, mockDenuncias, mockRelatorios, mockAutos, mockHistorico, mockMensagens } from '../mockData';
import * as supa from '../lib/supabaseService';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  timestamp: string;
}

interface AppState {
  profiles: Profile[];
  denuncias: Denuncia[];
  relatorios: Relatorio[];
  autos: AutoInfracao[];
  historico: HistoricoAtividade[];
  mensagens: Mensagem[];
  currentUser: Profile | null;
  notifications: Notification[];
  isOnline: boolean;
  login: (matricula: string, senha: string) => Promise<Profile | null>;
  logout: () => void;
  addDenuncia: (d: Omit<Denuncia, 'id' | 'protocolo' | 'created_at' | 'updated_at'>) => Denuncia;
  updateDenunciaStatus: (id: string, status: DenunciaStatus, extra?: Partial<Denuncia>) => void;
  designarDenuncia: (denunciaId: string, fiscalId: string, pontosProvisorio: number) => void;
  upsertRelatorio: (r: Omit<Relatorio, 'id' | 'created_at'>) => void;
  addAuto: (a: Omit<AutoInfracao, 'id' | 'created_at'>) => void;
  aprovarRelatorio: (denunciaId: string) => void;
  rejeitarRelatorio: (denunciaId: string, motivo: string) => void;
  getRelatorio: (denunciaId: string) => Relatorio | undefined;
  getAuto: (denunciaId: string) => AutoInfracao | undefined;
  addNotification: (msg: string, type: Notification['type']) => void;
  dismissNotification: (id: string) => void;
  getFiscalPontos: (fiscalId: string) => number;
  sendMensagem: (para_id: string, texto: string, denuncia_id?: string) => void;
  marcarLida: (msgId: string) => void;
  getConversas: (userId: string) => { peerId: string; peerName: string; lastMsg: Mensagem; unread: number }[];
  getMensagensConversa: (userId: string, peerId: string) => Mensagem[];
  authEmail: string;
  setAuthEmail: (email: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// HARDCODED CREDENTIALS — Funciona SEMPRE, independente de tudo
// ═══════════════════════════════════════════════════════════════
const CREDENTIALS: Record<string, { senha: string; profile: Profile }> = {};
mockProfiles.forEach(p => {
  if (p.matricula && p.senha) {
    CREDENTIALS[p.matricula.toUpperCase()] = { senha: p.senha, profile: p };
  }
});

// Device-specific storage: each device has its own data
function getDeviceId(): string {
  let id = localStorage.getItem('sifau_device_id');
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('sifau_device_id', id);
  }
  return id;
}

const DEVICE_ID = getDeviceId();

// Auth email for per-account storage — reads from the same key as App.tsx saves to
function getAuthEmail(): string {
  try {
    // Primary: Read from the dedicated email key (set by saveSession in App.tsx)
    const emailKey = localStorage.getItem('sifau_auth_email');
    if (emailKey) return emailKey.toLowerCase().replace(/[^a-z0-9@._-]/g, '');
    
    // Fallback: Read from session
    const session = localStorage.getItem('sifau_session_v3') || localStorage.getItem('sifau_session_v2');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed?.email) return parsed.email.toLowerCase().replace(/[^a-z0-9@._-]/g, '');
    }
  } catch { /* */ }
  return 'anonymous';
}

// Dynamic storage key — changes when email changes
function getStorageKey(email?: string): string {
  const e = email || getAuthEmail();
  return `sifau_data_v20_${e}_${DEVICE_ID}`;
}

function ensureAllProfiles(profiles: Profile[]): Profile[] {
  const result = [...profiles];
  mockProfiles.forEach(mock => {
    const idx = result.findIndex(p => p.id === mock.id);
    if (idx >= 0) {
      result[idx] = { ...result[idx], senha: mock.senha || result[idx].senha };
    } else {
      result.push({ ...mock });
    }
  });
  return result;
}

function resetAllStatusesToOffline(profiles: Profile[]): Profile[] {
  return profiles.map(p => ({ ...p, status_online: 'offline' as const }));
}

function loadFromStorage(email?: string) {
  const key = getStorageKey(email);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        profiles: resetAllStatusesToOffline(ensureAllProfiles(data.profiles || [])),
        denuncias: data.denuncias || [],
        relatorios: data.relatorios || [],
        autos: data.autos || [],
        historico: data.historico || [],
        mensagens: data.mensagens || [],
      };
    }
  } catch { /* ignore */ }
  return null;
}

function saveToStorage(data: {
  profiles: Profile[];
  denuncias: Denuncia[];
  relatorios: Relatorio[];
  autos: AutoInfracao[];
  historico: HistoricoAtividade[];
  mensagens: Mensagem[];
}, email?: string) {
  const key = getStorageKey(email);
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* */ }
}

const AppContext = createContext<AppState>({} as AppState);
export const useApp = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialEmail = getAuthEmail();
  const stored = loadFromStorage(initialEmail);
  const initialProfiles = resetAllStatusesToOffline(ensureAllProfiles(stored?.profiles || mockProfiles));
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [denuncias, setDenuncias] = useState<Denuncia[]>(stored?.denuncias?.length ? stored.denuncias : mockDenuncias);
  const [relatorios, setRelatorios] = useState<Relatorio[]>(stored?.relatorios || mockRelatorios);
  const [autos, setAutos] = useState<AutoInfracao[]>(stored?.autos || mockAutos);
  const [historico, setHistorico] = useState<HistoricoAtividade[]>(stored?.historico || mockHistorico);
  const [mensagens, setMensagens] = useState<Mensagem[]>(stored?.mensagens || mockMensagens);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [authEmail, setAuthEmailState] = useState(initialEmail);
  const channelsRef = useRef<ReturnType<typeof supa.subscribeToMensagens>[]>([]);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserRef = useRef<Profile | null>(null);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // ═══ AUTO-OFFLINE ═══
  useEffect(() => {
    const handleBeforeUnload = () => {
      const user = currentUserRef.current;
      if (user) {
        try {
          const key = getStorageKey();
          const raw = localStorage.getItem(key);
          if (raw) {
            const data = JSON.parse(raw);
            if (data.profiles) {
              data.profiles = data.profiles.map((p: Profile) =>
                p.id === user.id ? { ...p, status_online: 'offline' } : p
              );
              localStorage.setItem(key, JSON.stringify(data));
            }
          }
        } catch { /* */ }
        supa.logoutUser(user.id);
      }
    };

    const handleVisibilityChange = () => {
      const user = currentUserRef.current;
      if (!user) return;
      if (document.hidden) {
        setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, status_online: 'offline' as const } : p));
        supa.updateProfileStatus(user.id, 'offline');
      } else {
        setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, status_online: 'online' as const } : p));
        supa.updateProfileStatus(user.id, 'online');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ═══ SUPABASE CONNECTION CHECK ═══
  useEffect(() => {
    let cancelled = false;

    async function tryConnect() {
      console.log('🔄 Verificando conexão com Supabase...');
      const ok = await supa.checkConnection();
      if (cancelled) return;

      setIsOnline(ok);

      if (ok) {
        console.log('🟢 Supabase ONLINE — sincronizando dados...');
        try {
          const [profs, dens] = await Promise.all([
            supa.getAllProfiles(),
            supa.getAllDenuncias(),
          ]);

          if (!cancelled && profs.length) {
            setProfiles(prev => {
              const merged = ensureAllProfiles(prev).map(p => {
                const fromSupa = profs.find(sp => sp.id === p.id);
                if (fromSupa) {
                  return { ...p, ...fromSupa, senha: p.senha || fromSupa.senha, status_online: 'offline' as const };
                }
                return p;
              });
              return merged;
            });
          }
          if (!cancelled && dens.length) {
            setDenuncias(dens);
          }
        } catch (e) {
          console.warn('⚠️ Erro ao sincronizar:', e);
        }
      } else {
        console.log('🟡 Supabase OFFLINE — usando dados locais');
      }
    }

    tryConnect();
    return () => { cancelled = true; };
  }, []);

  // ═══ PERSIST ═══
  useEffect(() => {
    saveToStorage({ profiles, denuncias, relatorios, autos, historico, mensagens }, authEmail);
  }, [profiles, denuncias, relatorios, autos, historico, mensagens, authEmail]);

  // ═══ REALTIME SUBSCRIPTIONS ═══
  useEffect(() => {
    if (!isOnline || !currentUser) return;

    const msgChannel = supa.subscribeToMensagens(currentUser.id, (newMsg) => {
      setMensagens(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      addNotification(`Nova mensagem de ${newMsg.de_nome}`, 'info');
    });
    if (msgChannel) channelsRef.current.push(msgChannel);

    const denChannel = supa.subscribeToDenuncias((updated) => {
      setDenuncias(prev => prev.map(d => d.id === updated.id ? { ...d, ...updated } : d));
    });
    if (denChannel) channelsRef.current.push(denChannel);

    // Sync polling
    syncIntervalRef.current = setInterval(async () => {
      if (!currentUserRef.current) return;
      try {
        const [freshMsgs, freshDens, freshProfs, freshRels, freshAutos] = await Promise.all([
          supa.getMensagens(currentUserRef.current.id),
          supa.getAllDenuncias(),
          supa.getAllProfiles(),
          supa.getAllRelatorios(),
          supa.getAllAutos(),
        ]);
        if (freshMsgs.length) setMensagens(freshMsgs);
        if (freshDens.length) setDenuncias(freshDens);
        if (freshRels.length) setRelatorios(prev => {
          const merged = [...prev];
          freshRels.forEach(fr => {
            const idx = merged.findIndex(r => r.denuncia_id === fr.denuncia_id);
            if (idx >= 0) {
              // Preserve local fotos if Supabase returned empty
              const localFotos = merged[idx].fotos || [];
              const supaFotos = fr.fotos || [];
              merged[idx] = { ...merged[idx], ...fr, fotos: supaFotos.length > 0 ? supaFotos : localFotos };
            }
            else merged.push(fr);
          });
          return merged;
        });
        if (freshAutos.length) setAutos(prev => {
          const merged = [...prev];
          freshAutos.forEach(fa => {
            const idx = merged.findIndex(a => a.denuncia_id === fa.denuncia_id);
            if (idx >= 0) merged[idx] = { ...merged[idx], ...fa };
            else merged.push(fa);
          });
          return merged;
        });
        if (freshProfs.length) {
          setProfiles(prev => prev.map(p => {
            const fresh = freshProfs.find(fp => fp.id === p.id);
            if (fresh) {
              return {
                ...p, ...fresh,
                senha: p.senha || fresh.senha,
                status_online: p.id === currentUserRef.current?.id ? 'online' as const : fresh.status_online,
              };
            }
            return p;
          }));
        }
      } catch { /* ignore */ }
    }, 5000);

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      channelsRef.current.forEach(ch => supa.unsubscribe(ch));
      channelsRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isOnline]);

  // ═══ OFFLINE POLLING ═══
  useEffect(() => {
    if (isOnline) return;
    const interval = setInterval(() => {
      const fresh = loadFromStorage(authEmail);
      if (fresh) {
        setMensagens(prev => { const s = JSON.stringify(fresh.mensagens); return s !== JSON.stringify(prev) ? fresh.mensagens : prev; });
        setDenuncias(prev => { const s = JSON.stringify(fresh.denuncias); return s !== JSON.stringify(prev) ? fresh.denuncias : prev; });
        setRelatorios(prev => { const s = JSON.stringify(fresh.relatorios); return s !== JSON.stringify(prev) ? fresh.relatorios : prev; });
        setAutos(prev => { const s = JSON.stringify(fresh.autos); return s !== JSON.stringify(prev) ? fresh.autos : prev; });
        setHistorico(prev => { const s = JSON.stringify(fresh.historico); return s !== JSON.stringify(prev) ? fresh.historico : prev; });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const addNotification = useCallback((message: string, type: Notification['type']) => {
    const n: Notification = { id: `notif-${Date.now()}-${Math.random()}`, message, type, timestamp: new Date().toISOString() };
    setNotifications(prev => [n, ...prev]);
    setTimeout(() => setNotifications(prev => prev.filter(x => x.id !== n.id)), 5000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(x => x.id !== id));
  }, []);

  // ═══ LOGIN ═══
  const login = useCallback(async (matricula: string, senha: string): Promise<Profile | null> => {
    const mat = matricula.trim().toUpperCase();
    const pwd = senha.trim();
    console.log(`🔐 Login: "${mat}"`);

    // ALWAYS check hardcoded first
    const cred = CREDENTIALS[mat];
    if (cred && cred.senha === pwd) {
      console.log(`✅ Hardcoded match: ${cred.profile.nome}`);
      let user: Profile = { ...cred.profile, status_online: 'online' as const };

      // Try enriching from Supabase (non-blocking)
      if (isOnline) {
        try {
          const supaUser = await supa.loginUser(mat, pwd);
          if (supaUser) {
            user = { ...user, ...supaUser, senha: cred.senha, status_online: 'online' as const };
          }
          const [msgs, dens, hists, rels, auts] = await Promise.all([
            supa.getMensagens(user.id),
            supa.getAllDenuncias(),
            supa.getHistoricoByFiscal(user.id),
            supa.getAllRelatorios(),
            supa.getAllAutos(),
          ]);
          if (msgs.length) setMensagens(msgs);
          if (dens.length) setDenuncias(dens);
          if (hists.length) setHistorico(prev => {
            const other = prev.filter(h => h.fiscal_id !== user.id);
            return [...other, ...hists];
          });
          if (rels.length) setRelatorios(prev => {
            const merged = [...prev];
            rels.forEach(fr => {
              const idx = merged.findIndex(r => r.denuncia_id === fr.denuncia_id);
              if (idx >= 0) {
                const localFotos = merged[idx].fotos || [];
                const supaFotos = fr.fotos || [];
                merged[idx] = { ...merged[idx], ...fr, fotos: supaFotos.length > 0 ? supaFotos : localFotos };
              }
              else merged.push(fr);
            });
            return merged;
          });
          if (auts.length) setAutos(prev => {
            const merged = [...prev];
            auts.forEach(fa => {
              const idx = merged.findIndex(a => a.denuncia_id === fa.denuncia_id);
              if (idx >= 0) merged[idx] = { ...merged[idx], ...fa };
              else merged.push(fa);
            });
            return merged;
          });
        } catch (e) {
          console.log('⚠️ Supabase enrich failed:', e);
        }
      }

      setProfiles(prev => {
        const exists = prev.some(p => p.id === user.id);
        if (exists) return prev.map(p => p.id === user.id ? user : p);
        return [...prev, user];
      });
      setCurrentUser(user);
      return user;
    }

    // Try Supabase-only
    if (isOnline) {
      try {
        const supaUser = await supa.loginUser(mat, pwd);
        if (supaUser) {
          const user = { ...supaUser, status_online: 'online' as const };
          setProfiles(prev => {
            const exists = prev.some(p => p.id === user.id);
            if (exists) return prev.map(p => p.id === user.id ? user : p);
            return [...prev, user];
          });
          setCurrentUser(user);
          return user;
        }
      } catch (e) {
        console.error('❌ Supabase login error:', e);
      }
    }

    console.log(`❌ Login FAILED for "${mat}"`);
    return null;
  }, [isOnline]);

  const logout = useCallback(() => {
    if (currentUser) {
      setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, status_online: 'offline' as const } : p));
      supa.logoutUser(currentUser.id);
    }
    if (syncIntervalRef.current) { clearInterval(syncIntervalRef.current); syncIntervalRef.current = null; }
    channelsRef.current.forEach(ch => supa.unsubscribe(ch));
    channelsRef.current = [];
    setCurrentUser(null);
  }, [currentUser]);

  // ═══ DENÚNCIAS ═══
  const addDenuncia = useCallback((d: Omit<Denuncia, 'id' | 'protocolo' | 'created_at' | 'updated_at'>): Denuncia => {
    const num = denuncias.length + 1;
    const email = authEmail || getAuthEmail() || 'anonymous';
    const newD: Denuncia = {
      ...d, id: `den-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      protocolo: `2026-${String(num).padStart(5, '0')}`,
      auth_email: email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    console.log(`📝 Nova denúncia criada: ${newD.protocolo} | Email: ${email} | Tipo: ${newD.tipo}`);
    setDenuncias(prev => [newD, ...prev]);
    if (isOnline) {
      supa.createDenuncia(newD).then(result => {
        if (result) console.log(`✅ Denúncia salva no Supabase: ${newD.protocolo}`);
        else console.log(`⚠️ Denúncia NÃO salvou no Supabase: ${newD.protocolo}`);
      });
    } else {
      console.log(`💾 Denúncia salva localmente (offline): ${newD.protocolo}`);
    }
    return newD;
  }, [denuncias.length, isOnline, authEmail]);

  const updateDenunciaStatus = useCallback((id: string, status: DenunciaStatus, extra?: Partial<Denuncia>) => {
    setDenuncias(prev => prev.map(d => d.id === id ? { ...d, ...extra, status, updated_at: new Date().toISOString() } : d));
    if (isOnline) {
      const updates: Record<string, unknown> = { status };
      if (extra?.fiscal_id) updates.fiscal_id = extra.fiscal_id;
      if (extra?.gerente_id) updates.gerente_id = extra.gerente_id;
      if (extra?.pontos_provisorio !== undefined) updates.pontos_provisorio = extra.pontos_provisorio;
      if (extra?.motivo_rejeicao) updates.motivo_rejeicao = extra.motivo_rejeicao;
      supa.updateDenuncia(id, updates);
    }
  }, [isOnline]);

  const designarDenuncia = useCallback((denunciaId: string, fiscalId: string, pontosProvisorio: number) => {
    setDenuncias(prev => prev.map(d =>
      d.id === denunciaId
        ? { ...d, fiscal_id: fiscalId, gerente_id: currentUser?.id, status: 'designada' as DenunciaStatus, pontos_provisorio: pontosProvisorio, updated_at: new Date().toISOString() }
        : d
    ));
    if (isOnline) {
      supa.updateDenuncia(denunciaId, {
        fiscal_id: fiscalId, gerente_id: currentUser?.id,
        status: 'designada', pontos_provisorio: pontosProvisorio,
      });
    }

    // ═══ PONTOS CREDITADOS IMEDIATAMENTE NA DESIGNAÇÃO ═══
    if (pontosProvisorio > 0) {
      const histDesig: HistoricoAtividade = {
        id: `hist-${Date.now()}-desig`, fiscal_id: fiscalId, denuncia_id: denunciaId,
        tipo_acao: 'Designação O.S.', pontos: pontosProvisorio,
        descricao: `Pontos da tabela O.S. creditados na designação`,
        created_at: new Date().toISOString(),
      };
      setHistorico(prev => [...prev, histDesig]);
      if (isOnline) supa.createHistorico(histDesig);

      setProfiles(prev => prev.map(p => {
        if (p.id === fiscalId) {
          const updated = { ...p, pontos_total: p.pontos_total + pontosProvisorio };
          if (isOnline) supa.updateProfilePontos(p.id, updated.pontos_total);
          return updated;
        }
        return p;
      }));
    }

    const fiscal = profiles.find(p => p.id === fiscalId);
    if (fiscal && currentUser) {
      const den = denuncias.find(d => d.id === denunciaId);
      const texto = `📋 Nova tarefa designada!\n\nTipo: ${den?.tipo || 'N/A'}\nEndereço: ${den?.endereco || 'N/A'}\nProtocolo: ${den?.protocolo || 'N/A'}\nPontos creditados: ${pontosProvisorio} ✅`;
      const msg: Mensagem = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        de_id: currentUser.id, para_id: fiscalId,
        de_nome: currentUser.nome, para_nome: fiscal.nome,
        texto, lida: false, created_at: new Date().toISOString(), denuncia_id: denunciaId,
      };
      setMensagens(prev => [...prev, msg]);
      if (isOnline) {
        supa.enviarMensagem({ de_id: msg.de_id, para_id: msg.para_id, de_nome: msg.de_nome, para_nome: msg.para_nome, texto: msg.texto, denuncia_id: msg.denuncia_id });
      }
    }

    addNotification(`Designada para ${fiscal?.nome || 'fiscal'} com ${pontosProvisorio} pts creditados!`, 'success');
  }, [currentUser, isOnline, addNotification, profiles, denuncias]);

  // ═══ RELATÓRIOS ═══
  const upsertRelatorioFn = useCallback((r: Omit<Relatorio, 'id' | 'created_at'>) => {
    setRelatorios(prev => {
      const exists = prev.find(x => x.denuncia_id === r.denuncia_id);
      if (exists) {
        const updated = { ...exists, ...r };
        if (isOnline) supa.upsertRelatorio(updated);
        return prev.map(x => x.denuncia_id === r.denuncia_id ? updated : x);
      }
      const newR = { ...r, id: `rel-${Date.now()}`, created_at: new Date().toISOString() };
      if (isOnline) supa.upsertRelatorio(newR);
      return [...prev, newR];
    });
  }, [isOnline]);

  // ═══ AUTOS ═══
  const addAuto = useCallback((a: Omit<AutoInfracao, 'id' | 'created_at'>) => {
    const newA: AutoInfracao = { ...a, id: `auto-${Date.now()}`, created_at: new Date().toISOString() };
    setAutos(prev => {
      const existing = prev.find(x => x.denuncia_id === a.denuncia_id);
      if (existing) return prev.map(x => x.denuncia_id === a.denuncia_id ? newA : x);
      return [...prev, newA];
    });
    if (isOnline) supa.createAuto(newA);

    let pontosMulta = 10;
    const newHist: HistoricoAtividade[] = [{
      id: `hist-${Date.now()}-multa`, fiscal_id: a.fiscal_id, denuncia_id: a.denuncia_id,
      tipo_acao: 'Multa Emitida', pontos: 10,
      descricao: `Auto de infração: R$ ${a.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      created_at: new Date().toISOString(),
    }];

    if (a.embargo) {
      pontosMulta += 10;
      newHist.push({
        id: `hist-${Date.now()}-embargo`, fiscal_id: a.fiscal_id, denuncia_id: a.denuncia_id,
        tipo_acao: 'Embargo', pontos: 10, descricao: 'Pontos por embargo aplicado',
        created_at: new Date().toISOString(),
      });
    }

    setHistorico(prev => [...prev, ...newHist]);
    if (isOnline) newHist.forEach(h => supa.createHistorico(h));

    setProfiles(prev => prev.map(p => {
      if (p.id === a.fiscal_id) {
        const updated = { ...p, pontos_total: p.pontos_total + pontosMulta };
        if (isOnline) supa.updateProfilePontos(p.id, updated.pontos_total);
        return updated;
      }
      return p;
    }));

    addNotification(`Multa registrada! +10 pts${a.embargo ? ' + Embargo +10 pts' : ''}`, 'success');
  }, [isOnline, addNotification]);

  // ═══ APROVAÇÃO ═══
  // Pontos base (O.S.) já foram creditados na designação.
  // Aqui só credita bônus de O.S. 2.0 e 4.0 (se marcados pelo fiscal no relatório).
  const aprovarRelatorio = useCallback((denunciaId: string) => {
    const den = denuncias.find(d => d.id === denunciaId);
    const rel = relatorios.find(r => r.denuncia_id === denunciaId);
    if (!den || !den.fiscal_id) return;

    let bonusPontos = 0;
    const newHist: HistoricoAtividade[] = [{
      id: `hist-${Date.now()}-aprov`, fiscal_id: den.fiscal_id, denuncia_id: denunciaId,
      tipo_acao: 'Aprovação', pontos: 0,
      descricao: `Relatório aprovado. Pontos base (${den.pontos_provisorio} pts) já creditados na designação.`,
      created_at: new Date().toISOString(),
    }];

    if (rel?.os_2_0) {
      bonusPontos += 50;
      newHist.push({
        id: `hist-${Date.now()}-os2`, fiscal_id: den.fiscal_id, denuncia_id: denunciaId,
        tipo_acao: 'Bônus O.S. 2.0', pontos: 50, descricao: 'Bônus por O.S. cumprida',
        created_at: new Date().toISOString(),
      });
    }
    if (rel?.os_4_0) {
      bonusPontos += 50;
      newHist.push({
        id: `hist-${Date.now()}-os4`, fiscal_id: den.fiscal_id, denuncia_id: denunciaId,
        tipo_acao: 'Bônus O.S. 4.0', pontos: 50, descricao: 'Bônus por notificação emitida',
        created_at: new Date().toISOString(),
      });
    }

    setHistorico(prev => [...prev, ...newHist]);
    if (isOnline) newHist.forEach(h => supa.createHistorico(h));

    if (bonusPontos > 0) {
      setProfiles(prev => prev.map(p => {
        if (p.id === den.fiscal_id) {
          const updated = { ...p, pontos_total: p.pontos_total + bonusPontos };
          if (isOnline) supa.updateProfilePontos(p.id, updated.pontos_total);
          return updated;
        }
        return p;
      }));
    }

    setDenuncias(prev => prev.map(d =>
      d.id === denunciaId ? { ...d, status: 'concluida' as DenunciaStatus, updated_at: new Date().toISOString() } : d
    ));
    if (isOnline) supa.updateDenuncia(denunciaId, { status: 'concluida' });

    const totalMsg = bonusPontos > 0 ? `+ ${bonusPontos} pts bônus!` : '(sem bônus adicional)';
    addNotification(`Relatório aprovado! ${totalMsg}`, 'success');
  }, [denuncias, relatorios, isOnline, addNotification]);

  // ═══ REJEIÇÃO ═══
  const rejeitarRelatorio = useCallback((denunciaId: string, motivo: string) => {
    const den = denuncias.find(d => d.id === denunciaId);
    if (!den || !den.fiscal_id) return;

    setDenuncias(prev => prev.map(d =>
      d.id === denunciaId
        ? { ...d, status: 'devolvida' as DenunciaStatus, motivo_rejeicao: motivo, updated_at: new Date().toISOString() }
        : d
    ));
    if (isOnline) supa.updateDenuncia(denunciaId, { status: 'devolvida', motivo_rejeicao: motivo });

    const newHist: HistoricoAtividade = {
      id: `hist-${Date.now()}-rej`, fiscal_id: den.fiscal_id, denuncia_id: denunciaId,
      tipo_acao: 'Relatório Devolvido', pontos: 0, descricao: `Motivo: ${motivo}`,
      created_at: new Date().toISOString(),
    };
    setHistorico(prev => [...prev, newHist]);
    if (isOnline) supa.createHistorico(newHist);

    addNotification(`Relatório devolvido. Motivo: ${motivo.substring(0, 50)}...`, 'warning');
  }, [denuncias, isOnline, addNotification]);

  const getRelatorio = useCallback((denunciaId: string) => relatorios.find(r => r.denuncia_id === denunciaId), [relatorios]);
  const getAuto = useCallback((denunciaId: string) => autos.find(a => a.denuncia_id === denunciaId), [autos]);
  const getFiscalPontos = useCallback((fiscalId: string) => profiles.find(p => p.id === fiscalId)?.pontos_total ?? 0, [profiles]);

  // ═══ MESSAGING ═══
  const sendMensagem = useCallback((para_id: string, texto: string, denuncia_id?: string) => {
    if (!currentUser || !texto.trim()) return;
    const paraPeer = profiles.find(p => p.id === para_id);
    const msg: Mensagem = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      de_id: currentUser.id, para_id,
      de_nome: currentUser.nome, para_nome: paraPeer?.nome || 'Desconhecido',
      texto: texto.trim(), lida: false,
      created_at: new Date().toISOString(), denuncia_id,
    };
    setMensagens(prev => [...prev, msg]);
    if (isOnline) {
      supa.enviarMensagem({ de_id: msg.de_id, para_id: msg.para_id, de_nome: msg.de_nome, para_nome: msg.para_nome, texto: msg.texto, denuncia_id: msg.denuncia_id });
    }
  }, [currentUser, profiles, isOnline]);

  const marcarLida = useCallback((msgId: string) => {
    setMensagens(prev => prev.map(m => m.id === msgId ? { ...m, lida: true } : m));
  }, []);

  const getConversas = useCallback((userId: string) => {
    const userMsgs = mensagens.filter(m => m.de_id === userId || m.para_id === userId);
    const peerMap = new Map<string, Mensagem[]>();
    userMsgs.forEach(m => {
      const peerId = m.de_id === userId ? m.para_id : m.de_id;
      if (!peerMap.has(peerId)) peerMap.set(peerId, []);
      peerMap.get(peerId)!.push(m);
    });
    const result: { peerId: string; peerName: string; lastMsg: Mensagem; unread: number }[] = [];
    peerMap.forEach((msgs, peerId) => {
      const peer = profiles.find(p => p.id === peerId);
      const sorted = msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const unread = msgs.filter(m => m.para_id === userId && !m.lida).length;
      result.push({ peerId, peerName: peer?.nome || 'Desconhecido', lastMsg: sorted[0], unread });
    });
    return result.sort((a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime());
  }, [mensagens, profiles]);

  const getMensagensConversa = useCallback((userId: string, peerId: string) => {
    return mensagens
      .filter(m => (m.de_id === userId && m.para_id === peerId) || (m.de_id === peerId && m.para_id === userId))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [mensagens]);

  const setAuthEmail = useCallback((email: string) => {
    const clean = email.toLowerCase().replace(/[^a-z0-9@._-]/g, '') || 'anonymous';
    const oldEmail = authEmail;
    setAuthEmailState(clean);
    
    // CRITICAL: Save to localStorage so getAuthEmail() can find it on next load
    localStorage.setItem('sifau_auth_email', clean);
    
    // If email changed, load that email's data
    if (clean !== oldEmail && clean !== 'anonymous') {
      console.log(`📧 Email mudou: ${oldEmail} → ${clean}. Carregando dados...`);
      const emailData = loadFromStorage(clean);
      if (emailData) {
        setProfiles(emailData.profiles);
        setDenuncias(emailData.denuncias);
        setRelatorios(emailData.relatorios);
        setAutos(emailData.autos);
        setHistorico(emailData.historico);
        setMensagens(emailData.mensagens);
      } else {
        // New email — start fresh (keep profiles, clear everything else)
        console.log(`🆕 Novo email: ${clean}. Iniciando dados limpos.`);
        setDenuncias([]);
        setRelatorios([]);
        setAutos([]);
        setHistorico([]);
        setMensagens([]);
      }
    }
    
    // Register in Supabase user_accounts
    if (isOnline) {
      supa.registerUserAccount(clean, 'email');
    }
  }, [isOnline, authEmail]);

  return (
    <AppContext.Provider value={{
      profiles, denuncias, relatorios, autos, historico, mensagens, currentUser, notifications, isOnline,
      login, logout, addDenuncia, updateDenunciaStatus, designarDenuncia,
      upsertRelatorio: upsertRelatorioFn, addAuto, aprovarRelatorio, rejeitarRelatorio, getRelatorio, getAuto,
      addNotification, dismissNotification, getFiscalPontos,
      sendMensagem, marcarLida, getConversas, getMensagensConversa,
      authEmail, setAuthEmail,
    }}>
      {children}
    </AppContext.Provider>
  );
};
