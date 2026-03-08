// ═══════════════════════════════════════════════════════════════
//  Profile Photo Manager — Salva/carrega fotos por email
// ═══════════════════════════════════════════════════════════════

const PHOTOS_KEY = 'sifau_profile_photos';

function loadAll(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(PHOTOS_KEY) || '{}');
  } catch { return {}; }
}

export function getProfilePhoto(email: string): string | null {
  if (!email) return null;
  const all = loadAll();
  return all[email.toLowerCase().trim()] || null;
}

export function saveProfilePhoto(email: string, base64: string): void {
  if (!email || !base64) return;
  const all = loadAll();
  all[email.toLowerCase().trim()] = base64;
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(all));
}

export function removeProfilePhoto(email: string): void {
  if (!email) return;
  const all = loadAll();
  delete all[email.toLowerCase().trim()];
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(all));
}

export function compressImage(file: File, maxSize: number = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        
        // Redimensionar mantendo proporção
        if (w > maxSize || h > maxSize) {
          if (w > h) {
            h = Math.round((h * maxSize) / w);
            w = maxSize;
          } else {
            w = Math.round((w * maxSize) / h);
            h = maxSize;
          }
        }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject('Canvas not available'); return; }
        
        // Desenhar circular (clip)
        ctx.drawImage(img, 0, 0, w, h);
        
        // Comprimir para JPEG com qualidade 0.7
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(base64);
      };
      img.onerror = () => reject('Erro ao carregar imagem');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject('Erro ao ler arquivo');
    reader.readAsDataURL(file);
  });
}
