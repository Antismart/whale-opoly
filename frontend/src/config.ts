// Centralized app config with safe defaults
export const TORII_URL: string = (import.meta.env.VITE_TORII_URL as string) || 'https://api.cartridge.gg/x/whale-opoly/torii'
export const WORLD_ADDRESS: string = (import.meta.env.VITE_WORLD_ADDRESS as string) || '0x0383a3e99dbe9407adac729ec343a84d8c291e04103eb5f3504fbe89afa76608'
export const WORLD_BLOCK: number = Number(import.meta.env.VITE_WORLD_BLOCK as string) || 8365014
export const RELAY_URL: string | undefined = (import.meta.env.VITE_RELAY_URL as string) || undefined
