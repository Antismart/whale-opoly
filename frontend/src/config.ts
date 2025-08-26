// Centralized app config with safe defaults
export const TORII_URL: string = (import.meta.env.VITE_TORII_URL as string) || 'https://api.cartridge.gg/x/whale-opoly/torii'
export const WORLD_ADDRESS: string = (import.meta.env.VITE_WORLD_ADDRESS as string) || '0x0161d03d910b012924b640a5117015289aaf9a36a856b204cd91b835ba60d9bb'
export const WORLD_BLOCK: number = Number(import.meta.env.VITE_WORLD_BLOCK as string) || 1590090
