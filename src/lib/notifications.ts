export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendNotification(title: string, body: string, icon?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  try {
    new Notification(title, {
      body,
      icon: icon || '/icon.svg',
      badge: '/icon.svg',
      tag: 'sifau-' + Date.now(),
    });
  } catch {
    // Fallback for environments that don't support Notification constructor
    console.log('Notification:', title, body);
  }
}

export function notifyNewTask(fiscalName: string, protocolo: string, tipo: string) {
  sendNotification(
    '📋 Nova Tarefa Designada',
    `${fiscalName}, você recebeu uma nova tarefa: ${tipo} (${protocolo})`
  );
}

export function notifyStatusChange(protocolo: string, newStatus: string) {
  const statusNames: Record<string, string> = {
    pendente: 'Pendente',
    designada: 'Designada a um fiscal',
    em_vistoria: 'Em vistoria',
    aguardando_aprovacao: 'Aguardando aprovação',
    concluida: 'Concluída',
    devolvida: 'Devolvida para revisão',
  };
  sendNotification(
    '🔔 Status Atualizado',
    `Denúncia ${protocolo}: ${statusNames[newStatus] || newStatus}`
  );
}

export function notifyPoints(fiscalName: string, points: number, reason: string) {
  sendNotification(
    '⭐ Pontos Creditados!',
    `${fiscalName}: +${points} pts — ${reason}`
  );
}
