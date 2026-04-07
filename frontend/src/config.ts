// Centralized app config with safe defaults
export const TORII_URL: string = (import.meta.env.VITE_TORII_URL as string) || 'https://api.cartridge.gg/x/whaleopoly/torii'
