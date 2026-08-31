import { useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import {
    AppBar, Avatar, Box, Divider, Drawer, IconButton,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText,
    Menu, MenuItem, Snackbar, Alert, Toolbar, Typography,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    TrendingUp as PnlIcon,
    Receipt as ExpenseIcon,
    ShoppingCart as PurchaseIcon,
    Description as InvoiceIcon,
    Payments as PaymentsIcon,
    Inventory2 as ItemIcon,
    People as ContactIcon,
    LocalShipping as SupplierIcon,
    Storefront as CustomerIcon,
    PersonOutline as EmployeeIcon,
    Handshake as PartnerIcon,
    DeleteOutline as WastageIcon,
    ReportProblemOutlined as ResekoIcon,
    History as LogIcon,
    Settings as SettingsIcon,
    KeyboardArrowDown,
} from '@mui/icons-material';

const DRAWER_WIDTH = 252;

const NAV_GROUPS = [
    {
        items: [
            { label: 'Dashboard',    href: '/dashboard',    icon: <DashboardIcon fontSize="small" />, permission: 'view dashboard' },
            { label: 'P&L Statement',href: '/pnl',          icon: <PnlIcon fontSize="small" />,       permission: 'view pnl' },
        ],
    },
    {
        label: 'TRANSACTIONS',
        items: [
            { label: 'Expenses',  href: '/expenses',  icon: <ExpenseIcon fontSize="small" />,  permission: 'view expenses' },
            { label: 'Purchases', href: '/purchases', icon: <PurchaseIcon fontSize="small" />, permission: 'view purchases' },
            { label: 'Receivables', href: '/receivables', icon: <InvoiceIcon fontSize="small" />, permission: 'view invoices' },
            { label: 'Payments', href: '/payments', icon: <PaymentsIcon fontSize="small" />, permission: 'view invoices' },
            { label: 'Wastages',  href: '/wastages',  icon: <WastageIcon fontSize="small" />,  permission: 'view expenses' },
            { label: 'Reseko',    href: '/reseko',    icon: <ResekoIcon fontSize="small" />,   permission: 'view expenses' },
            { label: 'Salaries',  href: '/salaries',  icon: <EmployeeIcon fontSize="small" />, permission: 'view salaries' },
        ],
    },
    {
        label: 'CATALOG',
        items: [
            { label: 'Items', href: '/items', icon: <ItemIcon fontSize="small" />, permission: 'view items' },
        ],
    },
    {
        label: 'PEOPLE',
        items: [
            { label: 'Contacts', href: '/contacts', icon: <ContactIcon fontSize="small" />, permission: 'view contacts' },
            { label: 'Suppliers', href: '/suppliers', icon: <SupplierIcon fontSize="small" />, permission: 'view suppliers' },
            { label: 'Customers', href: '/customers', icon: <CustomerIcon fontSize="small" />, permission: 'view customers' },
            { label: 'Partners', href: '/partners', icon: <PartnerIcon fontSize="small" />, permission: 'view partners' },
        ],
    },
    {
        label: 'SYSTEM',
        items: [
            { label: 'Activity Log', href: '/activity-log', icon: <LogIcon fontSize="small" />,     permission: 'view activity log' },
            { label: 'Settings',     href: '/settings/pnl-structure', icon: <SettingsIcon fontSize="small" />, permission: 'manage settings' },
        ],
    },
];

function initials(name = '') {
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AppLayout({ children, title }) {
    const { auth, flash } = usePage().props;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false });

    useEffect(() => {
        if (flash?.success) {
            setSnackbar({ open: true, message: flash.success, severity: 'success' });
        } else if (flash?.error) {
            setSnackbar({ open: true, message: flash.error, severity: 'error' });
        }
    }, [flash?.success, flash?.error]);

    const permissions = auth?.permissions ?? [];
    const canSee = (perm) => !perm || permissions.includes(perm);
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    const isActive = (href) =>
        href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href);

    const drawer = (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#0F172A',
                color: 'rgba(255,255,255,0.85)',
            }}
        >
            {/* Logo */}
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography variant="h6" fontWeight={700} color="#fff" letterSpacing={-0.3}>
                    MRS Trading
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block', mt: 0.25 }}>
                    Meat Trading System
                </Typography>
            </Box>

            {/* Nav */}
            <Box className="dark-scroll" sx={{ flex: 1, overflow: 'hidden auto', py: 1.5 }}>
                {NAV_GROUPS.map((group, gi) => (
                    <Box key={gi} sx={{ mb: 1 }}>
                        {group.label && (
                            <Typography
                                variant="caption"
                                sx={{ px: 3, py: 1, display: 'block', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.08em' }}
                            >
                                {group.label}
                            </Typography>
                        )}
                        <List disablePadding dense>
                            {group.items.map((item) =>
                                canSee(item.permission) ? (
                                    <ListItem key={item.href} disablePadding sx={{ px: 1.5 }}>
                                        <ListItemButton
                                            component={Link}
                                            href={item.href}
                                            selected={isActive(item.href)}
                                            sx={{
                                                borderRadius: 1.5,
                                                py: 0.85,
                                                color: isActive(item.href) ? '#fff' : 'rgba(255,255,255,0.6)',
                                                bgcolor: isActive(item.href) ? 'rgba(37,99,235,0.75)' : 'transparent',
                                                '&:hover': {
                                                    bgcolor: isActive(item.href)
                                                        ? 'rgba(37,99,235,0.85)'
                                                        : 'rgba(255,255,255,0.06)',
                                                    color: '#fff',
                                                },
                                                '&.Mui-selected': { bgcolor: 'rgba(37,99,235,0.75)' },
                                                '&.Mui-selected:hover': { bgcolor: 'rgba(37,99,235,0.85)' },
                                            }}
                                        >
                                            <ListItemIcon
                                                sx={{
                                                    minWidth: 34,
                                                    color: isActive(item.href) ? '#fff' : 'rgba(255,255,255,0.5)',
                                                }}
                                            >
                                                {item.icon}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={item.label}
                                                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive(item.href) ? 600 : 400 }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ) : null
                            )}
                        </List>
                    </Box>
                ))}
            </Box>

            {/* Bottom user info */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Box
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer',
                        p: 1, borderRadius: 2,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                    }}
                >
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#2563EB', fontSize: '0.75rem' }}>
                        {initials(auth?.user?.name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} color="#fff" noWrap>
                            {auth?.user?.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }} noWrap>
                            {auth?.user?.email}
                        </Typography>
                    </Box>
                    <KeyboardArrowDown sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />
                </Box>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Mobile AppBar */}
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    display: { sm: 'none' },
                    bgcolor: '#0F172A',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <Toolbar>
                    <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2 }}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" fontWeight={700}>
                        {title}
                    </Typography>
                </Toolbar>
            </AppBar>

            {/* Sidebar */}
            <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 0, overflow: 'hidden' },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 0, overflow: 'hidden' },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>

            {/* Page header + content */}
            <Box
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
                    minWidth: 0,
                    mt: { xs: 7, sm: 0 },
                }}
            >
                {/* Desktop page header bar */}
                <Box
                    sx={{
                        display: { xs: 'none', sm: 'flex' },
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 3,
                        py: 1.75,
                        bgcolor: 'background.paper',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                        {title}
                    </Typography>
                    <Box
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderRadius: 2, px: 1.5, py: 0.75, '&:hover': { bgcolor: 'grey.100' } }}
                    >
                        <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: '0.75rem' }}>
                            {initials(auth?.user?.name)}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500}>{auth?.user?.name}</Typography>
                        <KeyboardArrowDown sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </Box>
                </Box>

                {/* Main content */}
                <Box sx={{ flex: 1, p: { xs: 2, sm: 3 } }}>
                    {children}
                </Box>
            </Box>

            {/* User menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{ sx: { mt: 1, minWidth: 180 } }}
            >
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="body2" fontWeight={600}>{auth?.user?.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{auth?.user?.email}</Typography>
                </Box>
                <Divider />
                <MenuItem
                    onClick={() => { setAnchorEl(null); router.post('/logout'); }}
                    sx={{ color: 'error.main', mt: 0.5 }}
                >
                    Sign Out
                </MenuItem>
            </Menu>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
