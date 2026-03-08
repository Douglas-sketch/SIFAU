export async function compressPhoto(file: File, maxSizeKB: number = 100): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let maxW = 800;
        let quality = 0.7;
        
        const tryCompress = (): string => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, maxW / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Add watermark
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
          ctx.fillStyle = '#333';
          ctx.font = '10px Arial';
          const now = new Date();
          ctx.fillText(`SIFAU | ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`, 5, canvas.height - 10);
          
          return canvas.toDataURL('image/jpeg', quality);
        };

        let result = tryCompress();
        
        // Keep reducing until under maxSizeKB
        while (result.length > maxSizeKB * 1370 && (maxW > 200 || quality > 0.2)) {
          if (quality > 0.3) {
            quality -= 0.1;
          } else {
            maxW = Math.max(200, maxW - 200);
            quality = 0.5;
          }
          result = tryCompress();
        }
        
        resolve(result);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function compressBase64(base64: string, maxSizeKB: number = 100): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let maxW = 800;
      let quality = 0.7;
      
      const tryCompress = (): string => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', quality);
      };

      let result = tryCompress();
      while (result.length > maxSizeKB * 1370 && (maxW > 200 || quality > 0.2)) {
        if (quality > 0.3) quality -= 0.1;
        else { maxW = Math.max(200, maxW - 200); quality = 0.5; }
        result = tryCompress();
      }
      resolve(result);
    };
    img.src = base64;
  });
}
