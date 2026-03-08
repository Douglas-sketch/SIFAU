import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, MessageCircle, User, Circle, Search, Paperclip } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface MensagensProps {
  onBack: () => void;
  filterRole?: 'fiscal' | 'gerente';
}

export default function Mensagens({ onBack, filterRole }: MensagensProps) {
  const state = useApp();
  const currentUser = state.currentUser;
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (!currentUser) return null;

  const conversas = state.getConversas(currentUser.id);
  const totalUnread = conversas.reduce((sum, c) => sum + c.unread, 0);

  // Get available contacts (filtered by role if specified)
  const contacts = state.profiles.filter(p => {
    if (p.id === currentUser.id) return false;
    if (filterRole) return p.tipo === filterRole;
    return p.tipo === 'fiscal' || p.tipo === 'gerente';
  });

  const filteredContacts = contacts.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.matricula || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedPeer) {
    return (
      <ChatView
        peerId={selectedPeer}
        onBack={() => setSelectedPeer(null)}
        messagesEndRef={messagesEndRef}
        input={input}
        setInput={setInput}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-4 lg:p-6">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="hover:bg-white/10 rounded-lg p-1 transition">
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
              <MessageCircle size={22} />
              Mensagens
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {totalUnread}
                </span>
              )}
            </h2>
            <p className="text-blue-200 text-xs md:text-sm">
              Comunicação entre {currentUser.tipo === 'gerente' ? 'gerência e fiscais' : 'fiscal e gerência'}
            </p>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 text-sm font-medium transition flex items-center gap-1"
          >
            <Paperclip size={16} /> Nova
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto w-full p-4 lg:p-6 space-y-3">
        {/* Conversations List */}
        {conversas.length === 0 && !showNewChat && (
          <div className="text-center py-16">
            <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">Nenhuma conversa ainda</h3>
            <p className="text-sm text-gray-400 mb-4">
              Inicie uma conversa com {currentUser.tipo === 'gerente' ? 'um fiscal' : 'o gerente'}
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Iniciar Conversa
            </button>
          </div>
        )}

        {conversas.length > 0 && !showNewChat && (
          <>
            {conversas.map((conv) => {
              const peer = state.profiles.find(p => p.id === conv.peerId);
              const isOnline = peer?.status_online === 'online' || peer?.status_online === 'em_campo';
              const timeStr = new Date(conv.lastMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              return (
                <motion.button
                  key={conv.peerId}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedPeer(conv.peerId)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm border flex items-center gap-3 text-left hover:shadow-md transition"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {conv.peerName.charAt(0).toUpperCase()}
                    </div>
                    {isOnline && (
                      <Circle size={12} className="absolute -bottom-0.5 -right-0.5 text-green-500 fill-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm md:text-base truncate" style={{ color: 'var(--text-primary)' }}>
                        {conv.peerName}
                      </h4>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{timeStr}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs md:text-sm text-gray-500 truncate">
                        {conv.lastMsg.de_id === currentUser.id ? 'Você: ' : ''}
                        {conv.lastMsg.texto}
                      </p>
                      {conv.unread > 0 && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 font-bold">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {peer?.tipo === 'gerente' ? '👔 Gerente' : '👷 Fiscal'} • {peer?.matricula}
                    </span>
                  </div>
                </motion.button>
              );
            })}

            <button
              onClick={() => setShowNewChat(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-400 text-sm hover:border-blue-400 hover:text-blue-500 transition flex items-center justify-center gap-2"
            >
              <Paperclip size={16} /> Nova Conversa
            </button>
          </>
        )}

        {/* New Chat Picker */}
        <AnimatePresence>
          {showNewChat && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-700 md:text-lg" style={{ color: 'var(--text-primary)' }}>
                  Selecionar Contato
                </h3>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="text-sm text-blue-600 font-medium"
                >
                  Cancelar
                </button>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou matrícula..."
                  className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredContacts.map(contact => {
                  const isOnline = contact.status_online === 'online' || contact.status_online === 'em_campo';
                  const existing = conversas.find(c => c.peerId === contact.id);

                  return (
                    <motion.button
                      key={contact.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelectedPeer(contact.id);
                        setShowNewChat(false);
                      }}
                      className="bg-white rounded-xl p-3 border shadow-sm flex items-center gap-3 text-left hover:shadow-md transition"
                      style={{ backgroundColor: 'var(--bg-card)' }}
                    >
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${contact.tipo === 'gerente' ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                          {contact.nome.charAt(0).toUpperCase()}
                        </div>
                        {isOnline && <Circle size={10} className="absolute -bottom-0.5 -right-0.5 text-green-500 fill-green-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {contact.nome}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {contact.tipo === 'gerente' ? '👔 Gerente' : '👷 Fiscal'} • {contact.matricula}
                          {contact.status_online === 'em_campo' && ' • 📍 Em campo'}
                        </p>
                      </div>
                      {existing && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                          Existente
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ChatView({
  peerId,
  onBack,
  messagesEndRef,
  input,
  setInput,
}: {
  peerId: string;
  onBack: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  input: string;
  setInput: (v: string) => void;
}) {
  const state = useApp();
  const currentUser = state.currentUser;
  if (!currentUser) return null;

  const peer = state.profiles.find(p => p.id === peerId);
  const messages = state.getMensagensConversa(currentUser.id, peerId);
  const isOnline = peer?.status_online === 'online' || peer?.status_online === 'em_campo';

  // Mark messages as read
  useEffect(() => {
    messages.forEach(m => {
      if (m.para_id === currentUser.id && !m.lida) {
        state.marcarLida(m.id);
      }
    });
  }, [messages, currentUser.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    state.sendMensagem(peerId, input);
    setInput('');
  };

  const groupedByDate = messages.reduce((acc, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString('pt-BR');
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, typeof messages>);

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-4 lg:p-5 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="hover:bg-white/10 rounded-lg p-1 transition">
            <ArrowLeft size={24} />
          </button>
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${peer?.tipo === 'gerente' ? 'bg-purple-500' : 'bg-blue-500'}`}>
              {peer?.nome.charAt(0).toUpperCase() || <User size={20} />}
            </div>
            {isOnline && <Circle size={10} className="absolute -bottom-0.5 -right-0.5 text-green-400 fill-green-400" />}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base md:text-lg">{peer?.nome || 'Desconhecido'}</h3>
            <p className="text-blue-200 text-xs">
              {peer?.tipo === 'gerente' ? '👔 Gerente' : '👷 Fiscal'} • {peer?.matricula}
              {isOnline ? ' • 🟢 Online' : ' • ⚫ Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-1" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        <div className="max-w-4xl mx-auto space-y-1">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 text-sm">Nenhuma mensagem ainda. Diga olá! 👋</p>
            </div>
          )}

          {Object.entries(groupedByDate).map(([date, msgs]) => (
            <div key={date}>
              <div className="text-center my-4">
                <span className="bg-gray-200 text-gray-500 text-xs px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>
              {msgs.map((msg) => {
                const isMine = msg.de_id === currentUser.id;
                const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex mb-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white shadow-sm border text-gray-800 rounded-bl-md'
                    }`}
                    style={!isMine ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' } : {}}
                    >
                      {msg.denuncia_id && (
                        <div className={`text-[10px] mb-1 px-2 py-0.5 rounded-full inline-block ${isMine ? 'bg-blue-500/50' : 'bg-blue-100 text-blue-600'}`}>
                          📋 Ref. Denúncia
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.texto}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                        <span className="text-[10px]">{time}</span>
                        {isMine && (
                          <span className="text-[10px]">{msg.lida ? '✓✓' : '✓'}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t p-3 lg:p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Digite sua mensagem..."
            className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-blue-600 text-white rounded-xl p-3 hover:bg-blue-700 transition disabled:opacity-40"
          >
            <Send size={20} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
