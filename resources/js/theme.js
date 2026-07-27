import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#2563EB',
            dark: '#1D4ED8',
            light: '#3B82F6',
            contrastText: '#fff',
        },
        secondary: {
            main: '#0F766E',
            contrastText: '#fff',
        },
        error:   { main: '#DC2626' },
        warning: { main: '#D97706' },
        success: { main: '#059669' },
        info:    { main: '#0284C7' },
        background: {
            default: '#F1F5F9',
            paper:   '#FFFFFF',
        },
        text: {
            primary:   '#0F172A',
            secondary: '#64748B',
        },
        divider: '#E2E8F0',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 600 },
        subtitle1: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: { borderRadius: 10 },
    shadows: [
        'none',
        '0px 1px 3px rgba(0,0,0,0.06), 0px 1px 2px rgba(0,0,0,0.04)',
        '0px 4px 6px -1px rgba(0,0,0,0.07), 0px 2px 4px -1px rgba(0,0,0,0.04)',
        '0px 10px 15px -3px rgba(0,0,0,0.08), 0px 4px 6px -2px rgba(0,0,0,0.04)',
        ...Array(21).fill('0px 10px 15px -3px rgba(0,0,0,0.08)'),
    ],
    components: {
        MuiCssBaseline: {
            styleOverrides: `
                /* Global thin scrollbar */
                * {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(148,163,184,0.4) transparent;
                }
                *::-webkit-scrollbar {
                    width: 5px;
                    height: 5px;
                }
                *::-webkit-scrollbar-track {
                    background: transparent;
                }
                *::-webkit-scrollbar-thumb {
                    background-color: rgba(148,163,184,0.4);
                    border-radius: 99px;
                }
                *::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(148,163,184,0.7);
                }

                /* Darker thumb for dark backgrounds (sidebar) */
                .dark-scroll *::-webkit-scrollbar-thumb,
                .dark-scroll::-webkit-scrollbar-thumb {
                    background-color: rgba(255,255,255,0.15);
                }
                .dark-scroll *::-webkit-scrollbar-thumb:hover,
                .dark-scroll::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(255,255,255,0.28);
                }
                .dark-scroll * {
                    scrollbar-color: rgba(255,255,255,0.15) transparent;
                }
            `,
        },
        MuiCard: {
            defaultProps: { elevation: 1 },
            styleOverrides: {
                root: { borderRadius: 12, border: '1px solid #E2E8F0' },
            },
        },
        MuiCardContent: {
            styleOverrides: { root: { padding: '20px 24px', '&:last-child': { paddingBottom: 20 } } },
        },
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 8, paddingLeft: 16, paddingRight: 16 },
                sizeSmall: { paddingLeft: 12, paddingRight: 12 },
            },
        },
        MuiChip: {
            styleOverrides: { root: { fontWeight: 500 } },
        },
        MuiTableCell: {
            styleOverrides: {
                head: { fontWeight: 600, backgroundColor: '#F8FAFC', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
                root: { borderColor: '#E2E8F0' },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: { '&:last-child td': { borderBottom: 0 } },
            },
        },
        MuiTextField: {
            defaultProps: { size: 'small' },
        },
        MuiInputBase: {
            styleOverrides: { root: { borderRadius: '8px !important' } },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    margin: '2px 8px',
                    width: 'calc(100% - 16px)',
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(37,99,235,0.12)',
                        color: '#2563EB',
                        '& .MuiListItemIcon-root': { color: '#2563EB' },
                        '&:hover': { backgroundColor: 'rgba(37,99,235,0.16)' },
                    },
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                },
            },
        },
    },
});

export default theme;
