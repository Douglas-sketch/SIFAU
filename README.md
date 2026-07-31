# SIFAU — Sistema de Fiscalização e Atendimento Urbano

Plataforma municipal que conecta **Cidadão**, **Fiscal**, **Gestor Municipal** e **Auditor** em um fluxo único de reporte, triagem, vistoria e resolução de ocorrências urbanas — com rastreabilidade total e prestação de contas auditável.

## 🎯 Problema que resolve

Reduzir o tempo entre "problema relatado" e "problema resolvido", com rastreabilidade total que a prefeitura pode mostrar publicamente como prestação de contas.

## 📱 Papéis de usuário (4)

| Papel | Função |
|---|---|
| **Cidadão** | Registra ocorrências com foto/geo, acompanha status, avalia atendimento, ganha selo de colaborador |
| **Fiscal** | Recebe fila priorizada (não escolhe livremente), vistoria em campo com modo offline-first, registra laudo |
| **Gestor Municipal** | Dashboard com KPIs/heatmap, redistribui ocorrências travadas, define SLA por categoria, ranking de fiscais |
| **Auditor/Admin** | Acesso somente-leitura à trilha imutável de auditoria, gerencia usuários/permissões, exporta logs assinados |

## 🏗 Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui (Radix UI)
- **Backend/DB:** Supabase (Postgres + Auth + Storage + Edge Functions + Realtime)
- **Mobile:** Capacitor (câmera, GPS, notificações push) — config pronta
- **Mapas:** Heatmap SVG interno + suporte para Mapbox (token opcional)
- **IA:** Edge Function com Gemini API (classificação, urgência, detecção de duplicatas)

## 📂 Estrutura do projeto

```
SIFAU/
├── index.html                    # Entry point (pt-BR, PWA meta)
├── capacitor.config.json         # Capacitor (mobile wrapper)
├── components.json               # shadcn/ui config
├── public/
│   ├── manifest.json             # PWA manifest
│   └── sw.js                     # Service worker (offline-first)
├── src/
│   ├── main.tsx                  # Entry point React
│   ├── App.tsx                   # Router + role-based layout
│   ├── index.css                 # Tailwind + design tokens (cores institucionais)
│   ├── components/
│   │   ├── AppShell.tsx          # Layout responsivo com sidebar + header
│   │   ├── ErrorBoundary.tsx     # Error boundary com fallback
│   │   ├── MapHeatmap.tsx        # Heatmap SVG interativo (sem dependência de mapa)
│   │   ├── OccurrenceCard.tsx    # Card reutilizável de ocorrência
│   │   ├── SLATimer.tsx          # Timer de SLA com barra de progresso
│   │   ├── StatusBadge.tsx       # Badge de status + urgência
│   │   ├── States.tsx            # EmptyState + LoadingState
│   │   └── ui/                   # 40+ componentes shadcn/ui
│   ├── hooks/
│   │   └── use-toast.ts          # Toast system
│   ├── lib/
│   │   ├── auth.tsx              # Auth context (Supabase Auth + profiles)
│   │   ├── media.ts              # Upload, compressão de imagem, geolocalização
│   │   ├── supabase.ts           # Supabase client
│   │   ├── types.ts              # Todos os tipos/interfaces/constants
│   │   └── utils.ts              # cn() utility
│   └── screens/
│       ├── AuthScreen.tsx        # Login + cadastro com seleção de papel
│       ├── CitizenHome.tsx       # Home do cidadão (ocorrências + mapa público)
│       ├── OpenOccurrenceScreen.tsx  # Formulário de nova ocorrência (com IA)
│       ├── OccurrenceDetail.tsx  # Detalhe (timeline, mídia, comentários, rating)
│       ├── FiscalHome.tsx        # Fila priorizada do fiscal
│       ├── FiscalInspection.tsx  # Vistoria em campo (offline-first)
│       ├── ManagerDashboard.tsx  # Dashboard do gestor (KPIs, charts, heatmap)
│       └── AuditorPanel.tsx      # Trilha de auditoria + gestão de usuários
├── supabase/
│   ├── functions/
│   │   └── classify-occurrence/  # Edge Function (Gemini AI + heurística fallback)
│   └── migrations/
│       ├── 20260726202413_sifau_core_schema.sql        # Schema + RLS + triggers
│       ├── 20260726202535_sifau_storage_policies.sql    # Storage bucket policies
│       ├── 20260726222744_sifau_security_hardening.sql  # Search path + privilege hardening
│       └── 20260731000001_fix_fiscal_stats_sla.sql      # Correção SLA compliance view
└── .env.example                  # Variáveis de ambiente documentadas
```

## 🚀 Setup

### 1. Clonar e instalar

```bash
git clone <repo-url> SIFAU
cd SIFAU
npm install
```

### 2. Configurar Supabase

```bash
cp .env.example .env
```

Edite `.env` com:
- `VITE_SUPABASE_URL` — URL do seu projeto Supabase
- `VITE_SUPABASE_ANON_KEY` — Chave anônima pública

### 3. Executar migrações SQL

No SQL Editor do Supabase, execute as migrations na ordem:
1. `supabase/migrations/20260726202413_sifau_core_schema.sql`
2. `supabase/migrations/20260726202535_sifau_storage_policies.sql`
3. `supabase/migrations/20260726222744_sifau_security_hardening.sql`
4. `supabase/migrations/20260731000001_fix_fiscal_stats_sla.sql`

### 4. Criar bucket de Storage

No Supabase Dashboard → Storage, crie um bucket público chamado `occurrence-media`.

### 5. (Opcional) Configurar IA com Gemini

- Gere uma API key em [Google AI Studio](https://makersuite.google.com/app/apikey)
- No Supabase Dashboard → Functions → Secrets, adicione `GEMINI_API_KEY`
- Deploy a Edge Function: `supabase functions deploy classify-occurrence`
- Sem a key, o sistema usa classificação heurística local (funcional)

### 6. Desenvolvimento

```bash
npm run dev       # Servidor de desenvolvimento (Vite)
npm run build     # Build de produção
npm run typecheck # Verificação de tipos TypeScript
npm run lint      # ESLint
```

### 7. Mobile (Capacitor)

```bash
# Instalar Capacitor CLI
npm install -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios

# Build web
npm run build

# Sincronizar e abrir no Android Studio / Xcode
npx cap sync
npx cap open android   # ou: npx cap open ios
```

## 🔒 Segurança e RLS

### Row Level Security (RLS)

- **Cidadão:** lê/edita apenas suas próprias ocorrências e comentários públicos
- **Fiscal:** lê apenas ocorrências atribuídas a ele
- **Gestor:** lê tudo, edita atribuições e SLA, gerencia perfis
- **Auditor:** SELECT em todas as tabelas, nenhum INSERT/UPDATE/DELETE

### Trilha de auditoria imutável

- Tabela `occurrence_status_log` é **append-only**: `REVOKE UPDATE, DELETE` em nível de banco
- Toda mudança de status gera registro imutável com: quem, quando, de onde (IP + geo), o que mudou (de → para)
- Trigger `trg_log_status` grava automaticamente

### LGPD

- Dados pessoais do cidadão nunca aparecem no mapa público (anonimizado)
- Comentários internos do fiscal (laudo) não são visíveis ao cidadão — apenas resumo final

## 📊 Módulos funcionais

| # | Módulo | Descrição |
|---|---|---|
| 1 | Abertura de ocorrência | Formulário com foto, geo, categoria, descrição + IA de classificação |
| 2 | Triagem e priorização | Fila ordenada por urgência × espera × proximidade |
| 3 | Vistoria em campo | Modo offline-first, registro de chegada (geo), laudo, fotos antes/depois |
| 4 | Comunicação | Chat assíncrono por ocorrência (público/interno), notificações |
| 5 | Auditoria | Log imutável, exportação com hash SHA-256, gestão de usuários |
| 6 | Analytics/Dashboard | KPIs, heatmap, SLA, ranking de fiscais, alertas |
| 7 | Reputação | Selo de colaborador ativo (cidadão), reputação interna (fiscal) |

## 🎨 Design

- **Mobile-first** com dashboard desktop robusto para Gestor/Auditor
- Paleta institucional: azul (#1e40af) + verde (sucesso) + âmbar (pendente) + vermelho (SLA estourado)
- Acessibilidade: contraste AA, textos alternativos, suporte a leitor de tela
- Estados vazios e de loading tratados explicitamente

## 🔮 Pontos de integração futura

Os seguintes itens estão **estruturados no modelo de dados** mas não implementados (documentados):

- [ ] Integração real com sistema de arrecadação de multas municipais
- [ ] Envio via WhatsApp Business API (hook estruturado, sem integração paga)
- [ ] App nativo completo (Capacitor cobre MVP híbrido)
- [ ] Mapbox/Google Maps real (atualmente usa heatmap SVG)
- [ ] Notificações push nativas (estrutura pronta no Capacitor)

## 📄 Licença

Projeto municipal de código aberto.
