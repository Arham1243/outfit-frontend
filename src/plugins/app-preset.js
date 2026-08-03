import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const AppPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#e2e8f0',
            100: '#e2e8f0',
            200: '#326cde',
            300: '#1f54bf',
            400: '#19459c',
            500: '#14377d',
            600: '#0f295e',
            700: '#091a3b',
            800: '#162f69',
            900: '#172856',
            950: '#162144'
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
                    color: '#3b82f6',
                    contrastColor: '#ffffff',
                    hoverColor: '#2563eb',
                    activeColor: '#1d4ed8'
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
