/**
 * Geolocation Service — SIFAU
 *
 * Esta é a ÚNICA função de geolocalização que o resto do app deve chamar.
 * Toda a lógica de negócio (cálculo de distância, liberação de botão) chama
 * getCurrentPosition() daqui — nunca a API nativa diretamente.
 *
 * Por padrão, usa a Geolocation API do browser para funcionar no Bolt.new.
 *
 * >>> Ao empacotar com Capacitor (APK Android), troque a implementação de
 * >>> getCurrentPosition() pela chamada do plugin @capacitor/geolocation:
 * >>>   import { Geolocation } from '@capacitor/geolocation';
 * >>>   const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
 * >>>   return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
 * >>> Mantenha a mesma assinatura de retorno { lat, lng, accuracy } para que
 * >>> nenhuma outra parte do app precise mudar.
 */

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export async function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização indisponível neste dispositivo.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('Permissão de localização negada. Ative a localização nas configurações do aparelho.'));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error('Tempo esgotado ao obter localização. Tente novamente ao ar livre.'));
        } else {
          reject(new Error(err.message || 'Falha ao obter localização GPS.'));
        }
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 }
    );
  });
}

/**
 * Raio de liberação do botão "Iniciar Vistoria" em metros.
 * Constante configurável — altere aqui se a regra municipal mudar.
 */
export const GEOFENCE_RADIUS_M = 150;

/**
 * Distância entre dois pontos em metros (fórmula de Haversine).
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Verifica se o fiscal está dentro do raio permitido para iniciar a vistoria.
 */
export function isWithinGeofence(
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number,
  radiusM = GEOFENCE_RADIUS_M
): boolean {
  return haversineDistance(currentLat, currentLng, targetLat, targetLng) <= radiusM;
}
