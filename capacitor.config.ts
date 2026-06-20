import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.commander.growthos',
  appName: 'Growth OS',
  webDir: 'public',
  server: {
    // Replace this with your actual Vercel URL (e.g., 'https://growth-os.vercel.app')
    // If testing locally on an emulator/phone, use your local IP (e.g., 'http://192.168.1.X:3000')
    url: 'https://growth-os-v2.vercel.app',
    cleartext: true
  }
};

export default config;