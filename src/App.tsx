import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import CidadaoModule from './components/Cidadao';
import FiscalModule from './components/Fiscal';
import GerenteModule from './components/Gerente';
import Settings, { AppTheme, applyTheme, applyAccessibility, loadSettings } from './components/Settings';
import { Lock, ArrowLeft, AlertCircle, ChevronDown, Eye, EyeOff, Mail, Users, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import * as supa from './lib/supabaseService';
import { getProfilePhoto } from './lib/profilePhoto';
import Logo from './components/Logo';

const THEME_GRADIENTS: Record<AppTheme, string> = {
  default: 'from-blue-800 via-blue-900 to-slate-900',
  dark: 'from-gray-800 via-gray-900 to-black',
};

// ═══════════════════════════════════════════════════════════════
//  SISTEMA DE CONTAS — 100% Local-first + Supabase backup
// ═══════════════════════════════════════════════════════════════
const ACCOUNTS_DB = 'sifau_accounts_v3';
const AUTH_SESSION = 'sifau_session_v3';
const AUTH_EMAIL_KEY = 'sifau_auth_email';

// Migrar contas da v2 para v3 (para não perder contas já criadas)
function migrateAccounts() {
  try {
    const v2 = localStorage.getItem('sifau_accounts_v2');
    const v3 = localStorage.getItem(ACCOUNTS_DB);
    if (v2 && !v3) {
      localStorage.setItem(ACCOUNTS_DB, v2);
      console.log('📦 Contas migradas v2→v3');
    }
    const s2 = localStorage.getItem('sifau_session_v2');
    const s3 = localStorage.getItem(AUTH_SESSION);
    if (s2 && !s3) {
      localStorage.setItem(AUTH_SESSION, s2);
      console.log('📦 Sessão migrada v2→v3');
    }
  } catch { /* */ }
}
migrateAccounts();

function loadAccounts(): Record<string, { email: string; password: string; createdAt: string }> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_DB) || '{}');
  } catch { return {}; }
}

function saveAccount(email: string, password: string) {
  const db = loadAccounts();
  db[email.toLowerCase().trim()] = { 
    email: email.toLowerCase().trim(), 
    password, 
    createdAt: new Date().toISOString() 
  };
  localStorage.setItem(ACCOUNTS_DB, JSON.stringify(db));
  console.log('💾 Conta salva localmente:', email);
}

function checkAccount(email: string, password: string): 'ok' | 'wrong_password' | 'not_found' {
  const db = loadAccounts();
  const acc = db[email.toLowerCase().trim()];
  if (!acc) return 'not_found';
  if (acc.password !== password) return 'wrong_password';
  return 'ok';
}

function saveSession(email: string) {
  localStorage.setItem(AUTH_SESSION, JSON.stringify({ email, ts: Date.now() }));
  // CRITICAL: Also save to AUTH_EMAIL_KEY so AppContext can read it
  localStorage.setItem(AUTH_EMAIL_KEY, email.toLowerCase().trim());
}

function getSession(): string | null {
  try {
    const s = JSON.parse(localStorage.getItem(AUTH_SESSION) || 'null');
    return s?.email || null;
  } catch { return null; }
}

function clearSession() {
  localStorage.removeItem(AUTH_SESSION);
  // DON'T remove AUTH_EMAIL_KEY — keep it for storage key
  // DON'T remove ACCOUNTS_DB — keep saved accounts
}

function AuthScreen({ onAuthenticated, theme }: { onAuthenticated: (email?: string) => void; theme: AppTheme }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const finishAuth = (userEmail: string, provider: string = 'email') => {
    const cleanEmail = userEmail.toLowerCase().trim();
    saveSession(cleanEmail);
    supa.registerUserAccount(cleanEmail, provider).catch(() => {});
    console.log('✅ Auth completo:', cleanEmail);
    onAuthenticated(cleanEmail);
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    setError('');
    setLoading(true);
    const e = email.trim().toLowerCase();
    const p = password.trim();

    try {
      // Verificar conta local (sempre funciona)
      const result = checkAccount(e, p);
      
      if (result === 'ok') {
        // Conta existe e senha correta — entrar!
        finishAuth(e);
        return;
      }
      
      if (result === 'wrong_password') {
        setError('Senha incorreta. Tente novamente.');
        return;
      }
      
      // Conta não encontrada localmente — tentar Supabase Auth
      if (supabase) {
        try {
          const { error: authError } = await supabase.auth.signInWithPassword({ email: e, password: p });
          if (!authError) {
            saveAccount(e, p);
            finishAuth(e);
            return;
          }
        } catch { /* continuar */ }
      }
      
      setError('Conta não encontrada. Crie uma conta primeiro.');
    } catch {
      setError('Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    setError('');
    setLoading(true);
    const e = email.trim().toLowerCase();
    const p = password.trim();

    try {
      // Verificar se já existe
      const exists = checkAccount(e, p);
      if (exists === 'ok' || exists === 'wrong_password') {
        setError('Este e-mail já está cadastrado. Faça login.');
        setLoading(false);
        return;
      }

      // Salvar conta localmente (SEMPRE — é a fonte da verdade)
      saveAccount(e, p);
      
      // Tentar criar no Supabase Auth também (melhor esforço)
      if (supabase) {
        try {
          await supabase.auth.signUp({
            email: e,
            password: p,
            options: { data: { app: 'sifau' } },
          });
        } catch { /* ignorar — conta local já foi salva */ }
      }

      // Entrar automaticamente
      finishAuth(e);
    } catch {
      // Mesmo com erro, salvar e entrar
      saveAccount(e, p);
      finishAuth(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      if (supabase) {
        // Detect if running inside Capacitor (Android app)
        const isCapacitor = !!(window as any).Capacitor;
        
        if (isCapacitor) {
          // ANDROID APP: Open in-app browser, then capture redirect
          const redirectUrl = 'com.sifau.app://auth/callback';
          
          const { data, error: authError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl,
              skipBrowserRedirect: true, // Don't auto-redirect, we handle it
            },
          });
          
          if (authError) {
            setError('Erro ao conectar com Google: ' + authError.message);
            setGoogleLoading(false);
            return;
          }
          
          if (data?.url) {
            // Open the OAuth URL in an in-app browser (Chrome Custom Tab)
            try {
              const { Browser } = await import('@capacitor/browser');
              
              // Listen for the app URL event (when redirect comes back)
              const { App: CapApp } = await import('@capacitor/app');
              CapApp.addListener('appUrlOpen', async (event: { url: string }) => {
                // Extract tokens from the redirect URL
                const url = new URL(event.url);
                const params = new URLSearchParams(url.hash.substring(1)); // After #
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                
                if (accessToken && refreshToken) {
                  // Set the session in Supabase
                  const { data: sessionData } = await supabase!.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  });
                  
                  if (sessionData?.user?.email) {
                    finishAuth(sessionData.user.email, 'google');
                  }
                }
                
                // Close the in-app browser
                await Browser.close();
                setGoogleLoading(false);
              });
              
              // Open the OAuth URL
              await Browser.open({ url: data.url, windowName: '_self' });
            } catch {
              // Fallback: open in external browser
              window.open(data.url, '_blank');
              setGoogleLoading(false);
            }
          } else {
            setError('Não foi possível obter URL de login do Google.');
            setGoogleLoading(false);
          }
        } else {
          // WEB BROWSER: Normal redirect flow
          const redirectUrl = window.location.origin + window.location.pathname;
          
          const { error: authError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl,
            },
          });
          
          if (authError) {
            setError('Erro ao conectar com Google: ' + authError.message);
            setGoogleLoading(false);
          }
          // If no error, browser will redirect to Google login page
        }
      } else {
        setError('Google login requer conexão com o servidor.');
        setGoogleLoading(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao conectar com Google.');
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Digite seu e-mail para recuperar a senha');
      return;
    }
    setError('');
    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();
    try {
      if (supabase) {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: window.location.origin + window.location.pathname,
        });
        if (authError) {
          setError(authError.message);
        } else {
          setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
          setTimeout(() => { setMode('login'); setSuccess(''); }, 4000);
        }
      } else {
        // Verificar se existe localmente
        if (checkAccount(trimmedEmail, '') !== 'not_found') {
          setSuccess('Modo offline. Sua conta existe localmente. Tente lembrar a senha ou contate o administrador.');
        } else {
          setError('Conta não encontrada.');
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen bg-gradient-to-br ${THEME_GRADIENTS[theme]} flex flex-col`}
    >
      <div className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-sm md:max-w-md">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, delay: 0.1 }}
            className="text-center mb-6 md:mb-8"
          >
            <Logo size={100} showText={false} className="md:hidden" />
            <Logo size={130} showText={false} className="hidden md:flex" />
            <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight mt-3">SIFAU</h1>
            <p className="text-blue-300 text-xs md:text-sm mt-1">Sistema Inteligente de Fiscalização e Atividades Urbanas</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 md:p-6 border border-white/10"
          >
            {/* Tabs */}
            {mode !== 'forgot' && (
              <div className="flex bg-white/5 rounded-xl p-1 mb-5">
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    mode === 'login' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  <LogIn size={16} /> Entrar
                </button>
                <button
                  onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    mode === 'register' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  <UserPlus size={16} /> Criar Conta
                </button>
              </div>
            )}

            {/* Title */}
            <div className="text-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-white">
                {mode === 'login' && 'Bem-vindo de volta!'}
                {mode === 'register' && 'Crie sua conta'}
                {mode === 'forgot' && 'Recuperar Senha'}
              </h2>
              <p className="text-white/50 text-xs mt-1">
                {mode === 'login' && 'Entre para acessar o SIFAU'}
                {mode === 'register' && 'Cadastre-se para usar o aplicativo'}
                {mode === 'forgot' && 'Enviaremos um link de recuperação'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 flex items-center gap-2 text-red-200 text-sm mb-4"
              >
                <AlertCircle size={16} className="shrink-0" /> {error}
              </motion.div>
            )}

            {/* Success */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/20 border border-green-400/30 rounded-xl p-3 flex items-center gap-2 text-green-200 text-sm mb-4"
              >
                <Mail size={16} className="shrink-0" /> {success}
              </motion.div>
            )}

            {/* Form */}
            <div className="space-y-3">
              {/* Email */}
              <div>
                <label className="text-xs text-blue-200/80 mb-1 block">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    onKeyDown={e => e.key === 'Enter' && (mode === 'forgot' ? handleForgotPassword() : mode === 'login' ? handleEmailLogin() : handleEmailRegister())}
                    className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              {mode !== 'forgot' && (
                <div>
                  <label className="text-xs text-blue-200/80 mb-1 block">Senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : 'Sua senha'}
                      onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleEmailLogin() : handleEmailRegister())}
                      className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-12 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              {mode === 'register' && (
                <div>
                  <label className="text-xs text-blue-200/80 mb-1 block">Confirmar Senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      onKeyDown={e => e.key === 'Enter' && handleEmailRegister()}
                      className="w-full bg-white/10 border border-white/15 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={mode === 'forgot' ? handleForgotPassword : mode === 'login' ? handleEmailLogin : handleEmailRegister}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl py-3 font-semibold transition flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Aguarde...</>
                ) : (
                  <>
                    {mode === 'login' && <><LogIn size={18} /> Entrar</>}
                    {mode === 'register' && <><UserPlus size={18} /> Criar Conta</>}
                    {mode === 'forgot' && <><Mail size={18} /> Enviar Link</>}
                  </>
                )}
              </button>

              {/* Forgot password link */}
              {mode === 'login' && (
                <button
                  onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                  className="w-full text-blue-300/70 hover:text-blue-200 text-xs transition py-1"
                >
                  Esqueci minha senha
                </button>
              )}

              {/* Back to login from forgot */}
              {mode === 'forgot' && (
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  className="w-full text-blue-300/70 hover:text-blue-200 text-xs transition py-1 flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} /> Voltar ao login
                </button>
              )}
            </div>

            {/* Divider */}
            {mode !== 'forgot' && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-white/30 text-xs">ou</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>
            )}

            {/* Google Login */}
            {mode !== 'forgot' && (
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl py-3 font-medium transition flex items-center justify-center gap-3 text-sm"
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {googleLoading ? 'Conectando...' : 'Continuar com Google'}
              </button>
            )}
          </motion.div>

          {/* Footer info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-center"
          >
            <p className="text-white/20 text-[10px]">
              Ao continuar, você concorda com os Termos de Uso e Política de Privacidade do SIFAU.
            </p>
            <p className="text-white/15 text-[10px] mt-1">
              SIFAU v2.0 — Fiscalização Inteligente
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  RECUPERAR SENHA (do servidor — matrícula)
// ═══════════════════════════════════════════════════════════════
function RecuperarSenha({ onBack, theme }: { onBack: () => void; theme: AppTheme }) {
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (email.trim() && matricula.trim()) {
      setSent(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={`min-h-screen bg-gradient-to-br ${THEME_GRADIENTS[theme]} flex flex-col`}
    >
      <div className="p-4 lg:p-6">
        <button onClick={onBack} className="text-white/70 flex items-center gap-1 text-sm hover:text-white transition">
          <ArrowLeft size={18} /> Voltar ao Login
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm md:max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Recuperar Senha</h1>
            <p className="text-blue-300 text-sm mt-1">Informe seus dados para recuperação</p>
          </div>

          {!sent ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-blue-200 mb-1 block">Matrícula</label>
                <input
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  placeholder="Ex: FSC-001 ou GER-001"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-sm text-blue-200 mb-1 block">E-mail cadastrado</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!email.trim() || !matricula.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-60 text-white rounded-xl py-3 font-semibold transition"
              >
                Enviar Solicitação
              </button>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10 mt-4">
                <p className="text-xs text-blue-300/80">
                  <strong className="text-blue-200">📧 Como funciona:</strong><br />
                  Sua solicitação será enviada ao administrador do sistema que irá redefinir sua senha e entrar em contato.
                </p>
                <p className="text-xs text-blue-300/60 mt-2">
                  Contato direto: <a href="mailto:douglasgabriel9628@gmail.com" className="text-blue-400 underline">douglasgabriel9628@gmail.com</a>
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Mail size={40} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Solicitação Enviada!</h2>
              <p className="text-blue-300 text-sm">
                Sua solicitação de recuperação de senha para a matrícula <strong className="text-white">{matricula.toUpperCase()}</strong> foi registrada.
              </p>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-left">
                <p className="text-xs text-blue-300">
                  <strong>⏱ Prazo:</strong> Até 48 horas úteis<br />
                  <strong>📧 Resposta para:</strong> {email}<br />
                  <strong>📞 Urgente:</strong> (81) 98477-6800
                </p>
              </div>
              <button
                onClick={onBack}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl py-3 font-semibold hover:bg-white/20 transition"
              >
                Voltar ao Login
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  LOGIN DO SERVIDOR (Matrícula + Senha)
// ═══════════════════════════════════════════════════════════════
function LoginScreen({ onBack, onSuccess, theme }: { onBack: () => void; onSuccess: () => void; theme: AppTheme }) {
  const { login } = useApp();
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecuperar, setShowRecuperar] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await login(matricula, senha);
      if (user) {
        onSuccess();
      } else {
        setError('Matrícula ou senha inválida');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (showRecuperar) {
    return <RecuperarSenha onBack={() => setShowRecuperar(false)} theme={theme} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={`min-h-screen bg-gradient-to-br ${THEME_GRADIENTS[theme]} flex flex-col`}
    >
      <div className="p-4 lg:p-6">
        <button onClick={onBack} className="text-white/70 flex items-center gap-1 text-sm hover:text-white transition">
          <ArrowLeft size={18} /> Voltar
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm md:max-w-md lg:max-w-lg">
          <div className="text-center mb-8">
            <Logo size={80} showText={false} className="mx-auto mb-2" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">Acesso do Servidor</h1>
            <p className="text-blue-300 text-sm md:text-base mt-1">SIFAU — Fiscais e Gerentes</p>
            
            {/* Connection info removed for cleaner UI */}
          </div>

          <div className="space-y-4 md:space-y-5">
            <div>
              <label className="text-sm md:text-base text-blue-200 mb-1 block">Matrícula</label>
              <input
                value={matricula}
                onChange={e => setMatricula(e.target.value)}
                placeholder="Ex: FSC-001 ou GER-001"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 md:py-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 md:text-lg"
              />
            </div>
            <div className="relative">
              <label className="text-sm md:text-base text-blue-200 mb-1 block">Senha</label>
              <input
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 md:py-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 md:text-lg pr-12"
              />
              <button
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-9 md:top-10 text-white/50 hover:text-white/80 transition"
              >
                {showSenha ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-400/30 rounded-xl p-3 flex items-center gap-2 text-red-200 text-sm"
              >
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || !matricula.trim() || !senha.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-60 text-white rounded-xl py-3 md:py-4 font-semibold transition mt-2 md:text-lg"
            >
              {loading ? 'Conectando...' : 'Entrar'}
            </button>

            {/* Forgot password */}
            <button
              onClick={() => setShowRecuperar(true)}
              className="w-full text-blue-300/80 hover:text-blue-200 text-sm transition py-2"
            >
              Esqueci minha senha
            </button>
          </div>

          {/* Login info removed */}

          <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-xs text-blue-300/60 text-center">
              🛡️ Acesso exclusivo para servidores cadastrados. 
              Sua senha é pessoal e intransferível.
            </p>
            <p className="text-[10px] text-blue-300/40 text-center mt-2">
              Problemas de acesso? Contate o administrador:<br />
              <a href="mailto:douglasgabriel9628@gmail.com" className="text-blue-400/60 hover:text-blue-300">
                douglasgabriel9628@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  HOME SCREEN (Cidadão ou Servidor)
// ═══════════════════════════════════════════════════════════════
function HomeScreen({ onLogin, onCidadao, onOpenSettings, onLogoutAuth, theme }: { 
  onLogin: () => void; 
  onCidadao: () => void; 
  onOpenSettings: () => void;
  onLogoutAuth: () => void;
  theme: AppTheme;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`min-h-screen bg-gradient-to-br ${THEME_GRADIENTS[theme]} flex flex-col`}
    >
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm md:max-w-lg text-center">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, delay: 0.2 }}
            className="mb-8"
          >
            <Logo size={120} showText={false} className="mx-auto md:hidden" />
            <Logo size={160} showText={false} className="mx-auto hidden md:flex" />
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mt-4">SIFAU</h1>
            <p className="text-blue-300 text-sm md:text-base mt-2">Sistema Inteligente de Fiscalização<br />e Atividades Urbanas</p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3 md:space-y-4"
          >
            {/* Citizen button */}
            <button
              onClick={onCidadao}
              className="w-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white rounded-2xl py-4 md:py-5 px-6 transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition">
                  <Users size={24} className="text-green-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-base md:text-lg">Sou Cidadão</p>
                  <p className="text-xs md:text-sm text-blue-300/80">Fazer denúncia ou acompanhar</p>
                </div>
                <ChevronDown size={20} className="text-white/40 -rotate-90" />
              </div>
            </button>

            {/* Server button */}
            <button
              onClick={onLogin}
              className="w-full bg-blue-600/80 backdrop-blur border border-blue-500/30 hover:bg-blue-600 text-white rounded-2xl py-4 md:py-5 px-6 transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition">
                  <Lock size={24} className="text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-base md:text-lg">Sou Servidor</p>
                  <p className="text-xs md:text-sm text-blue-200/80">Fiscal ou Gerente — Login necessário</p>
                </div>
                <ChevronDown size={20} className="text-white/40 -rotate-90" />
              </div>
            </button>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 space-y-3"
          >
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={onOpenSettings}
                className="text-white/40 hover:text-white/70 text-xs transition flex items-center gap-1"
              >
                ⚙️ Configurações
              </button>
              <button
                onClick={onLogoutAuth}
                className="text-white/40 hover:text-red-300 text-xs transition flex items-center gap-1"
              >
                🚪 Sair da Conta
              </button>
            </div>
            <p className="text-white/30 text-[10px]">
              SIFAU v2.0 — Fiscalização Inteligente
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  APP CONTENT — Fluxo principal
// ═══════════════════════════════════════════════════════════════
function AppContent() {
  const { currentUser, logout, setAuthEmail, authEmail } = useApp();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = checking
  const [screen, setScreen] = useState<'home' | 'login' | 'cidadao'>(() => {
    // Restaurar tela salva para não voltar à home
    const saved = sessionStorage.getItem('sifau_screen');
    if (saved === 'cidadao' || saved === 'login') return saved;
    return 'home';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('sifau_theme');
    return (saved as AppTheme) || 'default';
  });

  // Check if user is already authenticated on load
  useEffect(() => {
    const settings = loadSettings();
    applyTheme(settings.theme || theme);
    applyAccessibility(settings);
    if (settings.theme) setTheme(settings.theme);

    async function checkAuth() {
      // 1. Verificar sessão local salva
      const savedEmail = getSession();
      if (savedEmail) {
        console.log('🔄 Sessão restaurada:', savedEmail);
        setAuthEmail(savedEmail);
        supa.registerUserAccount(savedEmail, 'session').catch(() => {});
        setIsAuthenticated(true);
        return;
      }
      
      // 2. Verificar sessão Supabase Auth (Google OAuth redirect)
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            const sessionEmail = session.user.email;
            console.log('🔄 Sessão Supabase restaurada:', sessionEmail);
            saveSession(sessionEmail);
            setAuthEmail(sessionEmail);
            supa.registerUserAccount(sessionEmail, 'google').catch(() => {});
            setIsAuthenticated(true);
            return;
          }
        } catch { /* continue */ }
      }
      
      // 3. Nenhuma sessão encontrada
      setIsAuthenticated(false);
    }

    checkAuth();

    // Listen for auth state changes (Google OAuth redirect)
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.email) {
          const sessionEmail = session.user.email;
          setAuthEmail(sessionEmail);
          saveSession(sessionEmail);
          saveAccount(sessionEmail, 'google-auth');
          supa.registerUserAccount(sessionEmail, session.user?.app_metadata?.provider || 'google').catch(() => {});
          setIsAuthenticated(true);
        }
      });
      return () => subscription.unsubscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir tela atual para não resetar
  useEffect(() => {
    sessionStorage.setItem('sifau_screen', screen);
  }, [screen]);

  // Handle device back button — navigate within app instead of exiting
  useEffect(() => {
    const handlePopState = () => {
      if (showSettings) {
        setShowSettings(false);
      } else if (currentUser) {
        logout();
        setScreen('home');
      } else if (screen === 'login') {
        setScreen('home');
      } else if (screen === 'cidadao') {
        setScreen('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showSettings, currentUser, screen, logout]);

  // Push history state when navigating
  const navigateTo = (newScreen: typeof screen) => {
    window.history.pushState({ screen: newScreen }, '');
    setScreen(newScreen);
  };
  const openSettings = () => {
    window.history.pushState({ settings: true }, '');
    setShowSettings(true);
  };

  useEffect(() => {
    localStorage.setItem('sifau_theme', theme);
    applyTheme(theme);
  }, [theme]);

  const handleLogoutAuth = async () => {
    if (supabase) {
      try { await supabase.auth.signOut(); } catch { /* ignore */ }
    }
    // Remover sessão ativa mas NÃO as credenciais salvas (sifau_accounts_v2)
    clearSession();
    sessionStorage.removeItem('sifau_screen');
    setIsAuthenticated(false);
    setScreen('home');
    logout();
  };

  // Loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${THEME_GRADIENTS[theme]} flex items-center justify-center`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Logo size={100} showText={false} className="mx-auto mb-2" />
          <Loader2 size={24} className="text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-white/60 text-sm">Carregando SIFAU...</p>
        </motion.div>
      </div>
    );
  }

  // Not authenticated — show auth screen
  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        <AuthScreen
          key="auth"
          onAuthenticated={(email?: string) => {
            if (email) setAuthEmail(email);
            setIsAuthenticated(true);
          }}
          theme={theme}
        />
      </AnimatePresence>
    );
  }

  // Authenticated — show app
  if (showSettings) {
    return (
      <AnimatePresence mode="wait">
        <Settings
          key="settings"
          onBack={() => setShowSettings(false)}
          currentTheme={theme}
          onThemeChange={setTheme}
          authEmail={authEmail}
          onLogoutAuth={handleLogoutAuth}
          onDeleteAccount={async () => {
            // Delete account with 30-day recovery
            const deleted = await supa.deleteUserAccount(authEmail);
            if (deleted) {
              console.log('🗑️ Conta agendada para exclusão:', authEmail);
            }
            // Clear all local data for this email
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.includes(authEmail)) localStorage.removeItem(key);
            });
            // Logout from auth
            handleLogoutAuth();
          }}
        />
      </AnimatePresence>
    );
  }

  // If logged in as fiscal
  if (currentUser?.tipo === 'fiscal') {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="fiscal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <FiscalModule
            onLogout={() => { logout(); navigateTo('home'); }}
            onOpenSettings={openSettings}
            theme={theme}
            profilePhoto={getProfilePhoto(authEmail) || undefined}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // If logged in as gerente
  if (currentUser?.tipo === 'gerente') {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="gerente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <GerenteModule
            onLogout={() => { logout(); navigateTo('home'); }}
            onOpenSettings={openSettings}
            theme={theme}
            profilePhoto={getProfilePhoto(authEmail) || undefined}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Login screen
  if (screen === 'login') {
    return (
      <AnimatePresence mode="wait">
        <LoginScreen
          key="login"
          onBack={() => navigateTo('home')}
          onSuccess={() => {}}
          theme={theme}
        />
      </AnimatePresence>
    );
  }

  // Cidadão screen (no login needed)
  if (screen === 'cidadao') {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="cidadao" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <CidadaoModule
            onLogin={() => navigateTo('login')}
            onOpenSettings={openSettings}
            theme={theme}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // Home screen — choose role
  return (
    <AnimatePresence mode="wait">
      <HomeScreen
        key="home"
        onLogin={() => navigateTo('login')}
        onCidadao={() => navigateTo('cidadao')}
        onOpenSettings={openSettings}
        onLogoutAuth={handleLogoutAuth}
        theme={theme}
      />
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <AppContent />
      </div>
    </AppProvider>
  );
}
