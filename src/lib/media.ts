import { supabase } from '@/lib/supabase';

const BUCKET = 'occurrence-media';

export async function uploadMedia(
  file: File | Blob,
  occurrenceId: string,
  kind: 'foto' | 'video'
): Promise<{ url: string; path: string } | null> {
  const ext = kind === 'foto' ? 'jpg' : 'mp4';
  const path = `${occurrenceId}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: kind === 'foto' ? 'image/jpeg' : 'video/mp4',
  });
  if (error) {
    console.error('upload error', error.message);
    return null;
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return { url: pub.publicUrl, path: data.path };
}

export async function compressImage(file: File, maxDim = 1280, quality = 0.72): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas indisponível'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Falha na compressão'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
}

export async function getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocalização indisponível'));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(new Error(err.message || 'Falha ao obter localização')),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  });
}
