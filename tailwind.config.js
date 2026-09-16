/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          950: '#0B2E2C',
          900: '#0F3D3A',
          800: '#144D48',
          700: '#1B5E58',
          600: '#237268',
          100: '#E4EFEC'
        },
        gold: {
          600: '#B08D3F',
          500: '#C9A227',
          100: '#F6EFDA'
        },
        sand: {
          50: '#FBF9F4',
          100: '#F5F1E7',
          200: '#EAE3D2'
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,61,58,0.06), 0 8px 24px -12px rgba(15,61,58,0.18)'
      }
    }
  },
  plugins: []
};
