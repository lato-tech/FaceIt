import React, { useCallback, useEffect, useState, createContext, useContext, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { shadows } from './shadow';

type Theme = 'light' | 'dark';
type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => undefined
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') {
        return "dark";
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1e1e1e' : '#ffffff');
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const stored = localStorage.getItem('theme');
      if (!stored) {
        setTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const muiTheme = useMemo(() => {
    return createTheme({
      cssVariables: {
        colorSchemeSelector: 'body'
      },
      palette: {
        mode: theme,
        ...(theme === 'light'
          ? {
            primary: {
              main: '#1976d2', // Trust/tech blue
              light: '#63a4ff',
              dark: '#004ba0',
              contrastText: '#fff',
            },
            secondary: {
              main: '#00c853', // Green for success/attendance
              light: '#5efc82',
              dark: '#009624',
              contrastText: '#fff',
            },
            error: {
              main: '#d32f2f', // Absent or error
            },
            warning: {
              main: '#ff9800', // Low confidence
            },
            info: {
              main: '#0288d1', // Neutral info
            },
            success: {
              main: '#2e7d32', // Another green shade
            },
            background: {
              default: '#f4f6f8', // Light gray clean background
              paper: '#ffffff',
            },
            text: {
              primary: '#212121',
              secondary: '#424242',
            },
          }
          :
          {
            primary: {
              main: '#ff9800',   // Bright orange
              light: '#ffb74d',
              dark: '#f57c00',
              contrastText: '#000000',
            },
            secondary: {
              main: '#ffa726',   // Softer orange for accents
              light: '#ffcc80',
              dark: '#fb8c00',
              contrastText: '#000000',
            },
            error: {
              main: '#ef5350',
            },
            warning: {
              main: '#ffb74d',
            },
            info: {
              main: '#ffcc80',   // Soft orange for info
            },
            success: {
              main: '#ffb74d',   // Orange-tinted success if needed
            },
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
            text: {
              primary: '#ffffff',
              secondary: '#b0bec5',
            },
            divider: 'rgba(255, 255, 255, 0.1)',
          
          }
        ),
      },
      typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        h1: {
          fontSize: '2rem',
          fontWeight: 600,
          margin: '0px !important',
        },
        h2: {
          fontSize: '1.5rem',
          fontWeight: 500,
          margin: '0px',
        },
        button: {
          textTransform: 'none',
          fontWeight: 500,

        },
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiButtonBase: {
          styleOverrides: {
            root: {
              fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif'
            }
          }
        },
        MuiButton: {
          defaultProps: {
            disableRipple: true
          },
          styleOverrides: {
            startIcon: {
              marginRight: 0
            },
            endIcon: {
              marginLeft: 0
            },
            root: {
              fontWeight: 600,
              borderRadius: '10px',
              textTransform: 'none',
              boxShadow: 'none',
              gap: '8px !important', // override gap from MuiButton
              padding: '8px 16px',
              ':hover': {
                boxShadow: 'none'
              },
              '&.mini': {
                fontSize: '0.75rem',
                borderRadius: '8px',
                padding: '6px 8px'
              },
              '.MuiLoadingButton-loadingIndicator': {
                left: 0,
                '.MuiCircularProgress-root': {
                  color: '#2563eb'
                }
              },
              '&.Mui-focusVisible': {
                background: '#3b82f6',
                boxShadow: 'none'
              },
              '&:focus': {
                background: '#dbeafe'
              },
              '&.Mui-disabled': {
                background: '#e5e7eb',
                color: '#6b7280'
              }
            },
            sizeSmall: {
              fontSize: '0.75rem',
              padding: '6px 8px',
              lineHeight: '1.5'
            },
            containedPrimary: {
              ':hover': {
                background: '#60a5fa'
              }
            },
            textPrimary: {
              ':hover': {
                background: '#dbeafe'
              }
            }
          },
          variants: [
            {
              props: { variant: 'text' },
              style: {
                color: '#2563eb',
                ':hover': {
                  background: '#dbeafe'
                }
              }
            },
            {
              props: { variant: 'outlined' },
              style: {
                color: '#2563eb',
                borderColor: '#2563eb',
                ':hover': {
                  color: '#3b82f6',
                  background: '#dbeafe',
                  borderColor: '#3b82f6'
                },
                '&:focus': {
                  background: '#f3f4f6',
                  color: '#2563eb',
                  borderColor: '#374151'
                },
                '&.Mui-disabled': {
                  borderColor: '#6b7280'
                }
              }
            }
          ]
        },
      },
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline 
          enableColorScheme
        />
        <style>{`
          body {
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif !important;
          }
          * {
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif !important;
          }
        `}</style>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
