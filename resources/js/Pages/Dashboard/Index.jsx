import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import Grid from '@mui/material/Grid2';
import {
    Box, Card, CardContent, Chip, Divider, Stack, Typography,
} from '@mui/material';
import {
    TrendingUp, TrendingDown, AccountBalance, ReceiptLong,
    ArrowUpward, ArrowDownward,
} from '@mui/icons-material';
import { peso, shortDate } from '@/utils/format';

const STATUS_COLOR = {
    draft:   'default',
    sent:    'info',
    partial: 'warning',
    paid:    'success',
    overdue: 'error',
};

function StatCard({ label, value, icon, accentColor }) {
    const num = Number(value ?? 0);
    const isNeg = num < 0;
    const displayColor = isNeg ? '#DC2626' : accentColor;

    return (
        <Card sx={{ height: '100%', borderLeft: `4px solid ${displayColor}`, borderRadius: '0 12px 12px 0' }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500} letterSpacing="0.04em" textTransform="uppercase">
                            {label}
                        </Typography>
                        <Typography variant="h5" fontWeight={700} color={displayColor} mt={0.5} letterSpacing={-0.5}>
                            {peso(num)}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            width: 44, height: 44, borderRadius: 2.5,
                            bgcolor: `${displayColor}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: displayColor, flexShrink: 0,
                        }}
                    >
                        {icon}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

function SectionCard({ title, children }) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
                    {title}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {children}
            </CardContent>
        </Card>
    );
}

export default function Dashboard({ dateRange, stats, receivablesAging, recentInvoices }) {
    const hasAging = receivablesAging?.some((r) => Number(r.amount) > 0);
    const hasInvoices = recentInvoices?.length > 0;

    return (
        <AppLayout title="Dashboard">
            <Head title="Dashboard" />

            {/* All-time range */}
            {dateRange && (
                <Stack direction="row" alignItems="center" spacing={1} mb={2.5}>
                    <Typography variant="body2" color="text.secondary">All-time:</Typography>
                    <Chip
                        label={`${shortDate(dateRange.start)} – ${shortDate(dateRange.end)}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                </Stack>
            )}

            {/* Stat cards */}
            <Grid container spacing={2.5} mb={3}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard label="Total Sales"        value={stats?.total_sales}  icon={<TrendingUp />}     accentColor="#059669" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard label="Gross Profit"       value={stats?.gross_profit} icon={<AccountBalance />} accentColor="#0284C7" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard label="Net Profit / Loss"  value={stats?.net_profit}   icon={<TrendingDown />}   accentColor="#7C3AED" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <StatCard label="Total Receivables"  value={stats?.total_ar}     icon={<ReceiptLong />}    accentColor="#D97706" />
                </Grid>
            </Grid>

            {/* Lower panels */}
            <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <SectionCard title="Receivables Aging">
                        {hasAging ? (
                            <Stack spacing={1.5}>
                                {receivablesAging.map((row) => (
                                    <Box
                                        key={row.bucket}
                                        onClick={() => router.get('/payments', {
                                            ...(row.from !== null ? { aging_from: row.from } : {}),
                                            ...(row.to !== null ? { aging_to: row.to } : {}),
                                        })}
                                        sx={{
                                            cursor: 'pointer', mx: -1, px: 1, py: 0.5, borderRadius: 1,
                                            '&:hover': { bgcolor: 'grey.50' },
                                        }}
                                    >
                                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                            <Typography variant="body2" color="text.secondary">{row.bucket}</Typography>
                                            <Typography variant="body2" fontWeight={600}>{peso(row.amount)}</Typography>
                                        </Stack>
                                        <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'grey.100', overflow: 'hidden' }}>
                                            <Box
                                                sx={{
                                                    height: '100%', borderRadius: 2,
                                                    bgcolor: Number(row.amount) > 0 ? 'warning.main' : 'grey.200',
                                                    width: `${Math.min(100, (Number(row.amount) / (stats?.total_ar || 1)) * 100)}%`,
                                                    transition: 'width 0.4s ease',
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                                No outstanding receivables.
                            </Typography>
                        )}
                    </SectionCard>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    <SectionCard title="Recent Receivables">
                        {hasInvoices ? (
                            <Stack divider={<Divider />}>
                                {recentInvoices.map((inv) => (
                                    <Stack
                                        key={inv.id}
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        py={1.25}
                                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' }, mx: -1, px: 1, borderRadius: 1 }}
                                        onClick={() => router.get('/receivables', inv.pnl_period_id ? { period_id: inv.pnl_period_id } : {})}
                                    >
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>{inv.invoice_no}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {inv.customer?.name ?? '—'}
                                            </Typography>
                                        </Box>
                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                            <Typography variant="body2" fontWeight={600}>
                                                {peso(inv.total_amount)}
                                            </Typography>
                                            <Chip
                                                label={inv.status}
                                                size="small"
                                                color={STATUS_COLOR[inv.status] ?? 'default'}
                                                sx={{ textTransform: 'capitalize', minWidth: 64 }}
                                            />
                                        </Stack>
                                    </Stack>
                                ))}
                            </Stack>
                        ) : (
                            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                                No receivables yet.
                            </Typography>
                        )}
                    </SectionCard>
                </Grid>
            </Grid>
        </AppLayout>
    );
}
