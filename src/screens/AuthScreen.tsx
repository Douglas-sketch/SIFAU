import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ROLE_LABEL, ROLE_DESCRIPTION, type UserRole } from '@/lib/types';
import { ShieldCheck, Mail, Lock, User, Phone, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES: UserRole[] = ['cidadao', 'fiscal', 'gestor', 'auditor'];

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bairro, setBairro] = useState('');
  const [role, setRole] = useState<UserRole>('cidadao');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      } else {
        if (nome.trim().length < 2) {
          setError('Informe seu nome completo.');
          setLoading(false);
          return;
        }
        const { error } = await signUp({ email, password, nome, role, telefone, bairro });
        if (error) setError(error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-grid bg-secondary/30 p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/10" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SIFAU</h1>
            <p className="text-sm text-muted-foreground">Fiscalização e Atendimento Urbano</p>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex rounded-lg bg-muted p-1">
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
                  mode === 'login' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                )}
              >
                Entrar
              </button>
              <button
                onClick={() => { setMode('signup'); setError(null); }}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
                  mode === 'signup' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                )}
              >
                Criar conta
              </button>
            </div>
            <CardTitle className="pt-2 text-lg">
              {mode === 'login' ? 'Acesse sua conta' : 'Cadastre-se no SIFAU'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Use seu e-mail e senha para continuar.'
                : 'Escolha seu perfil e comece a participar.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="space-y-2">
                    <Label>Qual seu perfil?</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={cn(
                            'rounded-lg border p-2.5 text-left transition-all',
                            role === r
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-border hover:border-primary/40'
                          )}
                        >
                          <p className="text-sm font-medium">{ROLE_LABEL[r]}</p>
                          <p className="text-[10px] leading-tight text-muted-foreground">
                            {ROLE_DESCRIPTION[r]}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} className="pl-9" placeholder="Seu nome" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="telefone">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} className="pl-9" placeholder="(81) 9…" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bairro">Bairro</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} className="pl-9" placeholder="Boa Viagem" />
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="voce@exemplo.com" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="Mínimo 6 caracteres" required minLength={6} />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Plataforma municipal de fiscalização urbana · LGPD compliant
        </p>
      </div>
    </div>
  );
}
