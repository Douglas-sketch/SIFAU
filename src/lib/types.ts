export type UserRole = 'cidadao' | 'fiscal' | 'gestor' | 'auditor';

export type OccurrenceStatus =
  | 'aberta'
  | 'triada'
  | 'atribuida'
  | 'em_vistoria'
  | 'resolvida'
  | 'arquivada'
  | 'escalonada';

export type UrgencyLevel = 1 | 2 | 3 | 4;

export type MediaKind = 'foto' | 'video';

export type CommentVisibility = 'public' | 'internal';

export type InspectionAction =
  | 'notificacao'
  | 'multa'
  | 'encaminhamento'
  | 'orientacao'
  | 'sem_acao';

export interface Profile {
  id: string;
  role: UserRole;
  nome: string;
  email: string;
  telefone?: string | null;
  bairro?: string | null;
  especialidade?: string | null;
  region?: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Occurrence {
  id: string;
  citizen_id: string;
  category: string;
  subcategory?: string | null;
  description: string;
  status: OccurrenceStatus;
  urgency_score: UrgencyLevel;
  lat: number;
  lng: number;
  bairro?: string | null;
  address?: string | null;
  created_at: string;
  sla_deadline: string;
  duplicate_of?: string | null;
  archived: boolean;
  archive_reason?: string | null;
  assigned_fiscal_id?: string | null;
}

export interface OccurrenceMedia {
  id: string;
  occurrence_id: string;
  url: string;
  type: MediaKind;
  uploaded_by: string;
  created_at: string;
}

export interface StatusLog {
  id: string;
  occurrence_id: string;
  from_status: OccurrenceStatus | null;
  to_status: OccurrenceStatus;
  changed_by: string;
  changed_by_name?: string | null;
  changed_at: string;
  ip_address?: string | null;
  geo?: string | null;
  note?: string | null;
}

export interface Inspection {
  id: string;
  occurrence_id: string;
  fiscal_id: string;
  arrival_at: string;
  arrival_lat?: number | null;
  arrival_lng?: number | null;
  report_json: Record<string, unknown>;
  action_taken: InspectionAction;
  fine_amount?: number | null;
  fine_process_number?: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  occurrence_id: string;
  author_id: string;
  author_name?: string | null;
  visibility: CommentVisibility;
  text: string;
  created_at: string;
}

export interface SlaRule {
  id: string;
  category: string;
  max_hours: number;
}

export interface FiscalStat {
  fiscal_id: string;
  fiscal_name: string;
  sla_compliance_pct: number;
  avg_rating: number;
  total_resolved: number;
  active_assigned: number;
}

export interface AIClassificationResult {
  category: string;
  subcategory: string | null;
  urgency: UrgencyLevel;
  confidence: number;
  duplicate_suspected: boolean;
  duplicate_of?: string | null;
  rationale: string;
}

export const CATEGORIES = [
  'Buraco na via',
  'Poluição sonora',
  'Comércio irregular',
  'Descarte irregular de lixo',
  'Obra sem alvará',
  'Iluminação pública',
  'Sinalização',
  'Esgoto / Drenagem',
  'Outro',
] as const;

export const SUBCATEGORIES: Record<string, string[]> = {
  'Buraco na via': ['Via local', 'Avenida', 'Rodovia', 'Trecho de obra'],
  'Poluição sonora': ['Estabelecimento', 'Obra', 'Evento', 'Veículo'],
  'Comércio irregular': ['Sem alvará', 'Ambulante', 'Produto irregular', 'Ocupação de calçada'],
  'Descarte irregular de lixo': ['Entulho', 'Resíduo orgânico', 'Eletrônico', 'Volume grande'],
  'Obra sem alvará': ['Residencial', 'Comercial', 'Reforma', 'Demolição'],
  'Iluminação pública': ['Lâmpada queimada', 'Poste danificado', 'Fiação exposta', 'Sem iluminação'],
  'Sinalização': ['Placa danificada', 'Faixa apagada', 'Semáforo', 'Pintura de solo'],
  'Esgoto / Drenagem': ['Vazamento', 'Entupimento', 'Alagamento', 'Esgunto a céu aberto'],
  Outro: ['Não especificado'],
};

export const STATUS_LABEL: Record<OccurrenceStatus, string> = {
  aberta: 'Aberta',
  triada: 'Triada',
  atribuida: 'Atribuída',
  em_vistoria: 'Em vistoria',
  resolvida: 'Resolvida',
  arquivada: 'Arquivada',
  escalonada: 'Escalonada',
};

export const STATUS_ORDER: OccurrenceStatus[] = [
  'aberta',
  'triada',
  'atribuida',
  'em_vistoria',
  'resolvida',
  'arquivada',
];

export const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  1: 'Baixa',
  2: 'Média',
  3: 'Alta',
  4: 'Crítica',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  cidadao: 'Cidadão',
  fiscal: 'Fiscal',
  gestor: 'Gestor Municipal',
  auditor: 'Auditor / Admin',
};

export const ROLE_DESCRIPTION: Record<UserRole, string> = {
  cidadao: 'Reporta ocorrências urbanas e acompanha o andamento.',
  fiscal: 'Recebe e vistoria ocorrências atribuídas em campo.',
  gestor: 'Acompanha KPIs, redistribui casos e define SLAs.',
  auditor: 'Acesso somente-leitura à trilha de auditoria.',
};
