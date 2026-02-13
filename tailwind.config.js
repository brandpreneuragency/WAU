/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Soft UI Color Palette
        background: '#F9FAFB', // bg-gray-50
        foreground: '#111827',   // text-gray-900
        muted: '#6B7280',        // text-gray-500
        card: '#FFFFFF',
        border: '#E5E7EB',       // gray-200
        // Custom pastel colors for status badges
        pastel: {
          red: { bg: '#FEF2F2', text: '#DC2626' },      // red-50, red-600
          green: { bg: '#F0FDF4', text: '#16A34A' },  // green-50, green-600
          yellow: { bg: '#FEFCE8', text: '#CA8A04' },  // yellow-50, yellow-600
          blue: { bg: '#EFF6FF', text: '#2563EB' },    // blue-50, blue-600
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'soft': '1.5rem',      // 24px
        'softer': '1.875rem',  // 30px
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'soft-md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
      },
    },
  },
  plugins: [],
}
