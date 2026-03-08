export type UserRole = 'cidadao' | 'fiscal' | 'gerente';
export type DenunciaStatus = 'pendente' | 'designada' | 'em_vistoria' | 'aguardando_aprovacao' | 'concluida' | 'devolvida';
export type DenunciaTipo = 'Construção Irregular' | 'Ocupação Irregular' | 'Comércio Irregular' | 'Desmatamento' | 'Lixo/Entulho' | 'Outros';

export interface Profile {
  id: string;
  nome: string;
  tipo: UserRole;
  matricula?: string;
  status_online: 'em_campo' | 'offline' | 'online';
  lat?: number;
  lng?: number;
  pontos_total: number;
  senha?: string;
}

export interface Denuncia {
  id: string;
  protocolo: string;
  tipo: DenunciaTipo;
  endereco: string;
  lat: number;
  lng: number;
  descricao: string;
  status: DenunciaStatus;
  sla_dias: number;
  fiscal_id?: string;
  gerente_id?: string;
  denunciante_nome?: string;
  denunciante_anonimo: boolean;
  created_at: string;
  updated_at: string;
  pontos_provisorio: number;
  fotos: string[];
  motivo_rejeicao?: string;
  auth_email?: string;
}

export interface Relatorio {
  id: string;
  denuncia_id: string;
  fiscal_id: string;
  texto: string;
  assinatura_base64?: string;
  fotos: string[];
  os_2_0: boolean;
  os_4_0: boolean;
  created_at: string;
}

export interface AutoInfracao {
  id: string;
  denuncia_id: string;
  fiscal_id: string;
  valor: number;
  tipo: string;
  embargo: boolean;
  created_at: string;
}

export interface HistoricoAtividade {
  id: string;
  fiscal_id: string;
  denuncia_id: string;
  tipo_acao: string;
  pontos: number;
  descricao: string;
  created_at: string;
}

export interface Mensagem {
  id: string;
  de_id: string;
  para_id: string;
  de_nome: string;
  para_nome: string;
  texto: string;
  lida: boolean;
  created_at: string;
  denuncia_id?: string;
}

export interface OSItem {
  codigo: string;
  descricao: string;
  pontos: number;
}

export const OS_TABLE: OSItem[] = [
  { codigo: '1.0', descricao: 'O.S. não cumprida por embaraço na vistoria (endereço não encontrado, solicitante não localizado…)', pontos: 5 },
  { codigo: '2.0', descricao: 'Ordem de serviço cumprida', pontos: 50 },
  { codigo: '3.0', descricao: 'Auto de infração por violação da legislação Ambiental', pontos: 40 },
  { codigo: '4.0', descricao: 'Notificações (Obras, Comércios e Indústrias e demais Irregularidades)', pontos: 50 },
  { codigo: '5.0', descricao: 'Auto de Infração por violação da legislação Territorial urbana e de Atividades Comerciais', pontos: 10 },
  { codigo: '6.0', descricao: 'Participação em ações preventivas da Fiscalização Ambiental', pontos: 30 },
  { codigo: '7.0', descricao: 'Atividades Educativas: Palestras em escolas, ações preventivas nas comunidades e atividades correlatas', pontos: 40 },
  { codigo: '8.0', descricao: 'Embargo Administrativo', pontos: 10 },
  { codigo: '9.0', descricao: 'Parecer de Processos judiciais e do Ministério Público Estadual e Federal', pontos: 10 },
  { codigo: '10.0', descricao: 'Acompanhamento em desocupações, demolições', pontos: 10 },
  { codigo: '11.0', descricao: 'Fiscalização extraordinária, com dedicação exclusiva, por determinação das chefias, por dia (jornada integral)', pontos: 50 },
  { codigo: '12.0', descricao: 'Fiscalizações noturnas por diligência, em feriados ou finais de semana. Plantão fiscal em cumprimento da escala normal ou por convocação de chefias, por dia (jornada integral)', pontos: 80 },
];

export const TIPO_MULTA_VALORES: Record<string, { min: number; max: number }> = {
  'Construção Irregular': { min: 321.67, max: 13785.74 },
  'Ocupação Irregular': { min: 114.88, max: 11488.00 },
  'Comércio Irregular': { min: 114.88, max: 3446.43 },
  'Desmatamento': { min: 114.88, max: 16083.36 },
  'Lixo/Entulho': { min: 114.88, max: 3446.43 },
  'Outros': { min: 229.76, max: 16083.36 },
};
