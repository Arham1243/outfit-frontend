import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const AppPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#fdf2f5',
            100: '#fce4eb',
            200: '#f9c9d6',
            300: '#f49ab1',
            400: '#e85f82',
            500: '#B81847',
            600: '#B01542',
            700: '#8f1236',
            800: '#771230',
            900: '#64132c',
            950: '#380713'
        },
        formField: {
            padding: {
                x: '0.75rem',
                y: '0.6rem'
            }
        },
        colorScheme: {
            dark: {
                surface: {
                    0: '#ffffff',
                    50: '#f6f6f6',
                    100: '#e7e7e7',
                    200: '#d1d1d1',
                    300: '#b0b0b0',
                    400: '#888888',
                    500: '#6d6d6d',
                    600: '#5d5d5d',
                    700: '#4a4a4a',
                    800: '#303030',
                    900: '#202123',
                    950: '#0f1012'
                },
                primary: {
                    color: '#B81847',
                    contrastColor: '#ffffff',
                    hoverColor: '#B01542',
                    activeColor: '#8f1236'
                },
                highlight: {
                    background: '#303030',
                    focusBackground: '#3a3a3a',
                    color: '#ffffff',
                    focusColor: '#ffffff'
                },
                formField: {
                    background: '#111113',
                    disabledBackground: '#18181b',
                    filledBackground: '#18181b',
                    filledFocusBackground: '#111113',
                    borderColor: '#3f3f46',
                    hoverBorderColor: '#52525b',
                    focusBorderColor: '#6b7280',
                    color: '#f4f4f5',
                    placeholderColor: '#a1a1aa'
                },
                content: {
                    background: '#18181b',
                    hoverBackground: '#222225',
                    borderColor: '#2f3037',
                    color: '#f4f4f5',
                    hoverColor: '#ffffff'
                },
                overlay: {
                    modal: {
                        background: 'rgba(0, 0, 0, 0.68)'
                    },
                    popover: {
                        background: '#202123',
                        borderColor: '#3a3a3f',
                        color: '#f4f4f5'
                    },
                    select: {
                        background: '#202123',
                        borderColor: '#3a3a3f',
                        color: '#f4f4f5'
                    }
                },
                text: {
                    color: '#f4f4f5',
                    hoverColor: '#ffffff',
                    mutedColor: '#a1a1aa',
                    hoverMutedColor: '#d4d4d8'
                }
            }
        }
    },
    components: {
        button: {
            root: {
                padding: {
                    x: '1.15rem',
                    y: '.63rem'
                }
            }
        }
    }
});

export default AppPreset;
