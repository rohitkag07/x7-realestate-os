import type { Config } from 'tailwindcss';
const config: Config = { content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'], theme: { extend: { fontFamily: { sans: ['var(--font-sans)','system-ui','sans-serif'], hindi: ['var(--font-hindi)','system-ui','sans-serif'] } } } };
export default config;
