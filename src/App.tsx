import { useState, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { AuthScreen } from '@/screens/AuthScreen';
import { CitizenHome } from '@/screens/CitizenHome';
import { OpenOccurrenceScreen } from '@/screens/OpenOccurrenceScreen';
import { OccurrenceDetail } from '@/screens/OccurrenceDetail';
import { FiscalHome } from '@/screens/FiscalHome';
import { FiscalInspection } from '@/screens/FiscalInspection';
import { ManagerDashboard } from '@/screens/ManagerDashboard';
import { AuditorPanel } from '@/screens/AuditorPanel';
import { AppShell } from '@/components/AppShell';
import { LoadingState } from '@/components/States';
import { ROLE_LABEL } from '@/lib/types';
import type { UserRole } from '@/lib/types';
import { Home, Plus, ClipboardList, Camera, LayoutDashboard, ShieldCheck, FileText, ArrowLeft } from 'lucide-react';

type CitizenView = 'home' | 'new' | 'detail';
type FiscalView = 'home' | 'inspection' | 'detail';
type ManagerView = 'dashboard' | 'detail';
type AuditorView = 'panel' | 'detail';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster richColors position="top-center" />
        <Router />
      </AuthProvider>
    </ErrorBoundary>
  );
}

function Router() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState label="Carregando SIFAU…" />
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen />;
  }

  return <RoleRouter role={profile.role} />;
}

function RoleRouter({ role }: { role: UserRole }) {
  const [detailId, setDetailId] = useState<string | null>(null);

  if (role === 'cidadao') return <CitizenApp onOpenDetail={(id) => setDetailId(id)} detailId={detailId} onBackDetail={() => setDetailId(null)} />;
  if (role === 'fiscal') return <FiscalApp onOpenDetail={(id) => setDetailId(id)} detailId={detailId} onBackDetail={() => setDetailId(null)} />;
  if (role === 'gestor') return <ManagerApp onOpenDetail={(id) => setDetailId(id)} detailId={detailId} onBackDetail={() => setDetailId(null)} />;
  if (role === 'auditor') return <AuditorApp onOpenDetail={(id) => setDetailId(id)} detailId={detailId} onBackDetail={() => setDetailId(null)} />;
  return null;
}

function CitizenApp({ onOpenDetail, detailId, onBackDetail }: { onOpenDetail: (id: string) => void; detailId: string | null; onBackDetail: () => void }) {
  const [view, setView] = useState<CitizenView>('home');
  const nav = [
    { key: 'home', label: 'Início', icon: <Home className="h-4 w-4" /> },
    { key: 'new', label: 'Nova ocorrência', icon: <Plus className="h-4 w-4" /> },
  ];

  const active = detailId ? 'detail' : view;
  const title = active === 'detail' ? 'Detalhe da ocorrência' : active === 'new' ? 'Registrar ocorrência' : 'Minhas ocorrências';

  return (
    <AppShell navItems={nav} active={active === 'detail' ? 'home' : active} onNavigate={(k) => { setView(k as CitizenView); onBackDetail(); }} title={title} subtitle="Reporte problemas urbanos e acompanhe a resolução.">
      {detailId ? (
        <OccurrenceDetail occurrenceId={detailId} onBack={onBackDetail} />
      ) : view === 'home' ? (
        <CitizenHome onOpenNew={() => setView('new')} onOpenDetail={onOpenDetail} />
      ) : (
        <OpenOccurrenceScreen onCreated={(id) => { setView('home'); onOpenDetail(id); }} onCancel={() => setView('home')} />
      )}
    </AppShell>
  );
}

function FiscalApp({ onOpenDetail, detailId, onBackDetail }: { onOpenDetail: (id: string) => void; detailId: string | null; onBackDetail: () => void }) {
  const [view, setView] = useState<FiscalView>('home');
  const nav = [
    { key: 'home', label: 'Início', icon: <Home className="h-4 w-4" /> },
    { key: 'inspection', label: 'Vistoria em campo', icon: <Camera className="h-4 w-4" /> },
  ];

  const active = detailId ? 'detail' : view;
  const title = active === 'detail' ? 'Detalhe da ocorrência' : active === 'inspection' ? 'Vistoria em campo' : 'Painel do fiscal';

  return (
    <AppShell navItems={nav} active={active === 'detail' ? 'home' : active} onNavigate={(k) => { setView(k as FiscalView); onBackDetail(); }} title={title} subtitle="Fila priorizada e vistoria offline-first.">
      {detailId ? (
        <OccurrenceDetail occurrenceId={detailId} onBack={onBackDetail} />
      ) : view === 'home' ? (
        <FiscalHome onOpenDetail={onOpenDetail} onOpenInspection={() => setView('inspection')} />
      ) : (
        <FiscalInspection onBack={() => setView('home')} />
      )}
    </AppShell>
  );
}

function ManagerApp({ onOpenDetail, detailId, onBackDetail }: { onOpenDetail: (id: string) => void; detailId: string | null; onBackDetail: () => void }) {
  const [view, setView] = useState<ManagerView>('dashboard');
  const nav = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  ];

  const title = detailId ? 'Detalhe da ocorrência' : 'Dashboard municipal';

  return (
    <AppShell navItems={nav} active={detailId ? 'dashboard' : view} onNavigate={(k) => { setView(k as ManagerView); onBackDetail(); }} title={title} subtitle="KPIs, heatmap, SLA e ranking de fiscais.">
      {detailId ? (
        <OccurrenceDetail occurrenceId={detailId} onBack={onBackDetail} />
      ) : (
        <ManagerDashboard onOpenDetail={onOpenDetail} />
      )}
    </AppShell>
  );
}

function AuditorApp({ onOpenDetail, detailId, onBackDetail }: { onOpenDetail: (id: string) => void; detailId: string | null; onBackDetail: () => void }) {
  const [view, setView] = useState<AuditorView>('panel');
  const nav = [
    { key: 'panel', label: 'Trilha de auditoria', icon: <ShieldCheck className="h-4 w-4" /> },
  ];

  const title = detailId ? 'Detalhe da ocorrência' : 'Painel do auditor';

  return (
    <AppShell navItems={nav} active={detailId ? 'panel' : view} onNavigate={(k) => { setView(k as AuditorView); onBackDetail(); }} title={title} subtitle="Acesso somente-leitura à trilha imutável.">
      {detailId ? (
        <OccurrenceDetail occurrenceId={detailId} onBack={onBackDetail} />
      ) : (
        <AuditorPanel onOpenDetail={onOpenDetail} />
      )}
    </AppShell>
  );
}

export default App;
