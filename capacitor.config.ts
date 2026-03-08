import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sifau.app',
  appName: 'SIFAU',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      '*.supabase.co',
      '*.google.com',
      '*.googleapis.com',
      'accounts.google.com',
      'douglas-sketch.github.io',
    ],
  },
};

export default config;
