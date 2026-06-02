import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#1976d2',
          600: '#1565c0',
          700: '#0d47a1',
          800: '#0a3d91',
          900: '#062a6e',
        },
      },
    },
  },
  plugins: [],
  // 禁用 Tailwind 的 preflight 以避免与 MUI 冲突
  corePlugins: {
    preflight: false,
  },
}

export default config
