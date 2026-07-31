import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, LoadingState } from '@/components/States';
import type { StatusLog, Profile, Occurrence } from '@/lib/types';
import { STATUS_LABEL, ROLE_LABEL, type UserRole, type OccurrenceStatus } from '@/lib/types';
import { History, Users, Download, ShieldCheck, Lock, Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  onOpenDetail: (id: string) => void;
}

export function AuditorPanel({ onOpenDetail }: Props) {
  const [tab, setTab] = useState<'trilha' | 'usuarios'>('trilha');
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: l } = await supabase.from('occurrence_status_log').select('*').order('changed_at', { ascending: false }).limit(200);
      setLogs((l as StatusLog[]) ?? []);
      const { data: u } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setUsers((u as Profile[]) ?? []);
      const { data: o } = await supabase.from('occurrences').select('*').order('created_at', { ascending: false }).limit(100);
      setOccurrences((o as Occurrence[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (statusFilter && l.to_status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return l.occurrence_id.toLowerCase().includes(s) || (l.note ?? '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [logs, search, statusFilter]);

  async function toggleUserActive(uid: string, ativo: boolean) {
    const { error } = await supabase.from('profiles').update({ ativo: !ativo }).eq('id', uid);
    if (error) { toast.error('Erro ao atualizar usuário'); return; }
    setUsers((prev) => prev.map((u) => u.id === uid ? { ...u, ativo: !ativo } : u));
    toast.success(`Usuário ${ativo ? 'desativado' : 'ativado'}.`);
  }

  async function changeRole(uid: string, role: UserRole) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', uid);
    if (error) { toast.error('Erro ao alterar papel'); return; }
    setUsers((prev) => prev.map((u) => u.id === uid ? { ...u, role } : u));
    toast.success('Papel atualizado.');
  }

  async function exportSigned() {
    const rows = logs.map((l) => [l.id, l.occurrence_id, l.from_status, l.to_status, l.changed_by, l.changed_at, l.ip_address, l.geo, l.note]);
    const content = rows.map((r) => r.map((c) => String(c ?? '')).join('|')).join('\n');
    const encoder = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', encoder.encode(content));
    const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const { error } = await supabase.from('audit_exports').insert({
      exported_by: (await supabase.auth.getUser()).data.user?.id,
      row_count: rows.length,
      content_hash: hash,
    });
    if (error) { toast.error('Erro ao registrar exportação'); return; }
    const blob = new Blob([`# SIFAU — Exportação de Auditoria\n# Hash SHA-256: ${hash}\n# Gerado em: ${new Date().toISOString()}\n# Registros: ${rows.length}\n\n${content}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sifau-auditoria-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Trilha exportada com hash assinado.');
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
        <Lock className="h-4 w-4 shrink-0" />
        <span>Modo Auditor: acesso somente-leitura a toda a trilha. Nenhuma alteração em ocorrências é permitida.</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {([['trilha','Trilha de auditoria'],['usuarios','Usuários']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn('rounded-md px-4 py-1.5 text-sm font-medium transition-colors', tab === k ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'trilha' && (
          <Button variant="outline" onClick={exportSigned}><Download className="mr-2 h-4 w-4" />Exportar trilha assinada</Button>
        )}
      </div>

      {tab === 'trilha' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por ID ou nota…" className="pl-9" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Todos os status</option>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          {filteredLogs.length === 0 ? (
            <EmptyState icon={<History className="h-10 w-10" />} title="Nenhum registro encontrado" />
          ) : (
            <Card>
              <CardContent className="pt-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2">Quando</th><th>Ocorrência</th><th>De → Para</th><th>Por</th><th>Nota</th>
                    </tr></thead>
                    <tbody>
                      {filteredLogs.slice(0, 100).map((l) => (
                        <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 text-xs">{new Date(l.changed_at).toLocaleString('pt-BR')}</td>
                          <td className="text-xs">
                            <button onClick={() => onOpenDetail(l.occurrence_id)} className="font-mono text-primary hover:underline">
                              {l.occurrence_id.slice(0, 8)}…
                            </button>
                          </td>
                          <td className="text-xs">
                            {l.from_status ? STATUS_LABEL[l.from_status as OccurrenceStatus] : '—'} → <strong>{STATUS_LABEL[l.to_status as OccurrenceStatus]}</strong>
                          </td>
                          <td className="text-xs font-mono">{l.changed_by?.slice(0, 8) ?? '—'}…</td>
                          <td className="text-xs text-muted-foreground max-w-[200px] truncate">{l.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'usuarios' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" />Gestão de usuários e permissões</CardTitle>
            <CardDescription>Ative/desative usuários e ajuste papéis.</CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <EmptyState title="Nenhum usuário cadastrado" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2">Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Ações</th>
                  </tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{u.nome}</td>
                        <td className="text-xs">{u.email}</td>
                        <td>
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          >
                            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                          </select>
                        </td>
                        <td>
                          <span className={cn('rounded-full px-2 py-0.5 text-xs', u.ativo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td>
                          <Button size="sm" variant="outline" onClick={() => toggleUserActive(u.id, u.ativo)}>
                            {u.ativo ? 'Desativar' : 'Ativar'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
