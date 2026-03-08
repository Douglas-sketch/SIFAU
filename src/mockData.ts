import { Profile, Denuncia, Relatorio, AutoInfracao, HistoricoAtividade, Mensagem } from './types';

// ═══════════════════════════════════════════════════════════
//  USUÁRIOS REAIS — SIFAU PRODUÇÃO
//  IDs alinhados com supabase-schema.sql
// ═══════════════════════════════════════════════════════════

export const mockProfiles: Profile[] = [
  // ── GERENTES ──
  {
    id: 'ger-001',
    nome: 'Marconi',
    tipo: 'gerente',
    matricula: 'GER-001',
    status_online: 'offline',
    pontos_total: 0,
    senha: 'marconi2026',
  },
  // ger-002 removido (João Lacerda)

  // ── FISCAIS ──
  {
    id: 'fsc-001',
    nome: 'Marie',
    tipo: 'fiscal',
    matricula: 'FSC-001',
    status_online: 'offline',
    lat: -8.0476,
    lng: -34.8770,
    pontos_total: 0,
    senha: 'marie2026',
  },
  {
    id: 'fsc-002',
    nome: 'Balbino',
    tipo: 'fiscal',
    matricula: 'FSC-002',
    status_online: 'offline',
    lat: -8.0530,
    lng: -34.8710,
    pontos_total: 0,
    senha: 'balbino2026',
  },
  {
    id: 'fsc-003',
    nome: 'Demétrius',
    tipo: 'fiscal',
    matricula: 'FSC-003',
    status_online: 'offline',
    lat: -8.0610,
    lng: -34.8690,
    pontos_total: 0,
    senha: 'demetrius2026',
  },
  {
    id: 'fsc-004',
    nome: 'Kamila Queiroz',
    tipo: 'fiscal',
    matricula: 'FSC-004',
    status_online: 'offline',
    lat: -8.0490,
    lng: -34.8800,
    pontos_total: 0,
    senha: 'kamila2026',
  },
  {
    id: 'fsc-005',
    nome: 'Evanisio Lopes',
    tipo: 'fiscal',
    matricula: 'FSC-005',
    status_online: 'offline',
    lat: -8.0550,
    lng: -34.8750,
    pontos_total: 0,
    senha: 'evanisio2026',
  },
  {
    id: 'fsc-006',
    nome: 'Iris',
    tipo: 'fiscal',
    matricula: 'FSC-006',
    status_online: 'offline',
    lat: -8.0580,
    lng: -34.8720,
    pontos_total: 0,
    senha: 'iris2026',
  },
  {
    id: 'fsc-007',
    nome: 'Paulo Karas',
    tipo: 'fiscal',
    matricula: 'FSC-007',
    status_online: 'offline',
    lat: -8.0620,
    lng: -34.8680,
    pontos_total: 0,
    senha: 'paulo2026',
  },
  {
    id: 'fsc-008',
    nome: 'Adriana Gondim',
    tipo: 'fiscal',
    matricula: 'FSC-008',
    status_online: 'offline',
    lat: -8.0500,
    lng: -34.8790,
    pontos_total: 0,
    senha: 'adriana2026',
  },
  {
    id: 'fsc-009',
    nome: 'André',
    tipo: 'fiscal',
    matricula: 'FSC-009',
    status_online: 'offline',
    lat: -8.0560,
    lng: -34.8730,
    pontos_total: 0,
    senha: 'andre2026',
  },
  {
    id: 'fsc-010',
    nome: 'Rebeca Cavalcanti',
    tipo: 'fiscal',
    matricula: 'FSC-010',
    status_online: 'offline',
    lat: -8.0540,
    lng: -34.8760,
    pontos_total: 0,
    senha: 'rebeca2026',
  },
  {
    id: 'fsc-011',
    nome: 'Gissieri',
    tipo: 'fiscal',
    matricula: 'FSC-011',
    status_online: 'offline',
    lat: -8.0510,
    lng: -34.8740,
    pontos_total: 0,
    senha: 'gissieri2026',
  },
  {
    id: 'fsc-012',
    nome: 'Edson',
    tipo: 'fiscal',
    matricula: 'FSC-012',
    status_online: 'offline',
    lat: -8.0525,
    lng: -34.8755,
    pontos_total: 0,
    senha: 'edson2026',
  },
];

// ═══════════════════════════════════════════════════════════
//  DADOS ZERADOS — Sistema limpo para produção
// ═══════════════════════════════════════════════════════════

export const mockDenuncias: Denuncia[] = [];
export const mockRelatorios: Relatorio[] = [];
export const mockAutos: AutoInfracao[] = [];
export const mockHistorico: HistoricoAtividade[] = [];
export const mockMensagens: Mensagem[] = [];
