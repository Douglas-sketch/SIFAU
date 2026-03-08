import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, ClipboardList, Trophy, LogOut, MapPin, Clock, CheckCircle, AlertTriangle,
  FileText, DollarSign, Send, ArrowLeft, Eye, ChevronRight, Star, Pen, Plus, Camera, ImageIcon,
  FolderOpen, ChevronDown, Calendar, TrendingUp, Settings, Search, X, Printer
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Denuncia, TIPO_MULTA_VALORES } from '../types';
import Mensagens from './Mensagens';
import { PhotoGallery } from './PhotoViewer';

const statusColors: Record<string, string> = {
  designada: 'bg-blue-500',
  em_vistoria: 'bg-orange-500',
  aguardando_aprovacao: 'bg-purple-500',
  concluida: 'bg-green-500',
  pendente: 'bg-yellow-500',
  devolvida: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  designada: 'Designada',
  em_vistoria: 'Em Vistoria',
  aguardando_aprovacao: 'Aguardando Aprovação',
  concluida: 'Concluída',
  pendente: 'Pendente',
  devolvida: 'Devolvida p/ Correção',
};

function generateReportTemplate(denuncia: Denuncia, fiscalNome: string, fiscalMatricula: string): string {
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const header = `RELATÓRIO TÉCNICO DE FISCALIZAÇÃO URBANA
═══════════════════════════════════════

DADOS DA OCORRÊNCIA
Protocolo: ${denuncia.protocolo}
Tipo de Infração: ${denuncia.tipo}
Endereço: ${denuncia.endereco}
Coordenadas GPS: ${denuncia.lat.toFixed(4)}, ${denuncia.lng.toFixed(4)}
Data da Vistoria: ${dataAtual}
Horário de Chegada: ${horaAtual}
Fiscal Responsável: ${fiscalNome}
Matrícula: ${fiscalMatricula}
SLA Previsto: ${denuncia.sla_dias} dia(s)

───────────────────────────────────────`;

  const templates: Record<string, string> = {
    'Construção Irregular': `
1. OBJETO DA VISTORIA
Atender à denúncia registrada sob protocolo nº ${denuncia.protocolo}, referente a construção irregular localizada em ${denuncia.endereco}, em conformidade com o Código de Obras e Edificações municipal e legislação urbanística vigente.

2. DESCRIÇÃO DA DENÚNCIA
"${denuncia.descricao}"

3. CONSTATAÇÕES IN LOCO
Em diligência ao local indicado, foram verificadas as seguintes condições:

  a) Existência de obra em andamento: [ ] Sim  [ ] Não
  b) Alvará de construção afixado: [ ] Sim  [ ] Não  [ ] Vencido
  c) Placa com identificação do responsável técnico: [ ] Sim  [ ] Não
  d) Anotação de Responsabilidade Técnica (ART/RRT): [ ] Apresentada  [ ] Não apresentada
  e) Projeto aprovado pela Prefeitura: [ ] Sim  [ ] Não  [ ] Não verificado
  f) Conformidade com gabarito permitido: [ ] Sim  [ ] Não
  g) Respeito ao recuo obrigatório: [ ] Sim  [ ] Não
  h) Riscos estruturais aparentes: [ ] Sim  [ ] Não
  i) Presença de trabalhadores: [ ] Sim (_____ pessoas)  [ ] Não
  j) EPI dos trabalhadores: [ ] Adequado  [ ] Inadequado  [ ] N/A

4. DOCUMENTAÇÃO FOTOGRÁFICA
Registradas _____ fotografias do local, incluindo fachada, detalhes da obra e documentos afixados (quando existentes).

5. PROVIDÊNCIAS ADOTADAS
( ) Notificação emitida ao responsável
( ) Auto de infração lavrado
( ) Embargo da obra determinado
( ) Intimação para apresentação de documentos no prazo de ___ dias
( ) Outras: ___________________

6. FUNDAMENTAÇÃO LEGAL
Art. ___ da Lei Municipal nº ___/___
Código de Obras e Edificações — Art. ___
Multa prevista: R$ 321,67 a R$ 13.785,74

7. CONCLUSÃO E RECOMENDAÇÕES
Diante das constatações acima descritas, conclui-se que:
[Descrever a conclusão técnica e as recomendações]

8. OBSERVAÇÕES COMPLEMENTARES
[Informações adicionais relevantes]`,

    'Ocupação Irregular': `
1. OBJETO DA VISTORIA
Atender à denúncia registrada sob protocolo nº ${denuncia.protocolo}, referente a ocupação irregular em ${denuncia.endereco}.

2. DESCRIÇÃO DA DENÚNCIA
"${denuncia.descricao}"

3. CONSTATAÇÕES IN LOCO
  a) Tipo de ocupação: [ ] Barraca  [ ] Construção  [ ] Veículo  [ ] Entulho  [ ] Outro
  b) Área ocupada (estimativa): _____ m²
  c) Obstrução de passeio público: [ ] Total  [ ] Parcial  [ ] Sem obstrução
  d) Acessibilidade comprometida: [ ] Sim  [ ] Não
  e) Autorização/permissão municipal: [ ] Sim  [ ] Não
  f) Responsável identificado: [ ] Sim  [ ] Não

4. DOCUMENTAÇÃO FOTOGRÁFICA
Registradas _____ fotografias do local e da ocupação.

5. PROVIDÊNCIAS ADOTADAS
( ) Notificação para desocupação
( ) Auto de infração lavrado
( ) Remoção imediata solicitada

6. FUNDAMENTAÇÃO LEGAL
Código de Posturas Municipal
Multa prevista: R$ 114,88 a R$ 11.488,00

7. CONCLUSÃO E RECOMENDAÇÕES
[Descrever a conclusão técnica e as recomendações]`,

    'Comércio Irregular': `
1. OBJETO DA VISTORIA
Atender à denúncia registrada sob protocolo nº ${denuncia.protocolo}, referente a comércio irregular em ${denuncia.endereco}.

2. DESCRIÇÃO DA DENÚNCIA
"${denuncia.descricao}"

3. CONSTATAÇÕES IN LOCO
  a) Estabelecimento em funcionamento: [ ] Sim  [ ] Não
  b) Alvará de funcionamento: [ ] Sim  [ ] Não  [ ] Vencido
  c) CNPJ/MEI registrado: [ ] Sim  [ ] Não
  d) Licença sanitária: [ ] Sim  [ ] Não  [ ] N/A
  e) Condições de higiene: [ ] Adequadas  [ ] Inadequadas

4. DOCUMENTAÇÃO FOTOGRÁFICA
Registradas _____ fotografias do local.

5. PROVIDÊNCIAS ADOTADAS
( ) Notificação para regularização
( ) Auto de infração lavrado
( ) Interdição do estabelecimento

6. FUNDAMENTAÇÃO LEGAL
Legislação Territorial Urbana e de Atividades Comerciais
Multa prevista: R$ 114,88 a R$ 3.446,43

7. CONCLUSÃO E RECOMENDAÇÕES
[Descrever a conclusão técnica e as recomendações]`,

    'Desmatamento': `
1. OBJETO DA VISTORIA
Atender à denúncia registrada sob protocolo nº ${denuncia.protocolo}, referente a desmatamento em ${denuncia.endereco}.

2. DESCRIÇÃO DA DENÚNCIA
"${denuncia.descricao}"

3. CONSTATAÇÕES IN LOCO
  a) Supressão vegetal identificada: [ ] Sim  [ ] Não
  b) Área afetada (estimativa): _____ m²
  c) Tipo de vegetação: [ ] Mata Atlântica  [ ] Cerrado  [ ] APP  [ ] Outro
  d) Autorização de supressão: [ ] Sim  [ ] Não
  e) Fauna afetada: [ ] Sim  [ ] Não

4. DOCUMENTAÇÃO FOTOGRÁFICA
Registradas _____ fotografias da área.

5. PROVIDÊNCIAS ADOTADAS
( ) Embargo da atividade
( ) Auto de infração ambiental lavrado
( ) Comunicação ao Ministério Público

6. FUNDAMENTAÇÃO LEGAL
Lei Federal nº 12.651/2012 (Código Florestal)
Multa prevista: R$ 114,88 a R$ 16.083,36

7. CONCLUSÃO E RECOMENDAÇÕES
[Descrever a conclusão técnica]`,

    'Lixo/Entulho': `
1. OBJETO DA VISTORIA
Atender à denúncia registrada sob protocolo nº ${denuncia.protocolo}, referente a descarte irregular em ${denuncia.endereco}.

2. DESCRIÇÃO DA DENÚNCIA
"${denuncia.descricao}"

3. CONSTATAÇÕES IN LOCO
  a) Tipo de material: [ ] Entulho  [ ] Lixo doméstico  [ ] Resíduos industriais  [ ] Misto
  b) Volume estimado: _____ m³
  c) Risco sanitário: [ ] Sim  [ ] Não
  d) Responsável identificado: [ ] Sim  [ ] Não

4. DOCUMENTAÇÃO FOTOGRÁFICA
Registradas _____ fotografias do local.

5. PROVIDÊNCIAS ADOTADAS
( ) Notificação ao responsável
( ) Solicitação de limpeza
( ) Auto de infração lavrado

6. FUNDAMENTAÇÃO LEGAL
Código de Posturas Municipal
Multa prevista: R$ 114,88 a R$ 3.446,43

7. CONCLUSÃO E RECOMENDAÇÕES
[Descrever a conclusão técnica]`,

    'Outros': `
1. OBJETO DA VISTORIA
Atender à denúncia registrada sob protocolo nº ${denuncia.protocolo}, referente a irregularidade em ${denuncia.endereco}.

2. DESCRIÇÃO DA DENÚNCIA
"${denuncia.descricao}"

3. CONSTATAÇÕES IN LOCO
  a) Irregularidade confirmada: [ ] Sim  [ ] Não  [ ] Parcialmente
  b) Tipo de infração: ___________________
  c) Riscos: [ ] Segurança  [ ] Saúde  [ ] Ambiental  [ ] Nenhum

4. DOCUMENTAÇÃO FOTOGRÁFICA
Registradas _____ fotografias do local.

5. PROVIDÊNCIAS ADOTADAS
( ) Notificação emitida
( ) Auto de infração lavrado
( ) Embargo aplicado

6. FUNDAMENTAÇÃO LEGAL
[Citar legislação aplicável]
Multa prevista: R$ 229,76 a R$ 16.083,36

7. CONCLUSÃO E RECOMENDAÇÕES
[Descrever a conclusão técnica]`,
  };

  return header + templates[denuncia.tipo];
}

function FiscalDashboard({ denuncias, onSelect }: { denuncias: Denuncia[]; onSelect: (d: Denuncia) => void }) {
  const { currentUser, getFiscalPontos, isOnline } = useApp();
  const minhas = denuncias.filter(d => d.fiscal_id === currentUser?.id);
  const devolvidas = minhas.filter(d => d.status === 'devolvida');
  const ativas = minhas.filter(d => ['designada', 'em_vistoria'].includes(d.status));
  const aguardando = minhas.filter(d => d.status === 'aguardando_aprovacao');
  const concluidas = minhas.filter(d => d.status === 'concluida');
  const pontos = getFiscalPontos(currentUser?.id || '');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white px-4 md:px-6 lg:px-8 pt-6 pb-8 rounded-b-3xl lg:rounded-none">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs md:text-sm">Bem-vindo(a)</p>
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold">{currentUser?.nome}</h2>
              <p className="text-xs md:text-sm text-slate-400">{currentUser?.matricula}</p>
            </div>
            <div className="bg-amber-500/20 rounded-xl px-4 py-2 text-center">
              <Star size={18} className="text-amber-400 mx-auto" />
              <p className="text-lg md:text-xl font-bold text-amber-400">{pontos}</p>
              <p className="text-[10px] md:text-xs text-amber-300">Pontos</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 md:p-4 text-center">
              <p className="text-xl md:text-2xl font-bold">{ativas.length}</p>
              <p className="text-[10px] md:text-xs text-slate-300">Ativas</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 md:p-4 text-center">
              <p className="text-xl md:text-2xl font-bold">{aguardando.length}</p>
              <p className="text-[10px] md:text-xs text-slate-300">Aguardando</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 md:p-4 text-center">
              <p className="text-xl md:text-2xl font-bold">{concluidas.length}</p>
              <p className="text-[10px] md:text-xs text-slate-300">Concluídas</p>
            </div>
          </div>

          {/* Connection status */}
          <div className={`mt-3 rounded-xl px-3 py-2 flex items-center gap-2 text-xs ${
            isOnline ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
            {isOnline ? '🟢 Conectado — dados sincronizam em tempo real' : '🟡 Modo offline — dados locais apenas'}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 pt-4 pb-24 lg:pb-8">
        <div className="max-w-5xl mx-auto">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2 md:text-lg">
            <AlertTriangle size={16} className="text-orange-500" /> Tarefas Ativas
          </h3>
          {ativas.length === 0 && (
            <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400">
              <ClipboardList size={40} className="mx-auto mb-2" />
              <p>Nenhuma tarefa ativa</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
            {ativas.map((d, i) => (
              <motion.button
                key={d.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelect(d)}
                className="w-full bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3 text-left hover:shadow-md transition"
              >
                <div className={`w-2 h-12 rounded-full ${statusColors[d.status]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm md:text-base font-semibold text-gray-800">{d.tipo}</p>
                  <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1 truncate"><MapPin size={11} />{d.endereco}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] md:text-xs text-gray-400">SLA: {d.sla_dias} dias • {d.pontos_provisorio} pts previstos</p>
                    {d.fotos.length > 0 && (
                      <span className="text-[10px] md:text-xs text-blue-500 flex items-center gap-0.5"><Camera size={9} />{d.fotos.length}</span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] md:text-xs px-2 py-1 rounded-full text-white ${statusColors[d.status]}`}>{statusLabels[d.status]}</span>
                <ChevronRight size={16} className="text-gray-400" />
              </motion.button>
            ))}
          </div>

          {devolvidas.length > 0 && (
            <>
              <h3 className="font-bold text-gray-700 mb-3 mt-6 flex items-center gap-2 md:text-lg">
                <AlertTriangle size={16} className="text-red-500" /> 🔴 Devolvidas para Correção ({devolvidas.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                {devolvidas.map((d, i) => (
                  <motion.button
                    key={d.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => onSelect(d)}
                    className="w-full bg-red-50 border-2 border-red-300 rounded-xl p-4 text-left hover:shadow-md transition animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-12 rounded-full bg-red-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base font-semibold text-gray-800">{d.tipo}</p>
                        <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1 truncate"><MapPin size={11} />{d.endereco}</p>
                        <p className="text-[10px] md:text-xs text-red-600 font-medium mt-1">⚠️ Gerente solicitou correções</p>
                        {d.motivo_rejeicao && (
                          <p className="text-[10px] md:text-xs text-red-500 mt-0.5 truncate">"{d.motivo_rejeicao}"</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-red-400" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {aguardando.length > 0 && (
            <>
              <h3 className="font-bold text-gray-700 mb-3 mt-6 flex items-center gap-2 md:text-lg">
                <Clock size={16} className="text-purple-500" /> Aguardando Aprovação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                {aguardando.map((d, i) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-purple-50 rounded-xl p-4 border border-purple-200"
                  >
                    <p className="text-sm md:text-base font-semibold text-gray-800">{d.tipo}</p>
                    <p className="text-xs md:text-sm text-gray-500">#{d.protocolo} • {d.endereco}</p>
                    <p className="text-[10px] md:text-xs text-purple-600 mt-1">⏳ Relatório enviado, aguardando gerente</p>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const FOLDER_COLORS = [
  'from-blue-500 to-blue-600',
  'from-indigo-500 to-indigo-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-red-500 to-red-600',
  'from-orange-500 to-orange-600',
  'from-amber-500 to-amber-600',
  'from-yellow-500 to-yellow-600',
  'from-lime-500 to-lime-600',
  'from-green-500 to-green-600',
  'from-teal-500 to-teal-600',
  'from-cyan-500 to-cyan-600',
];

function ReportViewer({ denuncia, onBack }: { denuncia: Denuncia; onBack: () => void }) {
  const { getRelatorio, getAuto, currentUser } = useApp();
  const rel = getRelatorio(denuncia.id);
  const auto = getAuto(denuncia.id);

  return (
    <motion.div initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} className="min-h-screen bg-gray-50 pb-24 lg:pb-8">
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white p-4 md:p-6 flex items-center gap-3">
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <div className="flex-1">
          <h2 className="text-lg md:text-xl font-bold">Relatório — #{denuncia.protocolo}</h2>
          <p className="text-xs text-indigo-300">{denuncia.tipo} • {denuncia.endereco}</p>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        {/* Status */}
        <div className={`rounded-xl p-4 border-2 ${
          denuncia.status === 'concluida' ? 'bg-green-50 border-green-300' :
          denuncia.status === 'aguardando_aprovacao' ? 'bg-purple-50 border-purple-300' :
          denuncia.status === 'devolvida' ? 'bg-red-50 border-red-300' :
          'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${statusColors[denuncia.status]}`} />
            <span className="font-bold text-sm md:text-base">{statusLabels[denuncia.status]}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Criada em {new Date(denuncia.created_at).toLocaleDateString('pt-BR')} •
            SLA: {denuncia.sla_dias} dias •
            Pontos previstos: {denuncia.pontos_provisorio}
          </p>
          {denuncia.motivo_rejeicao && (
            <div className="mt-2 bg-red-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-800">Motivo da devolução:</p>
              <p className="text-sm text-red-700">"{denuncia.motivo_rejeicao}"</p>
            </div>
          )}
        </div>

        {/* Denuncia Info */}
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <h3 className="font-bold text-gray-700 text-sm md:text-base mb-2 flex items-center gap-2">
            <FileText size={16} className="text-blue-600" /> Informações da Denúncia
          </h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-500">Tipo:</span> <span className="font-medium">{denuncia.tipo}</span></p>
            <p><span className="text-gray-500">Endereço:</span> <span className="font-medium">{denuncia.endereco}</span></p>
            <p><span className="text-gray-500">Descrição:</span> <span className="font-medium">{denuncia.descricao}</span></p>
            <p><span className="text-gray-500">GPS:</span> <span className="font-mono text-xs">{denuncia.lat.toFixed(4)}, {denuncia.lng.toFixed(4)}</span></p>
            <p><span className="text-gray-500">Denunciante:</span> <span className="font-medium">{denuncia.denunciante_anonimo ? 'Anônimo' : denuncia.denunciante_nome || 'N/I'}</span></p>
          </div>
        </div>

        {/* Citizen photos */}
        {denuncia.fotos.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-bold text-amber-800 text-sm md:text-base mb-2 flex items-center gap-2">
              <ImageIcon size={14} /> Fotos do Denunciante ({denuncia.fotos.length})
            </h3>
            <PhotoGallery
              photos={denuncia.fotos}
              label="Evidências do Denunciante"
              metadata={{
                protocolo: denuncia.protocolo,
                tipo: denuncia.tipo,
                endereco: denuncia.endereco,
                data: new Date(denuncia.created_at).toLocaleString('pt-BR'),
              }}
            />
          </div>
        )}

        {/* Report */}
        {rel ? (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
              <h3 className="font-bold text-sm md:text-base flex items-center gap-2">
                <FileText size={16} /> Relatório Técnico
              </h3>
              <p className="text-[10px] text-blue-200">
                Fiscal: {currentUser?.nome} ({currentUser?.matricula}) •
                Data: {new Date(rel.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="p-4 space-y-4">
              {/* OS Markers */}
              <div className="flex gap-2 flex-wrap">
                {rel.os_2_0 && (
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full border border-green-300">
                    ✅ O.S. 2.0 — Cumprida (+50 pts)
                  </span>
                )}
                {rel.os_4_0 && (
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full border border-green-300">
                    ✅ O.S. 4.0 — Notificação (+50 pts)
                  </span>
                )}
                {!rel.os_2_0 && !rel.os_4_0 && (
                  <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                    Sem O.S. bonus marcadas
                  </span>
                )}
              </div>

              {/* Report Text */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">CONTEÚDO DO RELATÓRIO</p>
                <pre className="bg-gray-50 border rounded-lg p-3 md:p-4 text-xs md:text-sm text-gray-700 font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {rel.texto}
                </pre>
              </div>

              {/* Report Photos */}
              {rel.fotos && rel.fotos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">FOTOS DO FISCAL ({rel.fotos.length})</p>
                  <PhotoGallery
                    photos={rel.fotos}
                    label="Fotos do Relatório"
                    metadata={{
                      protocolo: denuncia.protocolo,
                      tipo: denuncia.tipo,
                      endereco: denuncia.endereco,
                      data: new Date(rel.created_at).toLocaleString('pt-BR'),
                    }}
                  />
                </div>
              )}

              {/* Signature */}
              {rel.assinatura_base64 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">ASSINATURA DIGITAL</p>
                  <div className="bg-gray-50 border rounded-lg p-3 inline-block">
                    <img src={rel.assinatura_base64} alt="Assinatura" className="h-16 md:h-20" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center border">
            <FileText size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Nenhum relatório salvo para este processo</p>
          </div>
        )}

        {/* Auto de Infração */}
        {auto ? (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3">
              <h3 className="font-bold text-sm md:text-base flex items-center gap-2">
                <DollarSign size={16} /> Auto de Infração
              </h3>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tipo:</span>
                <span className="font-semibold">{auto.tipo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Valor:</span>
                <span className="text-xl font-bold text-red-700">R$ {auto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Embargo:</span>
                <span className={`font-semibold ${auto.embargo ? 'text-amber-700' : 'text-gray-400'}`}>
                  {auto.embargo ? '✅ Sim (+10 pts)' : '❌ Não'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Data:</span>
                <span className="text-sm text-gray-500">{new Date(auto.created_at).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center border">
            <DollarSign size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Nenhuma multa emitida para este processo</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ProcessosList({ denuncias, onSelect, onViewReport }: { denuncias: Denuncia[]; onSelect: (d: Denuncia) => void; onViewReport: (d: Denuncia) => void }) {
  const { currentUser, getRelatorio, getAuto } = useApp();
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const minhas = denuncias.filter(d => d.fiscal_id === currentUser?.id);

  // Search results
  const searchResults = searchTerm.trim().length > 0
    ? minhas.filter(d =>
        d.protocolo.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        d.tipo.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        d.endereco.toLowerCase().includes(searchTerm.trim().toLowerCase())
      )
    : [];

  // Group by month
  const processosPorMes: Record<number, Denuncia[]> = {};
  for (let m = 0; m < 12; m++) {
    processosPorMes[m] = minhas.filter(d => {
      const date = new Date(d.created_at);
      return date.getMonth() === m;
    });
  }

  const totalProcessos = minhas.length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24 lg:pb-8">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4 md:p-6 lg:rounded-none">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <FolderOpen size={20} /> Pastas de Processos
              </h2>
              <p className="text-xs md:text-sm text-slate-400">2026 • {totalProcessos} processo(s) no total</p>
            </div>
            <button
              onClick={() => { setSearchOpen(!searchOpen); setSearchTerm(''); }}
              className={`p-2.5 rounded-xl transition ${searchOpen ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'}`}
            >
              <Search size={20} />
            </button>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por protocolo, tipo ou endereço..."
                    autoFocus
                    className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-10 py-3 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                      <X size={16} />
                    </button>
                  )}
                </div>
                {searchTerm.trim() && (
                  <p className="text-xs text-white/50 mt-1.5">
                    {searchResults.length} resultado(s) encontrado(s)
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        {/* Search Results */}
        <AnimatePresence>
          {searchOpen && searchTerm.trim() && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2 text-sm md:text-base">
                <Search size={16} className="text-blue-500" /> Resultados para "{searchTerm}"
              </h3>
              {searchResults.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-6 text-center border">
                  <Search size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">Nenhum processo encontrado</p>
                  <p className="text-xs text-gray-400 mt-1">Tente buscar por protocolo (ex: 2026-00001)</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map(d => {
                    const rel = getRelatorio(d.id);
                    const auto = getAuto(d.id);
                    return (
                      <motion.div
                        key={d.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-xl p-4 border shadow-sm cursor-pointer hover:shadow-md transition flex items-center gap-3"
                        onClick={() => {
                          if (['designada', 'em_vistoria', 'devolvida'].includes(d.status)) {
                            onSelect(d);
                          } else {
                            onViewReport(d);
                          }
                        }}
                      >
                        <div className={`w-2 h-14 rounded-full ${statusColors[d.status]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-mono font-bold text-blue-600">#{d.protocolo}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full text-white ${statusColors[d.status]}`}>
                              {statusLabels[d.status]}
                            </span>
                            {rel && <span className="text-[10px] text-blue-500">📝</span>}
                            {auto && <span className="text-[10px] text-red-500">💰 R$ {auto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                          </div>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5">{d.tipo}</p>
                          <p className="text-xs text-gray-500 truncate">{d.endereco}</p>
                          <p className="text-[10px] text-gray-400">{new Date(d.created_at).toLocaleDateString('pt-BR')} • {d.pontos_provisorio} pts</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-400 shrink-0" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Monthly Folders Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
          {MESES.map((_mes, idx) => {
            const count = processosPorMes[idx].length;
            const isOpen = openMonth === idx;
            return (
              <motion.button
                key={idx}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setOpenMonth(isOpen ? null : idx)}
                className={`relative rounded-xl p-4 md:p-5 text-center transition-all shadow-sm border-2 ${
                  isOpen
                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                    : count > 0
                    ? 'border-gray-200 bg-white hover:shadow-md hover:border-gray-300'
                    : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className={`w-12 h-10 md:w-14 md:h-12 mx-auto mb-2 rounded-lg bg-gradient-to-br ${FOLDER_COLORS[idx]} flex items-center justify-center`}>
                  <FolderOpen size={22} className="text-white" />
                </div>
                <p className="text-xs md:text-sm font-bold text-gray-800">{MESES_ABREV[idx]}</p>
                <p className="text-[10px] md:text-xs text-gray-500">{count} processo{count !== 1 ? 's' : ''}</p>
                {count > 0 && (
                  <div className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {count}
                  </div>
                )}
                {isOpen && (
                  <ChevronDown size={14} className="mx-auto mt-1 text-indigo-500" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Expanded month content */}
        <AnimatePresence mode="wait">
          {openMonth !== null && (
            <motion.div
              key={openMonth}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-4">
                <div className={`bg-gradient-to-r ${FOLDER_COLORS[openMonth]} text-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <Calendar size={20} />
                    <div>
                      <h3 className="font-bold text-base md:text-lg">{MESES[openMonth]} 2026</h3>
                      <p className="text-xs text-white/80">{processosPorMes[openMonth].length} processo(s)</p>
                    </div>
                  </div>
                  <button onClick={() => setOpenMonth(null)} className="text-white/80 hover:text-white text-sm">
                    ✕ Fechar
                  </button>
                </div>

                {processosPorMes[openMonth].length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <FolderOpen size={40} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum processo em {MESES[openMonth]}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {processosPorMes[openMonth].map((d) => {
                      const rel = getRelatorio(d.id);
                      const auto = getAuto(d.id);
                      return (
                        <div
                          key={d.id}
                          className="p-3 md:p-4 hover:bg-gray-50 transition cursor-pointer flex items-center gap-3"
                          onClick={() => {
                            if (['designada', 'em_vistoria', 'devolvida'].includes(d.status)) {
                              onSelect(d);
                            } else {
                              onViewReport(d);
                            }
                          }}
                        >
                          <div className={`w-2 h-14 rounded-full ${statusColors[d.status]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs md:text-sm font-mono text-gray-400">#{d.protocolo}</span>
                              <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full text-white ${statusColors[d.status]}`}>
                                {statusLabels[d.status]}
                              </span>
                              {rel && <span className="text-[10px] md:text-xs text-blue-500">📝 Relatório</span>}
                              {auto && <span className="text-[10px] md:text-xs text-red-500">💰 Multa R$ {auto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                            </div>
                            <p className="text-sm md:text-base font-semibold text-gray-800 mt-0.5">{d.tipo}</p>
                            <p className="text-xs md:text-sm text-gray-500 truncate">{d.endereco}</p>
                            <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">
                              {new Date(d.created_at).toLocaleDateString('pt-BR')} • SLA: {d.sla_dias} dias
                              {d.fotos.length > 0 && <span className="text-blue-500 ml-2">📷 {d.fotos.length} foto(s)</span>}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-gray-400 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* If no month is open, show a hint */}
        {openMonth === null && (
          <div className="text-center py-6 text-gray-400">
            <p className="text-sm">Selecione um mês acima para ver os processos</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PontuacaoView() {
  const { currentUser, historico, autos, getFiscalPontos } = useApp();
  const meusH = historico.filter(h => h.fiscal_id === currentUser?.id);
  const meusAutos = autos.filter(a => a.fiscal_id === currentUser?.id);
  const pontos = getFiscalPontos(currentUser?.id || '');

  // Calculate total fines per month
  const multasPorMes: { mes: string; total: number; count: number }[] = MESES_ABREV.map((mesAbrev, idx) => {
    const autosDoMes = meusAutos.filter(a => {
      const date = new Date(a.created_at);
      return date.getMonth() === idx;
    });
    return {
      mes: mesAbrev,
      total: autosDoMes.reduce((acc, a) => acc + a.valor, 0),
      count: autosDoMes.length,
    };
  });

  const totalMultasGeral = meusAutos.reduce((acc, a) => acc + a.valor, 0);
  const totalMultasCount = meusAutos.length;

  // Points breakdown
  const pontosMulta = meusH.filter(h => h.tipo_acao === 'Multa Emitida').reduce((acc, h) => acc + h.pontos, 0);
  const pontosEmbargo = meusH.filter(h => h.tipo_acao === 'Embargo').reduce((acc, h) => acc + h.pontos, 0);
  const pontosAprovacao = meusH.filter(h => h.tipo_acao === 'Aprovação').reduce((acc, h) => acc + h.pontos, 0);
  const pontosBonus = meusH.filter(h => h.tipo_acao.startsWith('Bônus')).reduce((acc, h) => acc + h.pontos, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24 lg:pb-8">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 md:p-8 rounded-b-3xl lg:rounded-none text-center">
        <div className="max-w-5xl mx-auto">
          <Trophy size={40} className="mx-auto mb-2 md:w-12 md:h-12" />
          <p className="text-4xl md:text-5xl font-bold">{pontos}</p>
          <p className="text-amber-100 text-sm md:text-base">Pontos Totais</p>

          {/* Points breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            <div className="bg-white/15 backdrop-blur rounded-lg p-2 md:p-3">
              <p className="text-lg md:text-xl font-bold">{pontosAprovacao}</p>
              <p className="text-[10px] md:text-xs text-amber-100">Base (Aprovação)</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-lg p-2 md:p-3">
              <p className="text-lg md:text-xl font-bold">{pontosBonus}</p>
              <p className="text-[10px] md:text-xs text-amber-100">Bônus (O.S.)</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-lg p-2 md:p-3">
              <p className="text-lg md:text-xl font-bold">{pontosMulta}</p>
              <p className="text-[10px] md:text-xs text-amber-100">Multas</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-lg p-2 md:p-3">
              <p className="text-lg md:text-xl font-bold">{pontosEmbargo}</p>
              <p className="text-[10px] md:text-xs text-amber-100">Embargos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Monthly Fines Summary */}
        <div>
          <h3 className="font-bold text-gray-700 mb-3 md:text-lg flex items-center gap-2">
            <TrendingUp size={18} className="text-red-500" /> Valor Total de Multas por Mês
          </h3>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Total banner */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={20} />
                <div>
                  <p className="text-sm md:text-base font-medium">Total Geral de Multas</p>
                  <p className="text-[10px] md:text-xs text-red-200">{totalMultasCount} multa(s) aplicada(s)</p>
                </div>
              </div>
              <p className="text-xl md:text-2xl font-bold">R$ {totalMultasGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            {/* Monthly grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px bg-gray-100">
              {multasPorMes.map((item, idx) => (
                <div
                  key={idx}
                  className={`bg-white p-3 md:p-4 text-center ${item.count > 0 ? '' : 'opacity-50'}`}
                >
                  <p className="text-xs md:text-sm font-bold text-gray-600">{item.mes}</p>
                  <p className={`text-sm md:text-base font-bold mt-1 ${item.count > 0 ? 'text-red-700' : 'text-gray-300'}`}>
                    {item.count > 0
                      ? `R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'
                    }
                  </p>
                  {item.count > 0 && (
                    <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">{item.count} multa(s)</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity History */}
        <div>
          <h3 className="font-bold text-gray-700 mb-3 md:text-lg flex items-center gap-2">
            <Star size={16} className="text-amber-500" /> Histórico de Pontuação
          </h3>
          {meusH.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Nenhuma pontuação registrada ainda</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
            {meusH.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl p-3 md:p-4 border shadow-sm flex items-center gap-3"
              >
                <div className={`rounded-lg p-2 ${
                  h.tipo_acao === 'Multa Emitida' ? 'bg-red-100' :
                  h.tipo_acao === 'Embargo' ? 'bg-amber-100' :
                  h.tipo_acao === 'Relatório Devolvido' ? 'bg-gray-100' :
                  h.tipo_acao.startsWith('Bônus') ? 'bg-blue-100' :
                  'bg-green-100'
                }`}>
                  {h.tipo_acao === 'Multa Emitida' ? (
                    <DollarSign size={16} className="text-red-600" />
                  ) : h.tipo_acao === 'Embargo' ? (
                    <AlertTriangle size={16} className="text-amber-600" />
                  ) : h.tipo_acao === 'Relatório Devolvido' ? (
                    <AlertTriangle size={16} className="text-gray-500" />
                  ) : (
                    <Star size={16} className="text-green-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm md:text-base font-medium text-gray-800">{h.tipo_acao}</p>
                  <p className="text-xs md:text-sm text-gray-500">{h.descricao}</p>
                  <p className="text-[10px] md:text-xs text-gray-400">{new Date(h.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={`font-bold text-sm md:text-base ${
                  h.tipo_acao === 'Multa Emitida' ? 'text-red-600' :
                  h.tipo_acao === 'Embargo' ? 'text-amber-600' :
                  'text-green-600'
                }`}>+{h.pontos}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TaskExecution({ denuncia, onBack }: { denuncia: Denuncia; onBack: () => void }) {
  const { currentUser, updateDenunciaStatus, upsertRelatorio, addAuto, getRelatorio, getAuto, addNotification } = useApp();
  const [view, setView] = useState<'main' | 'relatorio' | 'multa'>('main');
  const [showSuccess, setShowSuccess] = useState(false);

  const existingRel = getRelatorio(denuncia.id);
  const existingAuto = getAuto(denuncia.id);

  const [textoRelatorio, setTextoRelatorio] = useState(
    existingRel?.texto ||
    generateReportTemplate(denuncia, currentUser?.nome || '', currentUser?.matricula || '')
  );
  const [os20, setOs20] = useState(existingRel?.os_2_0 ?? false);
  const [os40, setOs40] = useState(existingRel?.os_4_0 ?? false);
  const [assinatura, setAssinatura] = useState<string>(existingRel?.assinatura_base64 || '');
  const [fotosRel, setFotosRel] = useState<string[]>(existingRel?.fotos || []);
  const fileRef = useRef<HTMLInputElement>(null);

  const limites = TIPO_MULTA_VALORES[denuncia.tipo] || { min: 100, max: 5000 };
  const [valorMulta, setValorMulta] = useState(existingAuto?.valor || limites.min);
  const [embargo, setEmbargo] = useState(existingAuto?.embargo ?? false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (view === 'relatorio' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (assinatura) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = assinatura;
      }
    }
  }, [view, assinatura]);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setAssinatura(canvasRef.current.toDataURL());
    }
  };

  const handleCheckin = () => {
    updateDenunciaStatus(denuncia.id, 'em_vistoria');
    addNotification('Check-in realizado! Vistoria em andamento.', 'info');
  };

  const handleAddFotoRel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = (img.height / img.width) * 400;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setFotosRel(prev => [...prev, canvas.toDataURL('image/jpeg', 0.4)]);
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(files[i]);
    }
  };

  const handleSaveRelatorio = () => {
    upsertRelatorio({
      denuncia_id: denuncia.id,
      fiscal_id: currentUser?.id || '',
      texto: textoRelatorio,
      assinatura_base64: assinatura,
      fotos: fotosRel,
      os_2_0: os20,
      os_4_0: os40,
    });
    addNotification('Relatório salvo com sucesso!', 'success');
    setView('main');
  };

  const handleSaveMulta = () => {
    addAuto({
      denuncia_id: denuncia.id,
      fiscal_id: currentUser?.id || '',
      valor: valorMulta,
      tipo: denuncia.tipo,
      embargo,
    });
    addNotification(`Multa de R$ ${valorMulta.toLocaleString('pt-BR')} registrada!`, 'success');
    setView('main');
  };

  const handleFinalizar = () => {
    upsertRelatorio({
      denuncia_id: denuncia.id,
      fiscal_id: currentUser?.id || '',
      texto: textoRelatorio,
      assinatura_base64: assinatura,
      fotos: fotosRel,
      os_2_0: os20,
      os_4_0: os40,
    });
    updateDenunciaStatus(denuncia.id, 'aguardando_aprovacao');
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onBack();
    }, 3000);
  };

  const hasRelatorio = !!existingRel || textoRelatorio.length > 100;

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-gradient-to-b from-green-500 to-green-700 z-50 flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="bg-white rounded-2xl p-8 md:p-12 text-center max-w-sm md:max-w-md w-full shadow-2xl"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.3 }}
          >
            <CheckCircle size={80} className="mx-auto text-green-500 mb-4" />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Enviado com Sucesso!</h2>
          <p className="text-gray-600 md:text-lg">Relatório enviado para aprovação do gerente.</p>
          <p className="text-sm text-gray-400 mt-3">#{denuncia.protocolo}</p>
        </motion.div>
      </motion.div>
    );
  }

  if (view === 'relatorio') {
    return (
      <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 md:p-6 flex items-center gap-3">
          <button onClick={() => setView('main')}><ArrowLeft size={24} /></button>
          <h2 className="text-lg md:text-xl font-bold">Relatório Técnico</h2>
        </div>
        <div className="p-4 md:p-6 space-y-4 pb-8 max-w-4xl mx-auto">
          {/* Desktop: side-by-side layout for photos + OS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Citizen photos */}
            {denuncia.fotos.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h4 className="text-sm md:text-base font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <ImageIcon size={14} /> Fotos do Denunciante
                </h4>
                <p className="text-xs md:text-sm text-amber-600 mb-3">Clique para ampliar e analisar</p>
                <PhotoGallery
                  photos={denuncia.fotos}
                  label="Evidências do Denunciante"
                  metadata={{
                    protocolo: denuncia.protocolo,
                    tipo: denuncia.tipo,
                    endereco: denuncia.endereco,
                    data: new Date(denuncia.created_at).toLocaleString('pt-BR'),
                  }}
                />
              </div>
            )}

            {/* OS Checkboxes */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 h-fit">
              <p className="text-sm md:text-base font-semibold text-blue-800">Ordens de Serviço Aplicáveis:</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={os20} onChange={e => setOs20(e.target.checked)} className="w-5 h-5 rounded text-blue-600" />
                <div>
                  <span className="text-sm md:text-base font-medium">O.S. 2.0 — Ordem de serviço cumprida</span>
                  <span className="text-xs md:text-sm text-blue-600 block">+50 pts (liberados na aprovação)</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={os40} onChange={e => setOs40(e.target.checked)} className="w-5 h-5 rounded text-blue-600" />
                <div>
                  <span className="text-sm md:text-base font-medium">O.S. 4.0 — Notificações (Obras, Comércios, Indústrias)</span>
                  <span className="text-xs md:text-sm text-blue-600 block">+50 pts (liberados na aprovação)</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm md:text-base font-medium text-gray-700 mb-1 block">Texto do Relatório</label>
            <textarea
              value={textoRelatorio}
              onChange={e => setTextoRelatorio(e.target.value)}
              rows={16}
              className="w-full border rounded-xl px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y font-mono leading-relaxed"
            />
            <p className="text-[10px] md:text-xs text-gray-400 mt-1">{textoRelatorio.length} caracteres • Modelo pré-preenchido conforme tipo "{denuncia.tipo}"</p>
          </div>

          {/* Photos and signature side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-sm md:text-base font-medium text-gray-700 mb-2 block">Fotos do Relatório (Fiscal)</label>
              <div className="flex gap-2 flex-wrap">
                {fotosRel.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={f} alt="" className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-lg" />
                    <button onClick={() => setFotosRel(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                  </div>
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 md:w-24 md:h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition"
                >
                  <Plus size={24} />
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleAddFotoRel} className="hidden" />
            </div>

            <div>
              <label className="text-sm md:text-base font-medium text-gray-700 mb-2 block flex items-center gap-2">
                <Pen size={14} /> Assinatura Digital
              </label>
              <canvas
                ref={canvasRef}
                width={350}
                height={120}
                className="w-full border-2 border-gray-300 rounded-xl bg-gray-50 touch-none cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              <button
                onClick={() => {
                  const ctx = canvasRef.current?.getContext('2d');
                  if (ctx && canvasRef.current) {
                    ctx.fillStyle = '#f9fafb';
                    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    setAssinatura('');
                  }
                }}
                className="text-xs text-red-500 mt-1"
              >
                Limpar assinatura
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleSaveRelatorio}
              className="w-full bg-blue-600 text-white rounded-xl py-3 md:py-4 font-semibold flex items-center justify-center gap-2 md:text-lg"
            >
              <FileText size={18} /> Salvar Relatório
            </button>
            <button
              onClick={() => {
                const printWindow = window.open('', '_blank');
                if (!printWindow) return;
                const fotosHtml = fotosRel.map(f => `<img src="${f}" style="width:200px;height:150px;object-fit:cover;border-radius:8px;border:1px solid #ddd;" />`).join('');
                const assHtml = assinatura ? `<div style="margin-top:16px;"><p style="font-weight:bold;color:#555;font-size:12px;">ASSINATURA DIGITAL</p><img src="${assinatura}" style="height:60px;border:1px solid #ddd;border-radius:4px;padding:4px;background:#f9fafb;" /></div>` : '';
                const osHtml = `${os20 ? '<span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;">✅ O.S. 2.0 — Cumprida (+50 pts)</span>' : ''}${os40 ? '<span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;margin-left:8px;">✅ O.S. 4.0 — Notificação (+50 pts)</span>' : ''}`;
                printWindow.document.write(`<!DOCTYPE html><html><head><title>Relatório - ${denuncia.protocolo}</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#333;line-height:1.6;}h1{color:#1e3a8a;border-bottom:3px solid #1e3a8a;padding-bottom:8px;}h2{color:#1e40af;margin-top:24px;}.info{background:#f0f4ff;padding:16px;border-radius:8px;margin:16px 0;}.photos{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}pre{white-space:pre-wrap;word-wrap:break-word;font-size:13px;background:#f9fafb;padding:16px;border:1px solid #e5e7eb;border-radius:8px;}.footer{margin-top:40px;padding-top:16px;border-top:2px solid #e5e7eb;text-align:center;font-size:11px;color:#999;}@media print{body{margin:20px;}}</style></head><body><h1>🛡️ SIFAU — Relatório de Fiscalização</h1><div class="info"><p><strong>Protocolo:</strong> #${denuncia.protocolo}</p><p><strong>Tipo:</strong> ${denuncia.tipo}</p><p><strong>Endereço:</strong> ${denuncia.endereco}</p><p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</p><p><strong>Fiscal:</strong> ${currentUser?.nome} (${currentUser?.matricula})</p><p><strong>Status:</strong> ${statusLabels[denuncia.status]}</p></div>${osHtml ? `<div style="margin:12px 0;">${osHtml}</div>` : ''}<h2>📋 Relatório Técnico</h2><pre>${textoRelatorio}</pre>${fotosRel.length > 0 ? `<h2>📷 Fotos do Fiscal (${fotosRel.length})</h2><div class="photos">${fotosHtml}</div>` : ''}${assHtml}<div class="footer"><p>Documento gerado pelo SIFAU — Sistema Inteligente de Fiscalização e Atividades Urbanas</p><p>${new Date().toLocaleString('pt-BR')}</p></div></body></html>`);
                printWindow.document.close();
                setTimeout(() => printWindow.print(), 500);
              }}
              className="w-full bg-slate-700 text-white rounded-xl py-3 md:py-4 font-semibold flex items-center justify-center gap-2 md:text-lg"
            >
              <Printer size={18} /> Imprimir Relatório
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (view === 'multa') {
    return (
      <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-red-700 to-red-900 text-white p-4 md:p-6 flex items-center gap-3">
          <button onClick={() => setView('main')}><ArrowLeft size={24} /></button>
          <h2 className="text-lg md:text-xl font-bold">Auto de Infração</h2>
        </div>
        <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm md:text-base text-red-800 font-medium">Infração: {denuncia.tipo}</p>
                <p className="text-xs md:text-sm text-red-600">Faixa: R$ {limites.min.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a R$ {limites.max.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>

              <div>
                <label className="text-sm md:text-base font-medium text-gray-700 mb-2 block">Valor da Multa (R$)</label>
                <input
                  type="number"
                  value={valorMulta}
                  step="0.01"
                  onChange={e => {
                    let v = Number(e.target.value);
                    if (v < limites.min) v = limites.min;
                    if (v > limites.max) v = limites.max;
                    setValorMulta(Math.round(v * 100) / 100);
                  }}
                  min={limites.min}
                  max={limites.max}
                  className="w-full border rounded-xl px-4 py-3 text-lg md:text-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="range"
                  min={limites.min}
                  max={limites.max}
                  step="0.01"
                  value={valorMulta}
                  onChange={e => setValorMulta(Math.round(Number(e.target.value) * 100) / 100)}
                  className="w-full mt-2 accent-red-600"
                />
              </div>

              {/* +10 pontos pela multa */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Star size={18} className="text-green-600" />
                  <div>
                    <span className="text-sm md:text-base font-semibold text-green-800">Multa = +10 pontos</span>
                    <span className="text-xs md:text-sm text-green-600 block">Liberados imediatamente ao registrar</span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer">
                <input type="checkbox" checked={embargo} onChange={e => setEmbargo(e.target.checked)} className="w-5 h-5 rounded text-amber-600" />
                <div>
                  <span className="text-sm md:text-base font-semibold text-amber-800">Aplicar Embargo</span>
                  <span className="text-xs md:text-sm text-amber-600 block">+10 pontos adicionais (liberados imediatamente)</span>
                </div>
              </label>

              <div className="bg-gray-100 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm md:text-base text-gray-600">Valor:</span>
                  <span className="text-xl md:text-2xl font-bold text-red-700">R$ {valorMulta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600">Pontos (Multa):</span>
                  <span className="text-sm font-bold text-green-600">+10 pts</span>
                </div>
                {embargo && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">Pontos (Embargo):</span>
                    <span className="text-sm font-bold text-amber-600">+10 pts</span>
                  </div>
                )}
                <div className="border-t mt-2 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Total de pontos:</span>
                  <span className="text-sm font-bold text-indigo-700">{embargo ? 20 : 10} pts</span>
                </div>
              </div>

              <button
                onClick={handleSaveMulta}
                className="w-full bg-red-600 text-white rounded-xl py-3 md:py-4 font-semibold flex items-center justify-center gap-2 md:text-lg"
              >
                <DollarSign size={18} /> Registrar Auto de Infração
              </button>
            </div>

            {/* Citizen photos */}
            {denuncia.fotos.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 h-fit">
                <h4 className="text-sm md:text-base font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <ImageIcon size={14} /> Evidências do Denunciante
                </h4>
                <PhotoGallery
                  photos={denuncia.fotos}
                  label="Fotos anexadas na denúncia"
                  metadata={{
                    protocolo: denuncia.protocolo,
                    tipo: denuncia.tipo,
                    endereco: denuncia.endereco,
                    data: new Date(denuncia.created_at).toLocaleString('pt-BR'),
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Main task view
  return (
    <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 md:p-6 flex items-center gap-3">
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <div className="flex-1">
          <h2 className="text-lg md:text-xl font-bold">{denuncia.tipo}</h2>
          <p className="text-xs md:text-sm text-slate-400">#{denuncia.protocolo}</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-3 md:space-y-4 pb-8 max-w-5xl mx-auto">
        {/* Desktop: two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-3 md:space-y-4">
            {/* Info card */}
            <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border space-y-2">
              <div className="flex items-center gap-2 text-sm md:text-base">
                <MapPin size={16} className="text-blue-600" />
                <span className="text-gray-700">{denuncia.endereco}</span>
              </div>
              <p className="text-sm md:text-base text-gray-600">{denuncia.descricao}</p>
              <div className="flex gap-3 text-xs md:text-sm text-gray-500">
                <span>SLA: {denuncia.sla_dias} dias</span>
                <span>Pts previstos: {denuncia.pontos_provisorio}</span>
              </div>
            </div>

            {/* Open in Maps */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${denuncia.lat},${denuncia.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-600 text-white rounded-xl py-3 md:py-4 font-semibold flex items-center justify-center gap-2 md:text-lg"
            >
              <MapPin size={18} /> Abrir no Google Maps
            </a>

            {/* Check-in */}
            {denuncia.status === 'designada' && (
              <button
                onClick={handleCheckin}
                className="w-full bg-orange-500 text-white rounded-xl py-3 md:py-4 font-semibold flex items-center justify-center gap-2 md:text-lg"
              >
                <Eye size={18} /> Realizar Check-in (Iniciar Vistoria)
              </button>
            )}

            {denuncia.status === 'em_vistoria' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 md:p-4 text-center">
                <p className="text-sm md:text-base font-semibold text-orange-700 animate-pulse">🔴 Vistoria em Andamento</p>
              </div>
            )}

            {/* Rejection notice */}
            {denuncia.status === 'devolvida' && denuncia.motivo_rejeicao && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 md:p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-600" />
                  <h4 className="text-sm md:text-base font-bold text-red-800">Relatório Devolvido pelo Gerente</h4>
                </div>
                <p className="text-sm md:text-base text-red-700 bg-red-100 rounded-lg p-3 font-medium">
                  "{denuncia.motivo_rejeicao}"
                </p>
                <p className="text-xs md:text-sm text-red-600">
                  Corrija o relatório e clique em <strong>"Finalizar e Reenviar"</strong> para submeter novamente.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setView('relatorio')}
                className="bg-white border-2 border-blue-200 rounded-xl p-4 md:p-5 text-center hover:bg-blue-50 transition"
              >
                <FileText size={28} className="mx-auto text-blue-600 mb-1" />
                <span className="text-sm md:text-base font-semibold text-gray-700">{existingRel ? 'Editar' : 'Criar'} Relatório</span>
                {existingRel && <span className="text-[10px] md:text-xs text-green-600 block">✓ Salvo</span>}
              </button>
              <button
                onClick={() => setView('multa')}
                className="bg-white border-2 border-red-200 rounded-xl p-4 md:p-5 text-center hover:bg-red-50 transition"
              >
                <DollarSign size={28} className="mx-auto text-red-600 mb-1" />
                <span className="text-sm md:text-base font-semibold text-gray-700">{existingAuto ? 'Editar' : 'Emitir'} Multa</span>
                {existingAuto && <span className="text-[10px] md:text-xs text-green-600 block">✓ R$ {existingAuto.valor.toLocaleString('pt-BR')}</span>}
              </button>
            </div>

            {/* Finalizar */}
            {(denuncia.status === 'em_vistoria' || denuncia.status === 'designada' || denuncia.status === 'devolvida') && hasRelatorio && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFinalizar}
                className={`w-full text-white rounded-xl py-4 md:py-5 font-bold text-lg md:text-xl flex items-center justify-center gap-2 shadow-lg ${
                  denuncia.status === 'devolvida'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600'
                    : 'bg-gradient-to-r from-green-600 to-green-700'
                }`}
              >
                <Send size={20} /> {denuncia.status === 'devolvida' ? 'Corrigir e Reenviar' : 'Finalizar e Enviar'}
              </motion.button>
            )}
          </div>

          {/* Right column: Citizen photos */}
          {denuncia.fotos.length > 0 && (
            <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border h-fit">
              <h3 className="font-bold text-gray-700 text-sm md:text-base mb-1 flex items-center gap-2">
                <Camera size={14} className="text-blue-600" /> Fotos do Denunciante
              </h3>
              <p className="text-[10px] md:text-xs text-gray-400 mb-3">Toque nas fotos para ampliar e analisar</p>
              <PhotoGallery
                photos={denuncia.fotos}
                label="Evidências Anexadas"
                metadata={{
                  protocolo: denuncia.protocolo,
                  tipo: denuncia.tipo,
                  endereco: denuncia.endereco,
                  data: new Date(denuncia.created_at).toLocaleString('pt-BR'),
                }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function FiscalModule({ onLogout, onOpenSettings, profilePhoto }: { onLogout: () => void; onOpenSettings: () => void; theme: string; profilePhoto?: string }) {
  const { denuncias, notifications, dismissNotification } = useApp();
  const [tab, setTab] = useState<'home' | 'processos' | 'pontos' | 'mensagens'>('home');
  const [selectedTask, setSelectedTask] = useState<Denuncia | null>(null);
  const [viewingReport, setViewingReport] = useState<Denuncia | null>(null);
  const { getConversas, currentUser } = useApp();
  const totalUnread = currentUser ? getConversas(currentUser.id).reduce((s, c) => s + c.unread, 0) : 0;

  // Handle device back button
  useEffect(() => {
    const handlePopState = () => {
      if (viewingReport) {
        setViewingReport(null);
      } else if (selectedTask) {
        setSelectedTask(null);
      } else if (tab !== 'home') {
        setTab('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewingReport, selectedTask, tab]);

  // Push history state when navigating
  const handleSelectTask = (d: Denuncia) => {
    window.history.pushState({ view: 'task' }, '');
    setSelectedTask(d);
  };
  const handleViewReport = (d: Denuncia) => {
    window.history.pushState({ view: 'report' }, '');
    setViewingReport(d);
  };
  const handleBackFromTask = () => {
    if (window.history.state?.view) window.history.back();
    else setSelectedTask(null);
  };
  const handleBackFromReport = () => {
    if (window.history.state?.view) window.history.back();
    else setViewingReport(null);
  };
  const handleTabChange = (newTab: typeof tab) => {
    if (newTab !== 'home') window.history.pushState({ view: 'tab' }, '');
    setTab(newTab);
  };

  if (viewingReport) {
    const fresh = denuncias.find(d => d.id === viewingReport.id);
    if (fresh) {
      return <ReportViewer denuncia={fresh} onBack={handleBackFromReport} />;
    }
  }

  if (selectedTask) {
    const fresh = denuncias.find(d => d.id === selectedTask.id);
    if (fresh) {
      return <TaskExecution denuncia={fresh} onBack={handleBackFromTask} />;
    }
  }

  const navItems = [
    { id: 'home' as const, icon: Home, label: 'Início' },
    { id: 'processos' as const, icon: ClipboardList, label: 'Processos' },
    { id: 'pontos' as const, icon: Trophy, label: 'Pontos' },
    { id: 'mensagens' as const, icon: Send, label: 'Mensagens', badge: totalUnread },
  ];

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      {/* Notifications */}
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-2 left-2 right-2 lg:left-64 z-50 p-3 rounded-xl shadow-lg text-white text-sm font-medium ${
              n.type === 'success' ? 'bg-green-600' : n.type === 'warning' ? 'bg-amber-600' : 'bg-blue-600'
            }`}
            onClick={() => dismissNotification(n.id)}
          >
            {n.message}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-slate-900 text-white z-40">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Perfil" className="w-10 h-10 rounded-full object-cover border-2 border-blue-400" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {currentUser?.nome?.charAt(0) || 'F'}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold">{currentUser?.nome || 'SIFAU'}</h1>
              <p className="text-[10px] text-slate-400">{currentUser?.matricula}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Fiscal de Campo</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                tab === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 space-y-1">
          <button onClick={onOpenSettings} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition text-sm font-medium">
            <Settings size={20} />
            Configurações
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition text-sm font-medium">
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-60 flex-1">
        <AnimatePresence mode="wait">
          {tab === 'home' && <FiscalDashboard key="home" denuncias={denuncias} onSelect={handleSelectTask} />}
          {tab === 'processos' && <ProcessosList key="proc" denuncias={denuncias} onSelect={handleSelectTask} onViewReport={handleViewReport} />}
          {tab === 'pontos' && <PontuacaoView key="pts" />}
          {tab === 'mensagens' && <Mensagens key="msgs" onBack={() => setTab('home')} filterRole="gerente" />}
        </AnimatePresence>
      </div>

      {/* Mobile Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg lg:hidden z-40">
        <div className="flex">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition relative ${tab === item.id ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {'badge' in item && (item.badge ?? 0) > 0 && (
                <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{item.badge}</span>
              )}
            </button>
          ))}
          <button onClick={onOpenSettings} className="flex-1 flex flex-col items-center py-3 gap-1 text-gray-400 hover:text-blue-500 transition">
            <Settings size={18} />
            <span className="text-[10px] font-medium">Config.</span>
          </button>
          <button onClick={onLogout} className="flex-1 flex flex-col items-center py-3 gap-1 text-gray-400 hover:text-red-500 transition">
            <LogOut size={20} />
            <span className="text-[10px] font-medium">Sair</span>
          </button>
        </div>
      </div>
    </div>
  );
}
