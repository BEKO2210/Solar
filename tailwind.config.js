/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				primary: {
					50: '#E6F2FF',
					500: '#0067C0',
					600: '#005299',
					900: '#003D73',
					DEFAULT: '#0067C0',
				},
				accent: {
					orange: '#FF8C00',
					green: '#10B981',
					yellow: '#FDB813',
				},
				glass: {
					surface: 'rgba(255, 255, 255, 0.65)',
					border: 'rgba(255, 255, 255, 0.4)',
					input: 'rgba(255, 255, 255, 0.5)',
				},
			},
			fontFamily: {
				sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
			},
			borderRadius: {
				'xl': '24px',
				'lg': '16px',
				'md': '12px',
				'sm': '8px',
			},
			backdropBlur: {
				'glass': '20px',
			},
			boxShadow: {
				'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
				'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.2)',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}
