import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, Palette, Shield, FileText, HeadphonesIcon,
  Smartphone, Info, Moon, Sun, Check, Lock, Bell, MapPin, Camera,
  Mic, Wifi, HardDrive, ChevronDown, ChevronUp, Mail, Phone, Globe,
  AlertTriangle, Eye, Database, UserCheck, Scale, CheckCircle, XCircle,
  Volume2, Vibrate, ExternalLink, RefreshCw, Trash2, Type, Contrast, Zap,
  ImagePlus, X
} from 'lucide-react';
import { getProfilePhoto, saveProfilePhoto, removeProfilePhoto, compressImage } from '../lib/profilePhoto';

export type AppTheme = 'default' | 'dark';

export interface AppSettings {
  theme: AppTheme;
  notifications: {
    statusChanges: boolean;
    scoring: boolean;
    designations: boolean;
    approval: boolean;
    sounds: boolean;
    vibration: boolean;
    browserPermission: NotificationPermission | 'default';
  };
  accessibility: {
    largerText: boolean;
    highContrast: boolean;
    reduceAnimations: boolean;
  };
  permissions: {
    camera: PermissionState | 'unknown';
    location: PermissionState | 'unknown';
    microphone: PermissionState | 'unknown';
    notifications: NotificationPermission | 'default';
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'default',
  notifications: {
    statusChanges: true,
    scoring: true,
    designations: true,
    approval: true,
    sounds: false,
    vibration: true,
    browserPermission: 'default',
  },
  accessibility: {
    largerText: false,
    highContrast: false,
    reduceAnimations: false,
  },
  permissions: {
    camera: 'unknown',
    location: 'unknown',
    microphone: 'unknown',
    notifications: 'default',
  },
};

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem('sifau_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem('sifau_settings', JSON.stringify(settings));
}

export function applyAccessibility(settings: AppSettings) {
  const root = document.documentElement;
  root.setAttribute('data-font-scale', settings.accessibility.largerText ? 'large' : 'normal');
  root.setAttribute('data-high-contrast', settings.accessibility.highContrast ? 'true' : 'false');
  root.setAttribute('data-reduce-motion', settings.accessibility.reduceAnimations ? 'true' : 'false');
}

export function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// Send a real browser notification
export function sendBrowserNotification(title: string, body: string, settings: AppSettings) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notif = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'sifau-' + Date.now(),
  });

  if (settings.notifications.sounds) {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1200;
        gain2.gain.value = 0.1;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.15);
      }, 180);
    } catch { /* audio context not available */ }
  }

  if (settings.notifications.vibration && 'vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }

  setTimeout(() => notif.close(), 5000);
}

interface SettingsProps {
  onBack: () => void;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  authEmail?: string;
  onDeleteAccount?: () => void;
  onLogoutAuth?: () => void;
}

const THEMES: { id: AppTheme; label: string; gradient: string; preview: string[]; icon: React.ReactNode; desc: string }[] = [
  { id: 'default', label: 'Padrão (Azul)', gradient: 'from-blue-600 to-blue-800', preview: ['#2563eb', '#1e40af', '#eff6ff'], icon: <Sun size={14} className="text-yellow-400" />, desc: 'Tema claro com cores azuis institucionais' },
  { id: 'dark', label: 'Modo Escuro', gradient: 'from-gray-800 to-gray-950', preview: ['#1f2937', '#030712', '#111827'], icon: <Moon size={14} className="text-blue-300" />, desc: 'Ideal para uso noturno ou ambientes escuros' },
];

function ExpandableSection({ title, icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 md:p-5 text-left transition"
        style={{ color: 'var(--text-primary)' }}
      >
        <div style={{ color: 'var(--text-muted)' }}>{icon}</div>
        <span className="flex-1 text-sm md:text-base font-semibold">{title}</span>
        {open ? <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-5 pb-4 md:pb-5 border-t" style={{ borderColor: 'var(--border-color)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex items-center shrink-0 rounded-full transition-colors duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      style={{ width: 44, height: 24, ...(checked ? { backgroundColor: 'var(--accent-primary)' } : {}) }}
    >
      <span
        className={`inline-block w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
          }`}
      />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PROFILE ACCOUNT SECTION — Foto de perfil + Info da conta
// ═══════════════════════════════════════════════════════════════
function ProfileAccountSection({ authEmail, onLogoutAuth, showToast }: { 
  authEmail: string; 
  onLogoutAuth?: () => void;
  showToast: (msg: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  useEffect(() => {
    const photo = getProfilePhoto(authEmail);
    setProfilePhoto(photo);
  }, [authEmail]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('❌ Selecione um arquivo de imagem');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('❌ Imagem muito grande (máx. 10MB)');
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImage(file, 200);
      saveProfilePhoto(authEmail, compressed);
      setProfilePhoto(compressed);
      setShowPhotoOptions(false);
      showToast('✅ Foto de perfil atualizada!');
    } catch {
      showToast('❌ Erro ao processar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    removeProfilePhoto(authEmail);
    setProfilePhoto(null);
    setShowPhotoOptions(false);
    showToast('🗑️ Foto de perfil removida');
  };

  return (
    <div className="rounded-xl border p-4 md:p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Mail size={20} style={{ color: 'var(--accent-primary)' }} />
        <h3 className="text-base md:text-lg font-bold" style={{ color: 'var(--text-heading)' }}>Minha Conta</h3>
      </div>
      
      <div className="rounded-lg p-4 md:p-5" style={{ backgroundColor: 'var(--input-bg)' }}>
        {/* Profile Photo + Info */}
        <div className="flex items-center gap-4 mb-4">
          {/* Photo Avatar */}
          <div className="relative shrink-0">
            <button 
              onClick={() => setShowPhotoOptions(!showPhotoOptions)}
              className="relative group"
            >
              {profilePhoto ? (
                <img 
                  src={profilePhoto} 
                  alt="Perfil" 
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 transition group-hover:opacity-80"
                  style={{ borderColor: 'var(--accent-primary)' }}
                />
              ) : (
                <div 
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl md:text-3xl transition group-hover:opacity-80"
                  style={{ background: 'linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))' }}
                >
                  {authEmail.charAt(0).toUpperCase()}
                </div>
              )}
              {/* Camera overlay */}
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition" />
              </div>
              {/* Edit badge */}
              <div 
                className="absolute -bottom-1 -right-1 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center border-2 shadow-md"
                style={{ backgroundColor: 'var(--accent-primary)', borderColor: 'var(--bg-card)' }}
              >
                <Camera size={10} className="text-white md:hidden" />
                <Camera size={12} className="text-white hidden md:block" />
              </div>
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm md:text-base font-bold truncate" style={{ color: 'var(--text-heading)' }}>
              {authEmail}
            </p>
            <p className="text-[10px] md:text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Conta ativa — logado neste dispositivo
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                <CheckCircle size={10} /> Verificado
              </span>
              <span className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>
                {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </div>

        {/* Photo Options Dropdown */}
        <AnimatePresence>
          {showPhotoOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border p-3 mb-3 space-y-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
                  📸 Foto de Perfil
                </p>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center gap-3 rounded-lg p-2.5 transition hover:opacity-80"
                  style={{ backgroundColor: 'var(--input-bg)' }}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <ImagePlus size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {uploading ? 'Processando...' : profilePhoto ? 'Trocar Foto' : 'Escolher Foto'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      JPG, PNG ou GIF (máx. 10MB)
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'user';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
                        handlePhotoSelect(fakeEvent);
                      }
                    };
                    input.click();
                  }}
                  disabled={uploading}
                  className="w-full flex items-center gap-3 rounded-lg p-2.5 transition hover:opacity-80"
                  style={{ backgroundColor: 'var(--input-bg)' }}
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Camera size={16} className="text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Tirar Selfie</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Usar câmera frontal</p>
                  </div>
                </button>

                {profilePhoto && (
                  <button
                    onClick={handleRemovePhoto}
                    className="w-full flex items-center gap-3 rounded-lg p-2.5 transition hover:bg-red-50"
                    style={{ backgroundColor: 'var(--input-bg)' }}
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <X size={16} className="text-red-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-red-600">Remover Foto</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Voltar ao avatar padrão</p>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => setShowPhotoOptions(false)}
                  className="w-full text-center text-xs py-1.5 transition"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Change photo hint */}
        {!showPhotoOptions && (
          <p className="text-[10px] text-center mb-2" style={{ color: 'var(--text-muted)' }}>
            Toque na foto para alterar
          </p>
        )}
      </div>

      {onLogoutAuth && (
        <button
          onClick={onLogoutAuth}
          className="w-full mt-3 rounded-xl py-2.5 md:py-3 text-sm md:text-base font-medium flex items-center justify-center gap-2 border transition"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)' }}
        >
          <ArrowLeft size={16} /> Sair desta Conta
        </button>
      )}
    </div>
  );
}

export default function Settings({ onBack, currentTheme, onThemeChange, authEmail, onDeleteAccount, onLogoutAuth }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [permissionStatuses, setPermissionStatuses] = useState<AppSettings['permissions']>({
    camera: 'unknown',
    location: 'unknown',
    microphone: 'unknown',
    notifications: 'default',
  });
  const [toastMsg, setToastMsg] = useState('');

  const themeColors = THEMES.find(t => t.id === currentTheme) || THEMES[0];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Check real permission states
  const checkPermissions = useCallback(async () => {
    const perms: AppSettings['permissions'] = {
      camera: 'unknown',
      location: 'unknown',
      microphone: 'unknown',
      notifications: 'default',
    };

    try {
      if ('permissions' in navigator) {
        const camPerm = await navigator.permissions.query({ name: 'camera' as PermissionName });
        perms.camera = camPerm.state;
        const locPerm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        perms.location = locPerm.state;
        try {
          const micPerm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          perms.microphone = micPerm.state;
        } catch {
          perms.microphone = 'unknown';
        }
      }
    } catch { /* permissions API not available */ }

    if ('Notification' in window) {
      perms.notifications = Notification.permission;
    }

    setPermissionStatuses(perms);
    setSettings(prev => ({ ...prev, permissions: perms }));
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Apply settings whenever they change
  useEffect(() => {
    saveSettings(settings);
    applyAccessibility(settings);
  }, [settings]);

  const updateNotification = (key: keyof AppSettings['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  };

  const updateAccessibility = (key: keyof AppSettings['accessibility'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      accessibility: { ...prev.accessibility, [key]: value },
    }));
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('❌ Notificações não suportadas neste navegador');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setPermissionStatuses(prev => ({ ...prev, notifications: result }));
      setSettings(prev => ({
        ...prev,
        notifications: { ...prev.notifications, browserPermission: result },
        permissions: { ...prev.permissions, notifications: result },
      }));
      if (result === 'granted') {
        showToast('✅ Notificações habilitadas com sucesso!');
        sendBrowserNotification('SIFAU', 'Notificações ativadas! Você receberá alertas em tempo real.', settings);
      } else if (result === 'denied') {
        showToast('❌ Notificações bloqueadas. Altere nas configurações do navegador.');
      }
    } catch {
      showToast('❌ Erro ao solicitar permissão de notificações');
    }
  };

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setPermissionStatuses(prev => ({ ...prev, camera: 'granted' }));
      showToast('✅ Câmera permitida com sucesso!');
      await checkPermissions();
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError') {
        setPermissionStatuses(prev => ({ ...prev, camera: 'denied' }));
        showToast('❌ Câmera negada. Altere nas configurações do navegador.');
      } else {
        showToast('❌ Câmera não disponível neste dispositivo');
      }
    }
  };

  // Request GPS permission
  const requestLocationPermission = async () => {
    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      setPermissionStatuses(prev => ({ ...prev, location: 'granted' }));
      showToast('✅ Localização permitida com sucesso!');
      await checkPermissions();
    } catch (err: unknown) {
      const error = err as GeolocationPositionError;
      if (error.code === error.PERMISSION_DENIED) {
        setPermissionStatuses(prev => ({ ...prev, location: 'denied' }));
        showToast('❌ Localização negada. Altere nas configurações do navegador.');
      } else {
        showToast('❌ Erro ao obter localização');
      }
    }
  };

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setPermissionStatuses(prev => ({ ...prev, microphone: 'granted' }));
      showToast('✅ Microfone permitido com sucesso!');
      await checkPermissions();
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'NotAllowedError') {
        setPermissionStatuses(prev => ({ ...prev, microphone: 'denied' }));
        showToast('❌ Microfone negado. Altere nas configurações do navegador.');
      } else {
        showToast('❌ Microfone não disponível neste dispositivo');
      }
    }
  };

  const getPermissionBadge = (status: PermissionState | NotificationPermission | 'unknown') => {
    switch (status) {
      case 'granted':
        return <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle size={12} /> Permitido</span>;
      case 'denied':
        return <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full"><XCircle size={12} /> Negado</span>;
      case 'prompt':
        return <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full"><AlertTriangle size={12} /> Pendente</span>;
      default:
        return <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><Info size={12} /> Não verificado</span>;
    }
  };

  const getPermissionButton = (status: PermissionState | NotificationPermission | 'unknown', onRequest: () => void) => {
    if (status === 'granted') {
      return <button disabled className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-medium cursor-default">✅ Ativo</button>;
    }
    if (status === 'denied') {
      return <button disabled className="text-xs px-3 py-1.5 bg-red-100 text-red-600 rounded-lg font-medium cursor-default">Bloqueado pelo navegador</button>;
    }
    return (
      <button onClick={onRequest} className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: 'var(--accent-primary)' }}>
        Solicitar Permissão
      </button>
    );
  };

  // Toast notification
  const ToastOverlay = () => (
    <AnimatePresence>
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md z-[999] bg-gray-900 text-white rounded-xl px-5 py-3 shadow-2xl text-center text-sm font-medium"
        >
          {toastMsg}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Termos de Uso
  if (activeSection === 'termos') {
    return (
      <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className={`bg-gradient-to-r ${themeColors.gradient} text-white p-4 md:p-6 flex items-center gap-3`}>
          <button onClick={() => setActiveSection(null)}><ArrowLeft size={24} /></button>
          <h2 className="text-lg md:text-xl font-bold">Termos de Uso</h2>
        </div>
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="rounded-xl p-5 md:p-8 shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <Scale size={28} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <h1 className="text-xl md:text-2xl font-bold m-0" style={{ color: 'var(--text-heading)' }}>Termos de Uso do SIFAU</h1>
                <p className="text-xs md:text-sm m-0" style={{ color: 'var(--text-muted)' }}>Última atualização: Janeiro de 2026</p>
              </div>
            </div>

            {[
              { title: '1. ACEITAÇÃO DOS TERMOS', text: 'Ao utilizar o Sistema Inteligente de Fiscalização e Atividades Urbanas (SIFAU), o usuário concorda integralmente com os presentes Termos de Uso. O SIFAU é um sistema de propriedade da administração municipal, destinado ao recebimento de denúncias urbanas, gestão de fiscalização e acompanhamento de processos administrativos.' },
              { title: '2. DEFINIÇÕES', text: 'Cidadão/Denunciante: Qualquer pessoa que utilize o sistema para registrar denúncias de irregularidades urbanas.\nFiscal: Servidor público municipal autorizado a realizar vistorias e emitir autos de infração.\nGerente/Superintendente: Servidor público com atribuições de gestão, designação e aprovação de processos fiscalizatórios.' },
              { title: '3. DO USO DO SISTEMA', text: '3.1. O módulo do Cidadão é de acesso livre, não sendo obrigatório login para registrar denúncias.\n3.2. Os módulos de Fiscal e Gerente são de acesso restrito, mediante credenciais fornecidas pela administração.\n3.3. O uso indevido do sistema, incluindo denúncias falsas ou fraudulentas, poderá ensejar responsabilização civil e criminal.\n3.4. Denúncias anônimas são permitidas e protegidas por este sistema.' },
              { title: '4. DAS OBRIGAÇÕES DO USUÁRIO', text: '4.1. Fornecer informações verídicas e precisas ao registrar denúncias.\n4.2. Não utilizar o sistema para fins ilícitos ou que prejudiquem terceiros.\n4.3. Manter o sigilo de suas credenciais de acesso (quando aplicável).\n4.4. Não tentar acessar áreas restritas do sistema sem autorização.' },
              { title: '5. PROPRIEDADE INTELECTUAL', text: 'Todo o conteúdo, layout, código-fonte e funcionalidades do SIFAU são de propriedade exclusiva da administração municipal. É proibida a reprodução, distribuição ou modificação sem autorização prévia.' },
              { title: '6. LIMITAÇÃO DE RESPONSABILIDADE', text: '6.1. O SIFAU é fornecido "como está", sem garantias de disponibilidade ininterrupta.\n6.2. A administração não se responsabiliza por perdas de dados decorrentes de falhas técnicas ou uso indevido.\n6.3. Prazos de atendimento (SLA) são estimativas e podem variar conforme a demanda.' },
              { title: '7. ALTERAÇÕES DOS TERMOS', text: 'A administração municipal reserva-se o direito de alterar estes Termos a qualquer momento, sendo responsabilidade do usuário verificar periodicamente eventuais atualizações.' },
              { title: '8. FORO', text: 'Fica eleito o foro da Comarca local para dirimir quaisquer questões oriundas do uso do SIFAU, com renúncia a qualquer outro, por mais privilegiado que seja.' },
            ].map((section, i) => (
              <div key={i}>
                <h3 className="text-base md:text-lg font-bold mt-6" style={{ color: 'var(--text-heading)' }}>{section.title}</h3>
                <p className="text-sm md:text-base leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{section.text}</p>
              </div>
            ))}

            <div className="mt-8 pt-4 border-t text-center" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>
                SIFAU — Sistema Inteligente de Fiscalização e Atividades Urbanas<br />
                © 2026 — Todos os direitos reservados
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Política de Privacidade
  if (activeSection === 'privacidade') {
    return (
      <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className={`bg-gradient-to-r ${themeColors.gradient} text-white p-4 md:p-6 flex items-center gap-3`}>
          <button onClick={() => setActiveSection(null)}><ArrowLeft size={24} /></button>
          <h2 className="text-lg md:text-xl font-bold">Política de Privacidade</h2>
        </div>
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="rounded-xl p-5 md:p-8 shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <Lock size={28} className="text-green-600" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold m-0" style={{ color: 'var(--text-heading)' }}>Política de Privacidade</h1>
                <p className="text-xs md:text-sm m-0" style={{ color: 'var(--text-muted)' }}>Em conformidade com a LGPD (Lei nº 13.709/2018)</p>
              </div>
            </div>

            {[
              { title: '1. COLETA DE DADOS', text: 'O SIFAU coleta os seguintes dados pessoais, conforme a necessidade de cada módulo:\n\n• Cidadão (opcional): Nome, informações de contato (quando identificado).\n• Fiscal: Nome, matrícula, geolocalização durante vistorias, assinatura digital.\n• Gerente: Nome, matrícula, registros de atividades administrativas.\n• Denúncias: Endereço, descrição, coordenadas GPS, fotografias (com metadados).' },
              { title: '2. FINALIDADE DO TRATAMENTO', text: '2.1. Interesse Público: Recebimento e processamento de denúncias de irregularidades urbanas.\n2.2. Execução de Políticas Públicas: Gestão de atividades de fiscalização urbana e ambiental.\n2.3. Cumprimento de Obrigação Legal: Emissão de autos de infração e documentos oficiais.\n2.4. Acompanhamento: Permitir que o cidadão acompanhe o status de sua denúncia.' },
              { title: '3. ANONIMATO', text: 'O sistema permite denúncias anônimas. Neste caso, nenhum dado pessoal do denunciante é coletado ou armazenado. O protocolo gerado é o único meio de acompanhamento.' },
              { title: '4. ARMAZENAMENTO E SEGURANÇA', text: '4.1. Os dados são armazenados em servidores seguros com criptografia.\n4.2. Fotografias são comprimidas e armazenadas em formato Base64 para integridade.\n4.3. Assinaturas digitais são criptografadas e vinculadas ao servidor responsável.\n4.4. Backups são realizados periodicamente para prevenção de perda de dados.' },
              { title: '5. COMPARTILHAMENTO DE DADOS', text: '5.1. Dados de denúncias podem ser compartilhados entre fiscais e gerentes para fins de fiscalização.\n5.2. Dados podem ser compartilhados com o Ministério Público, quando solicitado judicialmente.\n5.3. Não há compartilhamento de dados com terceiros privados.\n5.4. Dados do denunciante anônimo NUNCA são compartilhados.' },
              { title: '6. DIREITOS DO TITULAR', text: 'Conforme a LGPD, o titular dos dados tem direito a:\n• Confirmação da existência de tratamento de seus dados\n• Acesso aos seus dados pessoais\n• Correção de dados incompletos ou desatualizados\n• Eliminação de dados desnecessários\n• Portabilidade dos dados\n• Revogação do consentimento' },
              { title: '7. COOKIES E DADOS LOCAIS', text: 'O SIFAU utiliza armazenamento local (localStorage) para manter preferências do usuário, como tema de cores e configurações de acessibilidade. Nenhum cookie de rastreamento é utilizado.' },
              { title: '8. ENCARREGADO (DPO)', text: 'Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de dados pessoais, entre em contato com o Encarregado de Proteção de Dados através do e-mail: douglasgabriel9628@gmail.com' },
            ].map((section, i) => (
              <div key={i}>
                <h3 className="text-base md:text-lg font-bold mt-6" style={{ color: 'var(--text-heading)' }}>{section.title}</h3>
                <p className="text-sm md:text-base leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{section.text}</p>
              </div>
            ))}

            <div className="mt-8 pt-4 border-t text-center" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>
                Em conformidade com a Lei Geral de Proteção de Dados (LGPD)<br />
                Lei nº 13.709/2018 — Vigente desde Setembro de 2020
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Permissões
  if (activeSection === 'permissoes') {
    const permissionsList = [
      {
        icon: <Camera size={22} className="text-purple-600" />,
        title: 'Câmera',
        desc: 'Necessária para capturar fotos de evidências em denúncias e relatórios de fiscalização.',
        required: true,
        module: 'Cidadão, Fiscal',
        status: permissionStatuses.camera,
        onRequest: requestCameraPermission,
      },
      {
        icon: <MapPin size={22} className="text-red-600" />,
        title: 'Localização (GPS)',
        desc: 'Utilizada para registrar coordenadas GPS nas denúncias, check-in de vistorias e marcação de fotos com geolocalização.',
        required: true,
        module: 'Cidadão, Fiscal',
        status: permissionStatuses.location,
        onRequest: requestLocationPermission,
      },
      {
        icon: <Mic size={22} className="text-green-600" />,
        title: 'Microfone',
        desc: 'Permite gravação de áudio para transcrição em descrições de denúncia. Opcional.',
        required: false,
        module: 'Cidadão',
        status: permissionStatuses.microphone,
        onRequest: requestMicrophonePermission,
      },
      {
        icon: <Bell size={22} className="text-amber-600" />,
        title: 'Notificações',
        desc: 'Para receber alertas sobre mudanças de status de denúncias, pontuação e novas designações.',
        required: false,
        module: 'Cidadão, Fiscal, Gerente',
        status: permissionStatuses.notifications,
        onRequest: requestNotificationPermission,
      },
      {
        icon: <HardDrive size={22} className="text-blue-600" />,
        title: 'Armazenamento',
        desc: 'Acesso a fotos e arquivos do dispositivo para anexar evidências. Leitura apenas de arquivos selecionados pelo usuário.',
        required: true,
        module: 'Cidadão, Fiscal',
        status: 'granted' as PermissionState,
        onRequest: () => showToast('✅ Armazenamento é gerenciado automaticamente pelo navegador'),
      },
      {
        icon: <Wifi size={22} className="text-teal-600" />,
        title: 'Internet',
        desc: 'Necessária para envio e recebimento de dados, sincronização de denúncias e comunicação em tempo real.',
        required: true,
        module: 'Todos',
        status: (navigator.onLine ? 'granted' : 'denied') as PermissionState,
        onRequest: () => showToast(navigator.onLine ? '✅ Conexão ativa' : '❌ Sem conexão com a internet'),
      },
      {
        icon: <Database size={22} className="text-gray-600" />,
        title: 'Armazenamento Local',
        desc: 'Utiliza localStorage para salvar preferências (tema, configurações). Não armazena dados sensíveis localmente.',
        required: true,
        module: 'Todos',
        status: 'granted' as PermissionState,
        onRequest: () => showToast('✅ Armazenamento local é automático'),
      },
    ];

    return (
      <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className={`bg-gradient-to-r ${themeColors.gradient} text-white p-4 md:p-6 flex items-center gap-3`}>
          <button onClick={() => setActiveSection(null)}><ArrowLeft size={24} /></button>
          <h2 className="text-lg md:text-xl font-bold">Permissões do App</h2>
        </div>
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-3 md:space-y-4">
          <div className="rounded-xl p-4 md:p-5" style={{ backgroundColor: 'var(--badge-bg)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Info size={18} style={{ color: 'var(--accent-primary)' }} />
              <p className="text-sm md:text-base font-semibold" style={{ color: 'var(--text-heading)' }}>Sobre as Permissões</p>
            </div>
            <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>
              O SIFAU solicita apenas as permissões estritamente necessárias. Clique em "Solicitar Permissão" para ativar cada uma. Permissões negadas podem ser alteradas nas configurações do navegador.
            </p>
          </div>

          {/* Solicitar Todas de uma vez */}
          <button
            onClick={async () => {
              await requestNotificationPermission();
              await requestCameraPermission();
              await requestLocationPermission();
              await requestMicrophonePermission();
            }}
            className="w-full py-3 md:py-4 rounded-xl text-white font-semibold text-sm md:text-base flex items-center justify-center gap-2 transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))` }}
          >
            <Shield size={18} /> Solicitar Todas as Permissões
          </button>

          {permissionsList.map((perm, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl p-4 md:p-5 border"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{perm.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="text-sm md:text-base font-bold" style={{ color: 'var(--text-heading)' }}>{perm.title}</h4>
                    <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full font-medium ${perm.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {perm.required ? 'Obrigatória' : 'Opcional'}
                    </span>
                    {getPermissionBadge(perm.status)}
                  </div>
                  <p className="text-xs md:text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{perm.desc}</p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>📱 Módulo: {perm.module}</span>
                    {getPermissionButton(perm.status, perm.onRequest)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <ToastOverlay />
      </motion.div>
    );
  }

  // Main settings screen
  return (
    <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className={`bg-gradient-to-r ${themeColors.gradient} text-white p-4 md:p-6 flex items-center gap-3`}>
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <h2 className="text-lg md:text-xl font-bold">Configurações</h2>
      </div>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-5 pb-24 lg:pb-8">
        {/* App Info Card */}
        <div className={`bg-gradient-to-br ${themeColors.gradient} rounded-2xl p-5 md:p-6 text-white shadow-lg`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Shield size={28} className="text-white md:hidden" />
              <Shield size={36} className="text-white hidden md:block" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">SIFAU</h1>
              <p className="text-sm md:text-base text-white/80">Sistema Inteligente de Fiscalização e Atividades Urbanas</p>
              <p className="text-xs text-white/60 mt-1">Versão 2.0.26 • Build 2026.01</p>
            </div>
          </div>
        </div>

        {/* ========== USER ACCOUNT INFO ========== */}
        {authEmail && authEmail !== 'anonymous' && (
          <ProfileAccountSection 
            authEmail={authEmail} 
            onLogoutAuth={onLogoutAuth}
            showToast={showToast}
          />
        )}

        {/* ========== THEME SELECTION ========== */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={20} style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-base md:text-lg font-bold" style={{ color: 'var(--text-heading)' }}>Aparência</h3>
          </div>
          <div className="rounded-xl border p-4 md:p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-sm md:text-base font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Tema de Cores</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => {
                    onThemeChange(theme.id);
                    setSettings(prev => ({ ...prev, theme: theme.id }));
                    applyTheme(theme.id);
                    showToast(`✅ Tema "${theme.label}" aplicado!`);
                  }}
                  className={`relative rounded-xl border-2 p-4 md:p-5 transition-all text-left ${currentTheme === theme.id
                    ? 'shadow-lg scale-[1.02]'
                    : 'hover:shadow-md'
                    }`}
                  style={{
                    borderColor: currentTheme === theme.id ? 'var(--accent-primary)' : 'var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                  }}
                >
                  {currentTheme === theme.id && (
                    <div className="absolute -top-2 -right-2 text-white rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center shadow-md" style={{ backgroundColor: 'var(--accent-primary)' }}>
                      <Check size={14} />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shadow-sm`}>
                      {theme.icon}
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-bold" style={{ color: 'var(--text-heading)' }}>{theme.label}</p>
                      <p className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>{theme.desc}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mb-2">
                    {theme.preview.map((color, ci) => (
                      <div
                        key={ci}
                        className="flex-1 h-8 md:h-10 rounded-lg shadow-inner"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  {currentTheme === theme.id && (
                    <p className="text-[10px] md:text-xs font-semibold text-center mt-1" style={{ color: 'var(--accent-primary)' }}>
                      ✓ Tema ativo
                    </p>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[10px] md:text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
              O tema será aplicado imediatamente em todo o aplicativo e salvo automaticamente.
            </p>
          </div>
        </div>

        {/* ========== NOTIFICATIONS ========== */}
        <ExpandableSection title="Notificações" icon={<Bell size={20} />} defaultOpen={false}>
          <div className="space-y-4 pt-3">
            {/* Browser Permission Status */}
            <div className="rounded-lg p-3 md:p-4" style={{ backgroundColor: 'var(--input-bg)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Permissão do Navegador</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {permissionStatuses.notifications === 'granted'
                      ? 'Notificações estão ativas. Você receberá alertas em tempo real.'
                      : permissionStatuses.notifications === 'denied'
                        ? 'Bloqueado. Altere nas configurações do navegador (ícone de cadeado na barra de endereços).'
                        : 'Clique para habilitar notificações push no navegador.'}
                  </p>
                </div>
                <div className="shrink-0">
                  {getPermissionBadge(permissionStatuses.notifications)}
                </div>
              </div>
              {permissionStatuses.notifications !== 'granted' && permissionStatuses.notifications !== 'denied' && (
                <button
                  onClick={requestNotificationPermission}
                  className="w-full mt-3 py-2 rounded-lg text-white text-sm font-semibold transition hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  🔔 Habilitar Notificações do Navegador
                </button>
              )}
              {permissionStatuses.notifications === 'granted' && (
                <button
                  onClick={() => {
                    sendBrowserNotification('Teste SIFAU', 'Esta é uma notificação de teste! Tudo funcionando.', settings);
                    showToast('📤 Notificação de teste enviada!');
                  }}
                  className="w-full mt-3 py-2 rounded-lg text-sm font-semibold border transition"
                  style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                >
                  📤 Enviar Notificação de Teste
                </button>
              )}
            </div>

            {/* Individual toggles */}
            {[
              { key: 'statusChanges' as const, label: 'Mudanças de status da denúncia', desc: 'Receba alertas quando sua denúncia mudar de fase', icon: <RefreshCw size={16} /> },
              { key: 'scoring' as const, label: 'Pontuação do fiscal', desc: 'Alertas quando pontos forem liberados', icon: <Zap size={16} /> },
              { key: 'designations' as const, label: 'Novas designações', desc: 'Notificação de novas tarefas designadas', icon: <UserCheck size={16} /> },
              { key: 'approval' as const, label: 'Aprovação de relatórios', desc: 'Alerta quando relatório for aprovado pelo gerente', icon: <CheckCircle size={16} /> },
              { key: 'sounds' as const, label: 'Sons de notificação', desc: 'Reproduzir som ao receber notificações', icon: <Volume2 size={16} /> },
              { key: 'vibration' as const, label: 'Vibração', desc: 'Vibrar ao receber notificações (em dispositivos compatíveis)', icon: <Vibrate size={16} /> },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-2 flex-1">
                  <div className="mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.icon}</div>
                  <div>
                    <p className="text-sm md:text-base font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                    <p className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.notifications[item.key]}
                  onChange={(v) => {
                    updateNotification(item.key, v);
                    if (v && item.key === 'sounds') {
                      try {
                        const ctx = new AudioContext();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.frequency.value = 800;
                        gain.gain.value = 0.1;
                        osc.start();
                        osc.stop(ctx.currentTime + 0.15);
                      } catch { /* */ }
                      showToast('🔊 Sons de notificação ativados');
                    }
                    if (v && item.key === 'vibration' && 'vibrate' in navigator) {
                      navigator.vibrate([100, 50, 100]);
                      showToast('📳 Vibração ativada');
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </ExpandableSection>

        {/* ========== ACCESSIBILITY ========== */}
        <ExpandableSection title="Acessibilidade" icon={<Eye size={20} />} defaultOpen={false}>
          <div className="space-y-4 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <Type size={18} className="mt-0.5 text-blue-500" />
                <div>
                  <p className="text-sm md:text-base font-medium" style={{ color: 'var(--text-primary)' }}>Texto maior</p>
                  <p className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>Aumentar a fonte em 20% em todo o aplicativo</p>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.accessibility.largerText}
                onChange={(v) => {
                  updateAccessibility('largerText', v);
                  showToast(v ? '🔤 Texto ampliado (120%)' : '🔤 Texto normal (100%)');
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <Contrast size={18} className="mt-0.5 text-gray-700" />
                <div>
                  <p className="text-sm md:text-base font-medium" style={{ color: 'var(--text-primary)' }}>Alto contraste</p>
                  <p className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>Texto mais escuro e bordas mais definidas para melhor leitura</p>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.accessibility.highContrast}
                onChange={(v) => {
                  updateAccessibility('highContrast', v);
                  showToast(v ? '◼️ Alto contraste ativado' : '◻️ Contraste normal');
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <Zap size={18} className="mt-0.5 text-amber-500" />
                <div>
                  <p className="text-sm md:text-base font-medium" style={{ color: 'var(--text-primary)' }}>Reduzir animações</p>
                  <p className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>Desabilitar todas as transições e animações do app</p>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.accessibility.reduceAnimations}
                onChange={(v) => {
                  updateAccessibility('reduceAnimations', v);
                  showToast(v ? '⏸️ Animações desabilitadas' : '▶️ Animações habilitadas');
                }}
              />
            </div>

            {/* Preview */}
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>Pré-visualização:</p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Este texto mostra como o conteúdo aparece com as configurações atuais de acessibilidade.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Texto secundário de exemplo para verificar a legibilidade.
              </p>
            </div>
          </div>
        </ExpandableSection>

        {/* ========== LEGAL ========== */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={20} style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-base md:text-lg font-bold" style={{ color: 'var(--text-heading)' }}>Legal</h3>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => setActiveSection('termos')}
              className="w-full rounded-xl border p-4 md:p-5 flex items-center gap-3 text-left transition"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <Scale size={20} style={{ color: 'var(--accent-primary)' }} />
              <div className="flex-1">
                <p className="text-sm md:text-base font-semibold" style={{ color: 'var(--text-heading)' }}>Termos de Uso</p>
                <p className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>Condições para utilização do SIFAU</p>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
            </button>

            <button
              onClick={() => setActiveSection('privacidade')}
              className="w-full rounded-xl border p-4 md:p-5 flex items-center gap-3 text-left transition"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <Lock size={20} className="text-green-600" />
              <div className="flex-1">
                <p className="text-sm md:text-base font-semibold" style={{ color: 'var(--text-heading)' }}>Política de Privacidade</p>
                <p className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>LGPD e tratamento de dados pessoais</p>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        {/* ========== PERMISSIONS ========== */}
        <button
          onClick={() => setActiveSection('permissoes')}
          className="w-full rounded-xl border p-4 md:p-5 flex items-center gap-3 text-left transition"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <Smartphone size={20} className="text-indigo-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm md:text-base font-semibold" style={{ color: 'var(--text-heading)' }}>Permissões do App</p>
            <p className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>Câmera, GPS, microfone, notificações — solicitar e gerenciar</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {permissionStatuses.camera === 'granted' && <CheckCircle size={14} className="text-green-500" />}
            {permissionStatuses.location === 'granted' && <CheckCircle size={14} className="text-green-500" />}
            {permissionStatuses.notifications === 'granted' && <CheckCircle size={14} className="text-green-500" />}
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
        </button>

        {/* ========== DATA & STORAGE ========== */}
        <ExpandableSection title="Dados e Armazenamento" icon={<Database size={20} />}>
          <div className="space-y-3 pt-3">
            <div className="rounded-lg p-3 md:p-4" style={{ backgroundColor: 'var(--input-bg)' }}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm md:text-base font-medium" style={{ color: 'var(--text-primary)' }}>Cache do App</p>
                <span className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  ~{(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--border-color)' }}>
                <div className="h-2 rounded-full" style={{ width: `${Math.min((JSON.stringify(localStorage).length / 1024 / 20) * 100, 100)}%`, backgroundColor: 'var(--accent-primary)' }}></div>
              </div>
              <p className="text-[10px] md:text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {((JSON.stringify(localStorage).length / 1024 / 20) * 100).toFixed(0)}% do limite recomendado (20 KB)
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Preserve critical data that should NEVER be lost
                  const preserve: Record<string, string> = {};
                  const protectedKeys = ['sifau_accounts_v3', 'sifau_accounts_v2', 'sifau_session_v3', 'sifau_session_v2', 'sifau_auth_email', 'sifau_device_id', 'sifau_theme', 'sifau_settings'];
                  protectedKeys.forEach(k => {
                    const v = localStorage.getItem(k);
                    if (v) preserve[k] = v;
                  });
                  // Also preserve profile photos
                  const photoKeys = Object.keys(localStorage).filter(k => k.startsWith('sifau_profile_photos'));
                  photoKeys.forEach(k => { const v = localStorage.getItem(k); if (v) preserve[k] = v; });
                  
                  localStorage.clear();
                  Object.entries(preserve).forEach(([k, v]) => localStorage.setItem(k, v));
                  showToast('🧹 Cache limpo! Conta e preferências mantidas.');
                }}
                className="flex-1 rounded-xl py-2.5 md:py-3 text-xs md:text-sm font-medium flex items-center justify-center gap-1.5 transition"
                style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)' }}
              >
                <Trash2 size={14} /> Limpar Cache
              </button>
              <button
                onClick={() => {
                  if (confirm('⚠️ Tem certeza? Isso vai apagar configurações e dados salvos localmente. Sua conta será mantida.')) {
                    // Preserve account credentials so user can login again
                    const preserve: Record<string, string> = {};
                    const protectedKeys = ['sifau_accounts_v3', 'sifau_accounts_v2', 'sifau_session_v3', 'sifau_session_v2', 'sifau_auth_email', 'sifau_device_id'];
                    protectedKeys.forEach(k => {
                      const v = localStorage.getItem(k);
                      if (v) preserve[k] = v;
                    });
                    
                    localStorage.clear();
                    Object.entries(preserve).forEach(([k, v]) => localStorage.setItem(k, v));
                    applyTheme('default');
                    applyAccessibility(DEFAULT_SETTINGS);
                    setSettings(DEFAULT_SETTINGS);
                    onThemeChange('default');
                    showToast('🗑️ Dados resetados. Sua conta foi mantida.');
                    setTimeout(() => window.location.reload(), 1500);
                  }
                }}
                className="flex-1 rounded-xl py-2.5 md:py-3 text-xs md:text-sm font-medium flex items-center justify-center gap-1.5 bg-red-50 text-red-600 transition hover:bg-red-100"
              >
                <AlertTriangle size={14} /> Resetar Tudo
              </button>
            </div>
          </div>
        </ExpandableSection>

        {/* ========== SUPPORT ========== */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HeadphonesIcon size={20} style={{ color: 'var(--text-muted)' }} />
            <h3 className="text-base md:text-lg font-bold" style={{ color: 'var(--text-heading)' }}>Suporte</h3>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="p-4 md:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-orange-100 rounded-full p-2">
                  <AlertTriangle size={20} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-sm md:text-base font-semibold" style={{ color: 'var(--text-heading)' }}>Central de Suporte</p>
                  <p className="text-[10px] md:text-xs text-orange-600 font-medium">🔴 Temporariamente indisponível</p>
                </div>
              </div>
              <p className="text-xs md:text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                O suporte técnico via chat e ligação está em manutenção. Utilize os canais alternativos abaixo para entrar em contato.
              </p>

              <div className="space-y-2">
                <button disabled className="w-full rounded-xl py-3 md:py-4 font-medium text-sm md:text-base cursor-not-allowed flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                  <HeadphonesIcon size={18} /> Chat ao Vivo — Indisponível
                </button>
                <button disabled className="w-full rounded-xl py-3 md:py-4 font-medium text-sm md:text-base cursor-not-allowed flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-muted)' }}>
                  <Phone size={18} /> Ligação — Indisponível
                </button>
              </div>
            </div>

            <div className="border-t p-4 md:p-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--input-bg)' }}>
              <p className="text-xs md:text-sm font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>📬 Canais Alternativos:</p>
              <div className="space-y-3">
                {/* Email */}
                <a
                  href="mailto:douglasgabriel9628@gmail.com"
                  className="flex items-start gap-3 rounded-lg p-3 transition border"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  <div className="bg-blue-100 rounded-lg p-2 shrink-0">
                    <Mail size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>E-mail</p>
                    <p className="text-xs font-mono truncate" style={{ color: 'var(--accent-primary)' }}>douglasgabriel9628@gmail.com</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Temporário</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Resposta em até 48h</span>
                    </div>
                  </div>
                  <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0 mt-1" />
                </a>

                {/* Phone */}
                <a
                  href="tel:+5581984776800"
                  className="flex items-start gap-3 rounded-lg p-3 transition border"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  <div className="bg-green-100 rounded-lg p-2 shrink-0">
                    <Phone size={18} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Telefone / WhatsApp</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--accent-primary)' }}>(81) 98477-6800</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Seg-Sex, 8h às 17h</p>
                  </div>
                  <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0 mt-1" />
                </a>

                {/* Other Project */}
                <a
                  href="https://douglas-sketch.github.io/eco-verify/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-lg p-3 transition border"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  <div className="bg-purple-100 rounded-lg p-2 shrink-0">
                    <Globe size={18} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Conheça Outro Projeto Meu</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--accent-primary)' }}>douglas-sketch.github.io/eco-verify</p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>EcoVerify — Veja mais do que já desenvolvi 🚀</p>
                  </div>
                  <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} className="shrink-0 mt-1" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ========== DANGER ZONE ========== */}
        {authEmail && authEmail !== 'anonymous' && onDeleteAccount && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-red-500" />
              <h3 className="text-base md:text-lg font-bold text-red-600">Zona de Perigo</h3>
            </div>
            <div className="rounded-xl border-2 border-red-200 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="p-4 md:p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="bg-red-100 rounded-lg p-2 shrink-0 mt-0.5">
                    <Trash2 size={20} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-bold text-red-700">Excluir Minha Conta</p>
                    <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Ao solicitar a exclusão, sua conta será <strong>desativada imediatamente</strong> e todos os seus dados serão apagados.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg p-3 bg-red-50 border border-red-200 mb-4">
                  <p className="text-xs md:text-sm text-red-800 font-medium mb-2">⚠️ O que acontece ao excluir:</p>
                  <ul className="text-xs md:text-sm text-red-700 space-y-1.5">
                    <li className="flex items-start gap-2"><span>•</span> Todas as suas denúncias serão removidas</li>
                    <li className="flex items-start gap-2"><span>•</span> Seu histórico de uso será apagado</li>
                    <li className="flex items-start gap-2"><span>•</span> Configurações e preferências serão perdidas</li>
                    <li className="flex items-start gap-2"><span>•</span> Você será desconectado imediatamente</li>
                  </ul>
                </div>

                <div className="rounded-lg p-3 bg-blue-50 border border-blue-200 mb-4">
                  <p className="text-xs md:text-sm text-blue-800 font-medium mb-1">🔄 Período de recuperação: 30 dias</p>
                  <p className="text-xs text-blue-700">
                    Após a exclusão, você tem <strong>30 dias</strong> para recuperar sua conta. 
                    Basta entrar em contato com o suporte informando seu e-mail. 
                    Após 30 dias, a exclusão será <strong>permanente e irreversível</strong>.
                  </p>
                  <p className="text-[10px] text-blue-600 mt-2">
                    📧 Contato: douglasgabriel9628@gmail.com | 📞 (81) 98477-6800
                  </p>
                </div>

                <button
                  onClick={() => {
                    const confirmText = prompt(
                      `⚠️ ATENÇÃO: Esta ação vai excluir sua conta.\n\nSeu e-mail: ${authEmail}\n\nDigite "EXCLUIR" para confirmar:`
                    );
                    if (confirmText?.trim().toUpperCase() === 'EXCLUIR') {
                      onDeleteAccount();
                      showToast('🗑️ Conta agendada para exclusão. Você tem 30 dias para recuperá-la.');
                    } else if (confirmText !== null) {
                      showToast('❌ Texto incorreto. Exclusão cancelada.');
                    }
                  }}
                  className="w-full rounded-xl py-3 md:py-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm md:text-base flex items-center justify-center gap-2 transition"
                >
                  <Trash2 size={18} /> Solicitar Exclusão da Conta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========== ABOUT ========== */}
        <ExpandableSection title="Sobre o SIFAU" icon={<Info size={20} />}>
          <div className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Versão', value: '2.0.26' },
                { label: 'Build', value: '2026.01.15' },
                { label: 'Plataforma', value: 'PWA Web' },
                { label: 'Licença', value: 'Pública' },
              ].map((item, i) => (
                <div key={i} className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--input-bg)' }}>
                  <p className="text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  <p className="text-sm md:text-base font-bold" style={{ color: 'var(--text-heading)' }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Criador */}
            <div className="rounded-xl p-4 md:p-5 border" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                  DG
                </div>
                <div>
                  <p className="text-sm md:text-base font-bold" style={{ color: 'var(--text-heading)' }}>Douglas Gabriel</p>
                  <p className="text-[10px] md:text-xs" style={{ color: 'var(--accent-primary)' }}>Idealizador, Desenvolvedor e Comandante do Projeto</p>
                </div>
              </div>
              <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>
                O SIFAU foi criado, desenvolvido, atualizado e comandado por <strong style={{ color: 'var(--text-heading)' }}>Douglas Gabriel</strong>. 
                Todo o conceito, arquitetura, design de interface, regras de negócio e implementação técnica foram 
                idealizados e dirigidos por ele, com o objetivo de modernizar a fiscalização urbana e ambiental.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Idealização', 'Arquitetura', 'UI/UX Design', 'Desenvolvimento', 'Banco de Dados', 'Deploy'].map(role => (
                  <span key={role} className="text-[10px] md:text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)' }}>
                    {role}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg p-3 md:p-4" style={{ backgroundColor: 'var(--input-bg)' }}>
              <p className="text-xs md:text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Tecnologias</p>
              <div className="flex flex-wrap gap-1.5">
                {['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Recharts', 'Supabase', 'Vite', 'PWA'].map(tech => (
                  <span key={tech} className="text-[10px] md:text-xs border rounded-full px-2.5 py-1 font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg p-3 md:p-4" style={{ backgroundColor: 'var(--input-bg)' }}>
              <p className="text-xs md:text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sobre o Projeto</p>
              <p className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>
                O SIFAU é um sistema completo de fiscalização urbana que conecta cidadãos, fiscais de campo e gerentes em tempo real. 
                Permite denúncias anônimas, designação de tarefas, emissão de multas, geração de relatórios técnicos e 
                acompanhamento de produtividade — tudo em uma plataforma mobile-first acessível por qualquer dispositivo.
              </p>
            </div>

            <div className="text-center pt-2">
              <UserCheck size={20} className="mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
              <p className="text-[10px] md:text-xs" style={{ color: 'var(--text-muted)' }}>
                © 2026 SIFAU — Todos os direitos reservados<br />
                Criado e comandado por Douglas Gabriel
              </p>
            </div>
          </div>
        </ExpandableSection>
      </div>

      <ToastOverlay />
    </motion.div>
  );
}
