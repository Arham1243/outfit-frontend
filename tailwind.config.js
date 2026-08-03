/** @type {import('tailwindcss').Config} */
import PrimeUI from 'tailwindcss-primeui';
import tailwindcssFlip from 'tailwindcss-flip';

export default {
    darkMode: ['selector', '[class*="app-dark"]'],
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    plugins: [PrimeUI, tailwindcssFlip],
    theme: {
        screens: {
            sm: '576px',
            md: '768px',
            lg: '992px',
            xl: '1200px',
            '2xl': '1920px'
        }
    }
};
