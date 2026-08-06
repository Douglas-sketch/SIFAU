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

export type OrigemOS = 'preventiva' | 'denuncia' | 'oficio' | 'ci' | 'gestao';
export type StatusOS = 'aberta' | 'em_vistoria' | 'concluida' | 'cancelada';
export type OrgaoApoio = 'policia_militar' | 'guarda_municipal' | 'outro';
export type StatusVistoria = 'em_andamento' | 'finalizada';
export type CienciaStatus = 'assinou' | 'recusou' | 'ausente';

export interface PrefeituraConfig {
  id: string;
  nome_prefeitura: string;
  legislacao_aplicavel: string[];
}

export interface OrdemServico {
  id: string;
  numero_os: string;
  origem_os: OrigemOS;
  denuncia_id: string | null;
  requerente: string;
  gerente_id: string;
  fiscal_id: string | null;
  apoio_operacional: boolean;
  orgao_apoio: OrgaoApoio | null;
  orgao_apoio_outro: string | null;
  servico_descricao: string;
  legislacao_aplicavel: string[];
  endereco: string;
  latitude: number | null;
  longitude: number | null;
  data_emissao: string;
  prazo_resposta: string;
  status: StatusOS;
  criado_em: string;
  atualizado_em: string;
}

export interface AcaoFiscalizacao {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
}

export interface TipoInfracao {
  id: string;
  artigo_legal: string;
  descricao: string;
  valor_base: number;
}

export interface Vistoria {
  id: string;
  os_id: string;
  fiscal_id: string;
  iniciada_em: string;
  finalizada_em: string | null;
  geo_inicio_lat: number | null;
  geo_inicio_lng: number | null;
  geo_inicio_precisao_m: number | null;
  relatorio: string | null;
  fotos: string[];
  status: StatusVistoria;
  criado_em: string;
}

export interface AutoInfracao {
  id: string;
  os_id: string;
  tipo_infracao_id: string;
  valor_multa: number;
  motivo: string | null;
  autuado_nome: string | null;
  autuado_documento: string | null;
  ciencia_status: CienciaStatus;
  testemunha_nome: string | null;
  criado_em: string;
}

export const ORIGEM_OS_LABEL: Record<OrigemOS, string> = {
  preventiva: 'Preventiva',
  denuncia: 'Denúncia',
  oficio: 'Ofício',
  ci: 'CI',
  gestao: 'Gestão',
};

export const STATUS_OS_LABEL: Record<StatusOS, string> = {
  aberta: 'Aberta',
  em_vistoria: 'Em Vistoria',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const STATUS_OS_COLOR: Record<StatusOS, string> = {
  aberta: 'bg-blue-100 text-blue-700',
  em_vistoria: 'bg-amber-100 text-amber-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-200 text-gray-600',
};

export const ORGAO_APOIO_LABEL: Record<OrgaoApoio, string> = {
  policia_militar: 'Polícia Militar',
  guarda_municipal: 'Guarda Municipal',
  outro: 'Outro',
};

export const CIENCIA_LABEL: Record<CienciaStatus, string> = {
  assinou: 'Assinou',
  recusou: 'Recusou assinar',
  ausente: 'Ausente',
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
