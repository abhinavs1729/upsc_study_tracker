import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#fff',
      paper: '#fff',
    },
    text: {
      primary: '#222',
      secondary: '#555',
    },
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    divider: '#E0E0E0',
  },
  shape: {
    borderRadius: 0,
  },
  typography: {
    fontFamily: [
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Arial',
      'sans-serif',
    ].join(','),
    allVariants: {
      fontFamily: [
        'Roboto',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      fontFamily: 'Roboto',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      fontFamily: 'Roboto',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      fontFamily: 'Roboto',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          borderRadius: 0,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          textTransform: 'none',
          fontWeight: 500,
          backgroundColor: '#f5f5f5',
          color: '#222',
          fontFamily: 'Roboto',
          '&:hover': {
            backgroundColor: '#e0e0e0',
          },
        },
        contained: {
          backgroundColor: '#1976d2',
          color: '#fff',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: [
            'Roboto',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Arial',
            'sans-serif',
          ].join(','),
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: 0,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          color: '#222',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          borderRadius: 0,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': {
            fontFamily: 'Roboto',
          },
          '& .MuiInputLabel-root': {
            fontFamily: 'Roboto',
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
        },
      },
    },
    MuiDialogContentText: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontFamily: 'Roboto',
        },
        secondary: {
          fontFamily: 'Roboto',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
          borderRadius: 0,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
          borderRadius: 0,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: 'Roboto',
          borderRadius: 0,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto',
          borderRadius: 0,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          '&:last-child': {
            paddingBottom: 16,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
  },
});

export default theme; 