import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Users, ClipboardCheck, LogOut, ArrowLeft, CheckCircle, MapPin,
  Clock, Eye, FileText, DollarSign, ChevronRight, AlertCircle, User, Award, Camera, ImageIcon,
  Search, X, Filter, Hash, Settings, XCircle, RotateCcw, MessageSquare
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Denuncia, OS_TABLE } from '../types';
import { PhotoGallery } from './PhotoViewer';
import Mensagens from './Mensagens';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const statusLabels: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-yellow-500' },
  designada: { label: 'Designada', color: 'bg-blue-500' },
  em_vistoria: { label: 'Em Vistoria', color: 'bg-orange-500' },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: 'bg-purple-500' },
  concluida: { label: 'Concluída', color: 'bg-green-500' },
  devolvida: { label: 'Devolvida', color: 'bg-red-500' },
};

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#6b7280'];

function GerenteDashboard({ onViewDenuncia }: { onViewDenuncia: (d: Denuncia) => void }) {
  const { denuncias, profiles } = useApp();

  const total = denuncias.length;
  const pendentes = denuncias.filter(d => d.status === 'pendente').length;
  const concluidas = denuncias.filter(d => d.status === 'concluida').length;
  const emAndamento = total - pendentes - concluidas;
  const avgDays = concluidas > 0
    ? Math.round(denuncias.filter(d => d.status === 'concluida').reduce((acc, d) => {
        const diff = new Date(d.updated_at).getTime() - new Date(d.created_at).getTime();
        return acc + diff / (1000 * 60 * 60 * 24);
      }, 0) / concluidas)
    : 0;

  const tipoCount: Record<string, number> = {};
  denuncias.forEach(d => { tipoCount[d.tipo] = (tipoCount[d.tipo] || 0) + 1; });
  const pieData = Object.entries(tipoCount).map(([name, value]) => ({ name, value }));

  const fiscais = profiles.filter(p => p.tipo === 'fiscal');
  const barData = fiscais.map(f => ({
    name: f.nome.split(' ')[0],
    pontos: f.pontos_total,
    tarefas: denuncias.filter(d => d.fiscal_id === f.id).length,
  }));

  const areaData = [
    { mes: 'Set', denuncias: 12, resolvidas: 8 },
    { mes: 'Out', denuncias: 18, resolvidas: 14 },
    { mes: 'Nov', denuncias: 15, resolvidas: 12 },
    { mes: 'Dez', denuncias: 22, resolvidas: 18 },
    { mes: 'Jan', denuncias: denuncias.filter(d => new Date(d.created_at).getMonth() === 0).length + 20, resolvidas: concluidas + 15 },
    { mes: 'Fev', denuncias: denuncias.filter(d => new Date(d.created_at).getMonth() === 1).length + 5, resolvidas: 3 },
  ];

  const aguardando = denuncias.filter(d => d.status === 'aguardando_aprovacao');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24 lg:pb-8">
      <div className="bg-gradient-to-br from-indigo-800 via-indigo-900 to-purple-900 text-white px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-8 md:pb-10 rounded-b-3xl lg:rounded-none">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1">Dashboard Executivo</h1>
          <p className="text-indigo-300 text-xs md:text-sm mb-4 md:mb-6">Visão geral do sistema SIFAU</p>

          <div className="grid grid-cols-4 gap-2 md:gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-2 md:p-4 text-center">
              <p className="text-lg md:text-2xl lg:text-3xl font-bold">{total}</p>
              <p className="text-[9px] md:text-xs lg:text-sm text-indigo-200">Total</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2 md:p-4 text-center">
              <p className="text-lg md:text-2xl lg:text-3xl font-bold text-yellow-300">{pendentes}</p>
              <p className="text-[9px] md:text-xs lg:text-sm text-indigo-200">Pendentes</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2 md:p-4 text-center">
              <p className="text-lg md:text-2xl lg:text-3xl font-bold text-blue-300">{emAndamento}</p>
              <p className="text-[9px] md:text-xs lg:text-sm text-indigo-200">Andamento</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-2 md:p-4 text-center">
              <p className="text-lg md:text-2xl lg:text-3xl font-bold text-green-300">{concluidas}</p>
              <p className="text-[9px] md:text-xs lg:text-sm text-indigo-200">Concluídas</p>
            </div>
          </div>

          <div className="mt-3 md:mt-4 bg-white/10 backdrop-blur rounded-xl p-3 md:p-4 flex items-center justify-between">
            <span className="text-sm md:text-base text-indigo-200">⏱ Tempo Médio de Resolução</span>
            <span className="text-lg md:text-xl lg:text-2xl font-bold">{avgDays} dias</span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 lg:px-8 mt-4 md:mt-6 space-y-4 md:space-y-6">
        <div className="max-w-6xl mx-auto">
          {/* Aguardando */}
          {aguardando.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-gray-700 mb-2 md:mb-3 flex items-center gap-2 md:text-lg">
                <AlertCircle size={16} className="text-purple-500" /> Aguardando Aprovação ({aguardando.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">
                {aguardando.map((d, i) => (
                  <motion.button
                    key={d.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => onViewDenuncia(d)}
                    className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 md:p-4 flex items-center gap-3 text-left hover:shadow-md transition"
                  >
                    <div className="w-2 h-10 rounded-full bg-purple-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm md:text-base font-semibold text-gray-800">{d.tipo}</p>
                      <p className="text-xs md:text-sm text-gray-500">#{d.protocolo} • {d.endereco}</p>
                      {d.fotos.length > 0 && (
                        <p className="text-[10px] md:text-xs text-blue-500 flex items-center gap-0.5 mt-0.5"><Camera size={9} />{d.fotos.length} foto(s)</p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-purple-400" />
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Charts — responsive grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border">
              <h3 className="font-bold text-gray-700 mb-3 text-sm md:text-base">Denúncias por Tipo</h3>
              <div className="flex justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${(name || '').toString().split(' ')[0]} (${value})`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border">
              <h3 className="font-bold text-gray-700 mb-3 text-sm md:text-base">Produtividade da Equipe</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="pontos" fill="#3b82f6" name="Pontos" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tarefas" fill="#10b981" name="Tarefas" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border md:col-span-2 xl:col-span-1">
              <h3 className="font-bold text-gray-700 mb-3 text-sm md:text-base">Evolução Mensal</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="denuncias" stroke="#3b82f6" fill="#93c5fd" name="Registradas" />
                  <Area type="monotone" dataKey="resolvidas" stroke="#10b981" fill="#6ee7b7" name="Resolvidas" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DesignarView({ denuncia, onBack }: { denuncia: Denuncia; onBack: () => void }) {
  const { profiles, designarDenuncia, addNotification } = useApp();
  const fiscais = profiles.filter(p => p.tipo === 'fiscal');
  const [selectedFiscal, setSelectedFiscal] = useState(denuncia.fiscal_id || '');
  const [osSelections, setOsSelections] = useState<Record<string, number>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const totalPontos = Object.entries(osSelections).reduce((acc, [codigo, qty]) => {
    const os = OS_TABLE.find(o => o.codigo === codigo);
    return acc + (os ? os.pontos * qty : 0);
  }, 0);

  const handleDesignar = () => {
    if (!selectedFiscal) {
      addNotification('Selecione um fiscal!', 'warning');
      return;
    }
    designarDenuncia(denuncia.id, selectedFiscal, totalPontos);
    setShowSuccess(true);
    setTimeout(() => { setShowSuccess(false); onBack(); }, 2000);
  };

  if (showSuccess) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-gradient-to-b from-blue-500 to-blue-700 z-50 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="bg-white rounded-2xl p-8 md:p-12 text-center max-w-sm md:max-w-md w-full">
          <CheckCircle size={80} className="mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">Designado!</h2>
          <p className="text-gray-600 mt-2 md:text-lg">{totalPontos} pontos previstos</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-800 to-purple-900 text-white p-4 md:p-6 flex items-center gap-3">
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <h2 className="text-lg md:text-xl font-bold">Designar Tarefa</h2>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-8 max-w-6xl mx-auto">
        {/* Desktop: two columns for info + fiscal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border">
              <p className="text-xs md:text-sm text-gray-400 mb-1">#{denuncia.protocolo}</p>
              <p className="font-bold text-gray-800 md:text-lg">{denuncia.tipo}</p>
              <p className="text-sm md:text-base text-gray-600 flex items-center gap-1 mt-1"><MapPin size={12} />{denuncia.endereco}</p>
            </div>

            {/* Citizen photos preview */}
            {denuncia.fotos.length > 0 && (
              <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border">
                <h4 className="text-sm md:text-base font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <Camera size={14} className="text-blue-600" /> Evidências do Denunciante
                </h4>
                <p className="text-[10px] md:text-xs text-gray-400 mb-3">Analise as fotos antes de designar</p>
                <PhotoGallery
                  photos={denuncia.fotos}
                  label="Fotos da Denúncia"
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

          {/* Select fiscal */}
          <div>
            <label className="text-sm md:text-base font-medium text-gray-700 mb-2 block">Selecionar Fiscal</label>
            <div className="space-y-2">
              {fiscais.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFiscal(f.id)}
                  className={`w-full p-3 md:p-4 rounded-xl border-2 transition flex items-center gap-3 text-left ${
                    selectedFiscal === f.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${f.status_online === 'em_campo' ? 'bg-green-500' : f.status_online === 'online' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <p className="text-sm md:text-base font-semibold">{f.nome}</p>
                    <p className="text-xs md:text-sm text-gray-500">{f.matricula} • {f.pontos_total} pts</p>
                  </div>
                  <span className="text-xs md:text-sm text-gray-400">{f.status_online === 'em_campo' ? '🟢 Campo' : f.status_online === 'online' ? '🔵 Online' : '⚫ Offline'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OS Table — full width, responsive */}
        <div>
          <label className="text-sm md:text-base font-medium text-gray-700 mb-2 block">Tabela de Ordens de Serviço</label>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-indigo-800 w-16">O.S.</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-semibold text-indigo-800">Descrição</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm font-semibold text-indigo-800 w-16">Pts</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm font-semibold text-indigo-800 w-20">Qtd</th>
                  <th className="px-3 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm font-semibold text-indigo-800 w-20">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {OS_TABLE.map(os => {
                  const qty = osSelections[os.codigo] || 0;
                  return (
                    <tr key={os.codigo} className={`border-t ${qty > 0 ? 'bg-indigo-50/50' : ''}`}>
                      <td className="px-3 md:px-4 py-2 md:py-3 font-mono font-bold text-indigo-700 text-xs md:text-sm">{os.codigo}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-gray-700 text-xs md:text-sm">{os.descricao}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-center font-semibold text-xs md:text-sm">{os.pontos}</td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={qty}
                          onChange={e => setOsSelections(prev => ({ ...prev, [os.codigo]: Math.max(0, Number(e.target.value)) }))}
                          className="w-14 md:w-16 border rounded px-1 py-1 text-center text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-3 md:px-4 py-2 md:py-3 text-center font-semibold text-xs md:text-sm text-indigo-600">{qty > 0 ? os.pontos * qty : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total + button */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 md:p-5 flex items-center justify-between">
            <div>
              <p className="text-sm md:text-base font-semibold text-indigo-800">Pontos Previstos (Base)</p>
              <p className="text-xs md:text-sm text-indigo-600">Liberados apenas na aprovação do relatório</p>
            </div>
            <span className="text-2xl md:text-3xl font-bold text-indigo-700">{totalPontos}</span>
          </div>

          <button
            onClick={handleDesignar}
            disabled={!selectedFiscal}
            className="w-full bg-indigo-700 text-white rounded-xl py-4 md:py-5 font-bold text-lg md:text-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <User size={20} /> Designar Fiscal
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function DenunciaDetail({ denuncia, onBack }: { denuncia: Denuncia; onBack: () => void }) {
  const { profiles, getRelatorio, getAuto, aprovarRelatorio, rejeitarRelatorio } = useApp();
  const [showDesignar, setShowDesignar] = useState(false);
  const [showApprovalSuccess, setShowApprovalSuccess] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRejectSuccess, setShowRejectSuccess] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  const fiscal = profiles.find(p => p.id === denuncia.fiscal_id);
  const relatorio = getRelatorio(denuncia.id);
  const auto = getAuto(denuncia.id);

  const handleAprovar = () => {
    aprovarRelatorio(denuncia.id);
    setShowApprovalSuccess(true);
    setTimeout(() => { setShowApprovalSuccess(false); onBack(); }, 3000);
  };

  const handleRejeitar = () => {
    if (!motivoRejeicao.trim()) return;
    rejeitarRelatorio(denuncia.id, motivoRejeicao.trim());
    setShowRejectModal(false);
    setShowRejectSuccess(true);
    setTimeout(() => { setShowRejectSuccess(false); onBack(); }, 3000);
  };

  if (showDesignar) {
    return <DesignarView denuncia={denuncia} onBack={() => setShowDesignar(false)} />;
  }

  if (showApprovalSuccess) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-gradient-to-b from-green-500 to-emerald-700 z-50 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 10 }} className="bg-white rounded-2xl p-8 md:p-12 text-center max-w-sm md:max-w-md w-full shadow-2xl">
          <Award size={80} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Aprovado!</h2>
          <p className="text-gray-600 md:text-lg">Pontos liberados para o fiscal.</p>
          <div className="mt-4 bg-green-50 rounded-xl p-3 md:p-4">
            <p className="text-lg md:text-xl font-bold text-green-700">+{denuncia.pontos_provisorio}{relatorio?.os_2_0 ? ' +50' : ''}{relatorio?.os_4_0 ? ' +50' : ''} pts</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (showRejectSuccess) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-gradient-to-b from-red-500 to-red-800 z-50 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0, rotate: 180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 10 }} className="bg-white rounded-2xl p-8 md:p-12 text-center max-w-sm md:max-w-md w-full shadow-2xl">
          <RotateCcw size={80} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Devolvido!</h2>
          <p className="text-gray-600 md:text-lg">O relatório foi devolvido ao fiscal para correções.</p>
          <div className="mt-4 bg-red-50 rounded-xl p-3 md:p-4">
            <p className="text-sm md:text-base text-red-700 font-medium">O fiscal será notificado e poderá reenviar.</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Build timeline
  const timeline: { label: string; time: string; done: boolean; icon: React.ReactNode }[] = [
    { label: 'Denúncia Registrada', time: new Date(denuncia.created_at).toLocaleString('pt-BR'), done: true, icon: <FileText size={14} /> },
  ];
  if (denuncia.fiscal_id) {
    timeline.push({ label: `Designada para ${fiscal?.nome || 'Fiscal'}`, time: '', done: true, icon: <User size={14} /> });
  }
  if (['em_vistoria', 'aguardando_aprovacao', 'concluida'].includes(denuncia.status)) {
    timeline.push({ label: 'Check-in / Vistoria', time: '', done: true, icon: <Eye size={14} /> });
  }
  if (relatorio) {
    timeline.push({ label: 'Relatório Salvo', time: new Date(relatorio.created_at).toLocaleString('pt-BR'), done: true, icon: <FileText size={14} /> });
  }
  if (auto) {
    timeline.push({ label: `Multa: R$ ${auto.valor.toLocaleString('pt-BR')}${auto.embargo ? ' + Embargo' : ''}`, time: '', done: true, icon: <DollarSign size={14} /> });
  }
  if (denuncia.status === 'aguardando_aprovacao') {
    timeline.push({ label: 'Aguardando Aprovação', time: '', done: false, icon: <Clock size={14} /> });
  }
  if (denuncia.status === 'concluida') {
    timeline.push({ label: 'Concluída', time: new Date(denuncia.updated_at).toLocaleString('pt-BR'), done: true, icon: <CheckCircle size={14} /> });
  }

  return (
    <motion.div initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-gradient-to-r from-indigo-800 to-purple-900 text-white p-4 md:p-6 flex items-center gap-3">
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <div>
          <h2 className="text-lg md:text-xl font-bold">{denuncia.tipo}</h2>
          <p className="text-xs md:text-sm text-indigo-300">#{denuncia.protocolo}</p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-6xl mx-auto">
        {/* Desktop: multi-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left: Info + Timeline + Fiscal */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border space-y-2">
              <p className="text-sm md:text-base text-gray-600 flex items-center gap-2"><MapPin size={14} className="text-blue-600" />{denuncia.endereco}</p>
              <p className="text-sm md:text-base text-gray-700">{denuncia.descricao}</p>
              <div className="flex gap-4 text-xs md:text-sm text-gray-500">
                <span>SLA: {denuncia.sla_dias} dias</span>
                <span>Pts previstos: {denuncia.pontos_provisorio}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs md:text-sm px-2 py-1 rounded-full text-white ${statusLabels[denuncia.status].color}`}>
                  {statusLabels[denuncia.status].label}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border">
              <h3 className="font-bold text-gray-700 text-sm md:text-base mb-3">Linha do Tempo</h3>
              <div className="space-y-0">
                {timeline.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center ${t.done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {t.icon}
                      </div>
                      {i < timeline.length - 1 && <div className={`w-0.5 h-8 ${t.done ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm md:text-base font-medium ${t.done ? 'text-gray-800' : 'text-gray-400'}`}>{t.label}</p>
                      {t.time && <p className="text-[10px] md:text-xs text-gray-400">{t.time}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fiscal Info */}
            {fiscal && (
              <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border">
                <h3 className="font-bold text-gray-700 text-sm md:text-base mb-2">Fiscal Designado</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm md:text-base font-semibold">{fiscal.nome}</p>
                    <p className="text-xs md:text-sm text-gray-500">{fiscal.matricula} • {fiscal.status_online === 'em_campo' ? '🟢 Em Campo' : fiscal.status_online === 'online' ? '🔵 Online' : '⚫ Offline'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Relatorio preview */}
            {relatorio && (
              <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border">
                <h3 className="font-bold text-gray-700 text-sm md:text-base mb-2 flex items-center gap-2">
                  <FileText size={14} className="text-blue-600" /> Relatório do Fiscal
                </h3>
                <p className="text-xs md:text-sm text-gray-600 whitespace-pre-line bg-gray-50 rounded-lg p-3 md:p-4 max-h-60 md:max-h-80 overflow-y-auto font-mono leading-relaxed">{relatorio.texto}</p>
                <div className="flex flex-col gap-1 mt-2 text-xs md:text-sm">
                  {relatorio.os_2_0 && <span className="text-blue-600 font-medium">✓ O.S. 2.0 — Ordem de serviço cumprida (+50pts)</span>}
                  {relatorio.os_4_0 && <span className="text-blue-600 font-medium">✓ O.S. 4.0 — Notificações (+50pts)</span>}
                </div>

                {relatorio.fotos.length > 0 && (
                  <div className="mt-3">
                    <PhotoGallery
                      photos={relatorio.fotos}
                      label="Fotos do Relatório (Fiscal)"
                      metadata={{
                        protocolo: denuncia.protocolo,
                        tipo: denuncia.tipo,
                        endereco: denuncia.endereco,
                        data: new Date(relatorio.created_at).toLocaleString('pt-BR'),
                      }}
                    />
                  </div>
                )}

                {relatorio.assinatura_base64 && (
                  <div className="mt-3">
                    <p className="text-xs md:text-sm text-gray-500 mb-1">Assinatura Digital:</p>
                    <img src={relatorio.assinatura_base64} alt="Assinatura" className="h-14 md:h-16 border rounded-lg bg-gray-50 p-1" />
                  </div>
                )}
              </div>
            )}

            {/* Auto */}
            {auto && (
              <div className="bg-red-50 rounded-xl p-4 md:p-5 border border-red-200">
                <h3 className="font-bold text-red-700 text-sm md:text-base mb-1">Auto de Infração</h3>
                <p className="text-lg md:text-xl font-bold text-red-800">R$ {auto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                {auto.embargo && <span className="text-xs md:text-sm text-amber-700 font-medium">⚠️ Embargo aplicado</span>}
              </div>
            )}
          </div>

          {/* Right sidebar: Photos + Actions */}
          <div className="space-y-4">
            {/* CITIZEN PHOTOS */}
            {denuncia.fotos.length > 0 && (
              <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm border">
                <h3 className="font-bold text-gray-700 text-sm md:text-base mb-1 flex items-center gap-2">
                  <ImageIcon size={14} className="text-blue-600" /> Fotos do Denunciante
                </h3>
                <p className="text-[10px] md:text-xs text-gray-400 mb-3">
                  Toque para ampliar • Zoom, rotação e análise
                </p>
                <PhotoGallery
                  photos={denuncia.fotos}
                  label="Evidências da Denúncia"
                  metadata={{
                    protocolo: denuncia.protocolo,
                    tipo: denuncia.tipo,
                    endereco: denuncia.endereco,
                    data: new Date(denuncia.created_at).toLocaleString('pt-BR'),
                  }}
                />
              </div>
            )}

            {/* Actions */}
            {denuncia.status === 'pendente' && (
              <button
                onClick={() => setShowDesignar(true)}
                className="w-full bg-indigo-700 text-white rounded-xl py-4 md:py-5 font-bold flex items-center justify-center gap-2 md:text-lg"
              >
                <User size={20} /> Designar Fiscal
              </button>
            )}

            {denuncia.status === 'aguardando_aprovacao' && (
              <div className="space-y-3">
                {!relatorio && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4">
                    <p className="text-xs md:text-sm text-blue-700 flex items-center gap-2">
                      <Clock size={14} />
                      <span>Relatório ainda sincronizando... Você já pode aprovar ou reprovar.</span>
                    </p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAprovar}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-xl py-4 md:py-5 font-bold text-lg md:text-xl flex items-center justify-center gap-2 shadow-lg"
                >
                  <CheckCircle size={22} /> Aprovar Relatório
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowRejectModal(true)}
                  className="w-full bg-gradient-to-r from-red-500 to-red-700 text-white rounded-xl py-4 md:py-5 font-bold text-lg md:text-xl flex items-center justify-center gap-2 shadow-lg"
                >
                  <XCircle size={22} /> Reprovar / Devolver
                </motion.button>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 md:p-4">
                  <p className="text-xs md:text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span><strong>Aprovar</strong> libera os pontos ao fiscal. <strong>Reprovar</strong> devolve para correção sem pontuar.</span>
                  </p>
                </div>
              </div>
            )}

            {/* Previous rejection info */}
            {denuncia.motivo_rejeicao && denuncia.status !== 'concluida' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h4 className="text-sm md:text-base font-semibold text-red-700 flex items-center gap-2 mb-1">
                  <MessageSquare size={14} /> Última Rejeição
                </h4>
                <p className="text-sm text-red-600">{denuncia.motivo_rejeicao}</p>
              </div>
            )}

            {/* Re-designar if devolvida */}
            {denuncia.status === 'devolvida' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <RotateCcw size={24} className="mx-auto text-amber-600 mb-2" />
                <p className="text-sm md:text-base font-medium text-amber-800">Aguardando correção do fiscal</p>
                <p className="text-xs text-amber-600 mt-1">O fiscal poderá editar o relatório e reenviar.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle size={28} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800">Reprovar Relatório</h3>
                  <p className="text-xs md:text-sm text-gray-500">#{denuncia.protocolo} • {denuncia.tipo}</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-3 md:p-4 mb-4">
                <p className="text-xs md:text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} />
                  O relatório será devolvido ao fiscal <strong>{fiscal?.nome}</strong> para correções. Nenhum ponto será liberado.
                </p>
              </div>

              <div className="mb-4">
                <label className="text-sm md:text-base font-medium text-gray-700 mb-2 block">
                  Motivo da Reprovação <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivoRejeicao}
                  onChange={e => setMotivoRejeicao(e.target.value)}
                  rows={4}
                  placeholder="Descreva o motivo da reprovação e quais correções são necessárias..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
                <p className="text-[10px] md:text-xs text-gray-400 mt-1">
                  {motivoRejeicao.length} caractere(s) • Mínimo recomendado: 10
                </p>
              </div>

              {/* Quick reject reasons */}
              <div className="mb-4">
                <p className="text-xs md:text-sm font-medium text-gray-500 mb-2">Motivos rápidos:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Relatório incompleto',
                    'Fotos insuficientes',
                    'Fundamentação legal ausente',
                    'Descrição técnica inadequada',
                    'Falta assinatura digital',
                    'Endereço divergente',
                    'Necessita revisão geral',
                  ].map(motivo => (
                    <button
                      key={motivo}
                      onClick={() => setMotivoRejeicao(prev => prev ? `${prev}; ${motivo}` : motivo)}
                      className="text-xs md:text-sm px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-700 border rounded-full transition"
                    >
                      {motivo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRejectModal(false); setMotivoRejeicao(''); }}
                  className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 md:py-4 font-semibold text-sm md:text-base hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRejeitar}
                  disabled={motivoRejeicao.trim().length < 3}
                  className="flex-1 bg-red-600 text-white rounded-xl py-3 md:py-4 font-semibold text-sm md:text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700 transition flex items-center justify-center gap-2"
                >
                  <XCircle size={18} /> Confirmar Reprovação
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EquipeView() {
  const { profiles, denuncias } = useApp();
  const fiscais = profiles.filter(p => p.tipo === 'fiscal');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24 lg:pb-8">
      <div className="bg-gradient-to-br from-indigo-800 to-purple-900 text-white p-4 md:p-6 lg:rounded-none">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-lg md:text-xl lg:text-2xl font-bold">Equipe de Fiscais</h2>
          <p className="text-xs md:text-sm text-indigo-300">{fiscais.length} fiscais cadastrados</p>
        </div>
      </div>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {fiscais.map((f, i) => {
            const tarefas = denuncias.filter(d => d.fiscal_id === f.id);
            const ativas = tarefas.filter(d => ['designada', 'em_vistoria'].includes(d.status)).length;
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-xl p-4 md:p-5 shadow-sm border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-100 rounded-full flex items-center justify-center">
                    <User size={24} className="text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 md:text-lg">{f.nome}</p>
                      <div className={`w-2.5 h-2.5 rounded-full ${f.status_online === 'em_campo' ? 'bg-green-500' : f.status_online === 'online' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    </div>
                    <p className="text-xs md:text-sm text-gray-500">{f.matricula}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg md:text-xl font-bold text-amber-600">{f.pontos_total}</p>
                    <p className="text-[10px] md:text-xs text-gray-400">pontos</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-gray-50 rounded-lg p-2 md:p-3 text-center">
                    <p className="text-sm md:text-base font-bold text-gray-700">{tarefas.length}</p>
                    <p className="text-[10px] md:text-xs text-gray-500">Total</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 md:p-3 text-center">
                    <p className="text-sm md:text-base font-bold text-blue-700">{ativas}</p>
                    <p className="text-[10px] md:text-xs text-gray-500">Ativas</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 md:p-3 text-center">
                    <p className="text-sm md:text-base font-bold text-green-700">{tarefas.filter(d => d.status === 'concluida').length}</p>
                    <p className="text-[10px] md:text-xs text-gray-500">Concluídas</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function AllDenunciasView({ onSelect }: { onSelect: (d: Denuncia) => void }) {
  const { denuncias, profiles } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const getFiscalName = (fiscalId?: string) => {
    if (!fiscalId) return null;
    const fiscal = profiles.find(p => p.id === fiscalId);
    return fiscal || null;
  };

  // Filter by status first
  const statusFiltered = filterStatus === 'all' ? denuncias : denuncias.filter(d => d.status === filterStatus);

  // Then filter by search query (protocol, tipo, endereco, fiscal name)
  const filtered = searchQuery.trim()
    ? statusFiltered.filter(d => {
        const q = searchQuery.toLowerCase().trim();
        const fiscal = getFiscalName(d.fiscal_id);
        return (
          d.protocolo.toLowerCase().includes(q) ||
          d.tipo.toLowerCase().includes(q) ||
          d.endereco.toLowerCase().includes(q) ||
          (fiscal && fiscal.nome.toLowerCase().includes(q)) ||
          (fiscal && fiscal.matricula && fiscal.matricula.toLowerCase().includes(q))
        );
      })
    : statusFiltered;

  // Check if there's an exact protocol match to highlight
  const exactMatch = searchQuery.trim()
    ? filtered.find(d => d.protocolo.toLowerCase() === searchQuery.toLowerCase().trim())
    : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24 lg:pb-8">
      <div className="bg-gradient-to-br from-indigo-800 to-purple-900 text-white p-4 md:p-6 lg:rounded-none">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold">Todas as Denúncias</h2>
              <p className="text-xs md:text-sm text-indigo-300">{denuncias.length} registros</p>
            </div>
            <button
              onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
              className={`p-2.5 md:p-3 rounded-xl transition ${showSearch ? 'bg-white text-indigo-800' : 'bg-white/15 hover:bg-white/25 text-white'}`}
            >
              {showSearch ? <X size={20} /> : <Search size={20} />}
            </button>
          </div>

          {/* Search Bar */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 pb-1">
                  <div className="relative">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-300" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Pesquisar por protocolo, tipo, endereço ou fiscal..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white/15 backdrop-blur border border-white/20 rounded-xl pl-11 pr-10 py-3 md:py-3.5 text-white placeholder-indigo-300 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white p-0.5"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {searchQuery && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-indigo-300 mt-1.5 ml-1"
                    >
                      <Filter size={10} className="inline mr-1" />
                      {filtered.length} resultado(s) encontrado(s)
                      {exactMatch && (
                        <span className="text-green-300 ml-1">• Protocolo exato encontrado!</span>
                      )}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Status filter pills */}
        <div className="flex gap-2 p-4 md:p-6 overflow-x-auto">
          {['all', 'pendente', 'designada', 'em_vistoria', 'aguardando_aprovacao', 'devolvida', 'concluida'].map(s => {
            const count = s === 'all' ? denuncias.length : denuncias.filter(d => d.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  filterStatus === s ? 'bg-indigo-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'Todas' : statusLabels[s]?.label || s}
                <span className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded-full ${filterStatus === s ? 'bg-white/20' : 'bg-gray-200'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Exact match highlight card */}
        {exactMatch && (
          <div className="px-4 md:px-6 mb-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-2xl p-4 md:p-5 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <Hash size={16} className="text-green-600" />
                <span className="text-sm md:text-base font-bold text-green-800">Protocolo Encontrado</span>
              </div>
              <button
                onClick={() => onSelect(exactMatch)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-full min-h-[60px] rounded-full ${statusLabels[exactMatch.status].color}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base md:text-lg font-mono font-bold text-gray-800">#{exactMatch.protocolo}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full text-white ${statusLabels[exactMatch.status].color}`}>
                        {statusLabels[exactMatch.status].label}
                      </span>
                    </div>
                    <p className="text-sm md:text-base font-semibold text-gray-800 mt-1">{exactMatch.tipo}</p>
                    <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={12} />{exactMatch.endereco}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Registrada em {new Date(exactMatch.created_at).toLocaleDateString('pt-BR')}
                    </p>

                    {/* Fiscal assignment info */}
                    {exactMatch.fiscal_id ? (
                      <div className="mt-2 bg-white rounded-lg p-2.5 md:p-3 border flex items-center gap-2">
                        <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-100 rounded-full flex items-center justify-center">
                          <User size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs md:text-sm font-semibold text-gray-800">
                            {getFiscalName(exactMatch.fiscal_id)?.nome || 'Fiscal'}
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            {getFiscalName(exactMatch.fiscal_id)?.matricula} •
                            {getFiscalName(exactMatch.fiscal_id)?.status_online === 'em_campo'
                              ? ' 🟢 Em Campo'
                              : getFiscalName(exactMatch.fiscal_id)?.status_online === 'online'
                              ? ' 🔵 Online'
                              : ' ⚫ Offline'}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                          {getFiscalName(exactMatch.fiscal_id)?.pontos_total} pts
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 bg-yellow-50 rounded-lg p-2.5 border border-yellow-200 flex items-center gap-2">
                        <AlertCircle size={14} className="text-yellow-600" />
                        <p className="text-xs md:text-sm text-yellow-800 font-medium">Sem fiscal designado</p>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={20} className="text-green-500 shrink-0 mt-2" />
                </div>
              </button>
            </motion.div>
          </div>
        )}

        {/* Results list */}
        {filtered.length === 0 ? (
          <div className="px-4 md:px-6 py-12 text-center">
            <Search size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium md:text-lg">Nenhum resultado encontrado</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery ? `Nenhuma denúncia corresponde a "${searchQuery}"` : 'Nenhuma denúncia neste filtro'}
            </p>
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                className="mt-3 text-indigo-600 text-sm font-medium hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">
            {filtered.map((d, i) => {
              const fiscal = getFiscalName(d.fiscal_id);
              const isHighlighted = searchQuery && d.protocolo.toLowerCase().includes(searchQuery.toLowerCase().trim());

              return (
                <motion.button
                  key={d.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onSelect(d)}
                  className={`w-full bg-white rounded-xl p-3 md:p-4 shadow-sm border text-left hover:shadow-md transition ${
                    isHighlighted ? 'ring-2 ring-indigo-400 border-indigo-300' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-full min-h-[40px] rounded-full ${statusLabels[d.status].color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs md:text-sm font-mono ${isHighlighted ? 'text-indigo-700 font-bold' : 'text-gray-400'}`}>
                          #{d.protocolo}
                        </span>
                        <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full text-white ${statusLabels[d.status].color}`}>
                          {statusLabels[d.status].label}
                        </span>
                      </div>
                      <p className="text-sm md:text-base font-semibold text-gray-800 mt-0.5">{d.tipo}</p>
                      <p className="text-xs md:text-sm text-gray-500 truncate">{d.endereco}</p>

                      {/* Fiscal info row */}
                      {fiscal ? (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            fiscal.status_online === 'em_campo' ? 'bg-green-500'
                            : fiscal.status_online === 'online' ? 'bg-blue-500'
                            : 'bg-gray-300'
                          }`} />
                          <User size={11} className="text-gray-400 shrink-0" />
                          <span className="text-[11px] md:text-xs text-gray-600 font-medium truncate">
                            {fiscal.nome}
                          </span>
                          {fiscal.matricula && (
                            <span className="text-[10px] text-gray-400 shrink-0">
                              ({fiscal.matricula})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1.5">
                          <AlertCircle size={11} className="text-yellow-500 shrink-0" />
                          <span className="text-[11px] md:text-xs text-yellow-600">Sem fiscal</span>
                        </div>
                      )}

                      {d.fotos.length > 0 && (
                        <p className="text-[10px] md:text-xs text-blue-500 flex items-center gap-0.5 mt-1"><Camera size={9} />{d.fotos.length} foto(s)</p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-gray-400 shrink-0 mt-1" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function GerenteModule({ onLogout, onOpenSettings, profilePhoto }: { onLogout: () => void; onOpenSettings: () => void; theme: string; profilePhoto?: string }) {
  const { denuncias, notifications, dismissNotification } = useApp();
  const [tab, setTab] = useState<'home' | 'denuncias' | 'equipe' | 'mensagens'>('home');
  const [selectedDenuncia, setSelectedDenuncia] = useState<Denuncia | null>(null);
  const { getConversas, currentUser } = useApp();
  const totalUnread = currentUser ? getConversas(currentUser.id).reduce((s, c) => s + c.unread, 0) : 0;

  if (selectedDenuncia) {
    const fresh = denuncias.find(d => d.id === selectedDenuncia.id) || selectedDenuncia;
    return <DenunciaDetail denuncia={fresh} onBack={() => setSelectedDenuncia(null)} />;
  }

  const navItems = [
    { id: 'home' as const, icon: Home, label: 'Dashboard' },
    { id: 'denuncias' as const, icon: ClipboardCheck, label: 'Denúncias' },
    { id: 'equipe' as const, icon: Users, label: 'Equipe' },
    { id: 'mensagens' as const, icon: MessageSquare, label: 'Mensagens', badge: totalUnread },
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
      <div className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-gradient-to-b from-indigo-900 to-purple-900 text-white z-40">
        <div className="p-6 border-b border-indigo-700">
          <div className="flex items-center gap-3 mb-2">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Perfil" className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {currentUser?.nome?.charAt(0) || 'G'}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold">{currentUser?.nome || 'SIFAU'}</h1>
              <p className="text-[10px] text-indigo-300">{currentUser?.matricula}</p>
            </div>
          </div>
          <p className="text-xs text-indigo-400">Gerência / Superintendência</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                tab === item.id ? 'bg-white/20 text-white' : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-indigo-700 space-y-1">
          <button onClick={onOpenSettings} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-indigo-200 hover:bg-white/10 hover:text-white transition text-sm font-medium">
            <Settings size={20} />
            Configurações
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-indigo-200 hover:bg-red-600/20 hover:text-red-400 transition text-sm font-medium">
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-60 flex-1">
        <AnimatePresence mode="wait">
          {tab === 'home' && <GerenteDashboard key="home" onViewDenuncia={setSelectedDenuncia} />}
          {tab === 'denuncias' && <AllDenunciasView key="den" onSelect={setSelectedDenuncia} />}
          {tab === 'equipe' && <EquipeView key="eq" />}
          {tab === 'mensagens' && <Mensagens key="msgs" onBack={() => setTab('home')} filterRole="fiscal" />}
        </AnimatePresence>
      </div>

      {/* Mobile Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg lg:hidden z-40">
        <div className="flex">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition ${tab === item.id ? 'text-indigo-600' : 'text-gray-400'}`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
          <button onClick={onOpenSettings} className="flex-1 flex flex-col items-center py-3 gap-1 text-gray-400 hover:text-indigo-500 transition">
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
