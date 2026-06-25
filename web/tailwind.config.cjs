/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Warm neutrals (replaces cold slate for app surfaces) ── */
        sand: {
          50:  '#FAFAF8',
          100: '#F5F5F0',
          200: '#E8E6E1',
          300: '#D4D1CA',
          400: '#A8A49C',
          500: '#78756D',
          600: '#5C5A54',
          700: '#3D3D3A',
          800: '#2A2A28',
          900: '#1A1A1A',
        },
        /* ── Refined teal — warmer, earthier ── */
        aethea: {
          50:  '#F0F7F5',
          100: '#DAF0EA',
          200: '#B5E0D5',
          300: '#7DCBB8',
          400: '#4AB59E',
          500: '#2A9D83',
          600: '#2A7C6F',
          700: '#226358',
          800: '#1D4F47',
          900: '#163B35',
        },
        /* ── Surface tokens ── */
        surface: {
          DEFAULT: '#FAFAF8',
          card:    '#FAF8F4',
          sidebar: '#647768', // Primary Sidebar Surface
          sidebarHover: '#7F8F81', // Soft Sage Overlay
        },
        /* ── Aethea Sidebar Specific Colors ── */
        botanical: {
          light: '#556B5D', // Deep Sage Green
          DEFAULT: '#445549', // Dark Botanical Green
          dark: '#37443A', // Deep Shadow Green
        },
        aetheaGold: {
          light: '#F1E4BE', // Gold Glow
          DEFAULT: '#D6BE87', // Soft Gold
          warm: '#E3D2A6', // Warm Champagne
          dark: '#B89B5E', // Antique Gold
        },
        aetheaText: {
          primary: '#2E3A31', // Primary Text
          secondary: '#667066', // Secondary Text
          muted: '#8A9387', // Muted Text
        },
        /* ── Organic Additions ── */
        organic: {
          ivory: '#F5F2EA', // Warm Ivory
          cream: '#EFE9DD', // Soft Cream
          mist: '#E6E0D2', // Mist Beige
          lotus: '#FAF8F2', // Lotus White
          linen: '#F7F5F0',
          terracotta: '#E8DCCB',
          sandsoft: '#F2EFE9',
          amberGlow: '#FDE68A',
        },
        /* ── Cafe ── */
        cafe: {
          DEFAULT: '#8B7355',
          light: '#A68A64',
          dark: '#6E5A42',
        },
        /* ── Nescafe (Action Buttons) ── */
        nescafe: {
          DEFAULT: '#A67C52',
          hover: '#8E6742',
        },
        /* ── Olive Theme ── */
        olive: {
          50: '#F4F7F2',
          100: '#E8EFE5',
          200: '#C5D3CB',
          300: '#A4B89A',
          400: '#8A9E7F',
          500: '#768A63',
          600: '#5E714C',
          700: '#4D5E3E',
          800: '#3D4A32',
          900: '#2E3826',
        },
        /* ── Sanctuary Forest Green ── */
        forest: {
          50:  '#F2F5F3',
          100: '#E1E9E4',
          200: '#C5D3CB',
          300: '#9DB6A9',
          400: '#759483',
          500: '#567765',
          600: '#405B4D',
          700: '#344A3F',
          800: '#2A3C33',
          900: '#23322B',
          950: '#16241C',
        }
      },
      fontFamily: {
        sans:  ['Outfit', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'glow-gold': '0 0 15px rgba(214, 190, 135, 0.35)',
        'glow-gold-lg': '0 0 25px rgba(214, 190, 135, 0.55)',
      },
    },
  },
  corePlugins: {},
  plugins: [],
};
