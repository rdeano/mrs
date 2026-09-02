import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import Grid from '@mui/material/Grid2';
import {
    Box, Card, CardContent, Chip, Divider, Stack, Typography,
} from '@mui/material';
import {
    ArrowUpward, ArrowDownward,
} from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { peso, shortDate } from '@/utils/format';

const STATUS_COLOR = {
    draft:   'default',
    sent:    'info',
    partial: 'warning',
    paid:    'success',
    overdue: 'error',
};

// Fixed categorical order (blue, orange, aqua) — never reassigned per render,
// so a series keeps its color if the set of metrics ever changes.
const TREND_SERIES_COLOR = { total_sales: '#2a78d6', gross_profit: '#eb6834', net_profit: '#1baf7a' };
const AGING_COLOR = '#2a78d6';    // single hue: aging is a magnitude comparison, not identity
const PAYABLES_COLOR = '#eb6834'; // second sequential context on the same screen takes the next slot's hue
// Expense categories ARE distinct named identities (Legal Fees vs Commission Payment,
// etc.), so this bar-per-category chart is a categorical job, not a sequential one —
// full 8-slot fixed order, "Other" folds into neutral gray rather than a 9th hue.
const CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const OTHER_CATEGORY_COLOR = '#898781';

// How many cells sit in a row at each breakpoint — must match the
// gridTemplateColumns values below so the right/bottom dividers land on
// actual row and column boundaries instead of dangling mid-row.
const KPI_COLS = { xs: 1, sm: 3, lg: 6 };

function kpiCellSx(index, total) {
    const edges = (cols) => {
        const rows = Math.ceil(total / cols);
        const lastRowStart = (rows - 1) * cols;
        return {
            right:  (index % cols) !== cols - 1 && index !== total - 1,
            bottom: index < lastRowStart,
        };
    };
    const xs = edges(KPI_COLS.xs);
    const sm = edges(KPI_COLS.sm);
    const lg = edges(KPI_COLS.lg);

    return {
        px: 2.5, py: 2,
        borderColor: 'divider',
        borderRightStyle: 'solid', borderBottomStyle: 'solid',
        borderRightWidth: xs.right ? 1 : 0,
        borderBottomWidth: xs.bottom ? 1 : 0,
        '@media (min-width:600px)': {
            borderRightWidth: sm.right ? 1 : 0,
            borderBottomWidth: sm.bottom ? 1 : 0,
        },
        '@media (min-width:1200px)': {
            borderRightWidth: lg.right ? 1 : 0,
            borderBottomWidth: lg.bottom ? 1 : 0,
        },
    };
}

function TrendBadge({ value }) {
    if (value === null || value === undefined) return null;
    const up = Number(value) >= 0;
    const Icon = up ? ArrowUpward : ArrowDownward;
    const color = up ? '#059669' : '#DC2626';

    return (
        <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
            <Icon sx={{ fontSize: 13, color }} />
            <Typography variant="caption" fontWeight={700} color={color}>
                {Math.abs(Number(value)).toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">vs last period</Typography>
        </Stack>
    );
}

function KpiStrip({ items }) {
    return (
        <Card sx={{ mb: 3 }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${KPI_COLS.xs}, 1fr)`,
                    '@media (min-width:600px)': { gridTemplateColumns: `repeat(${KPI_COLS.sm}, 1fr)` },
                    '@media (min-width:1200px)': { gridTemplateColumns: `repeat(${KPI_COLS.lg}, 1fr)` },
                }}
            >
                {items.map((item, i) => {
                    const num = Number(item.value ?? 0);
                    return (
                        <Box key={item.label} sx={kpiCellSx(i, items.length)}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500} letterSpacing="0.04em" textTransform="uppercase">
                                {item.label}
                            </Typography>
                            <Typography variant="h6" fontWeight={700} color={num < 0 ? '#DC2626' : 'text.primary'} mt={0.5} letterSpacing={-0.3}>
                                {peso(num)}
                            </Typography>
                            <TrendBadge value={item.trend} />
                        </Box>
                    );
                })}
            </Box>
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

// A line implies interpolation between points that were never measured — with
// only one or two periods on record that reads as a trend that doesn't exist
// yet, so this is a grouped bar (one group per period) instead of a line chart.
// It degrades gracefully to a single group and grows into a real comparison as
// more periods fill in.
function RevenueTrendChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                No period activity yet.
            </Typography>
        );
    }

    return (
        <BarChart
            dataset={data}
            height={280}
            xAxis={[{ scaleType: 'band', dataKey: 'label', tickLabelStyle: { fontSize: 11 } }]}
            yAxis={[{ valueFormatter: (v) => peso(v) }]}
            series={[
                { dataKey: 'total_sales',  label: 'Total Sales',  color: TREND_SERIES_COLOR.total_sales,  valueFormatter: (v) => peso(v) },
                { dataKey: 'gross_profit', label: 'Gross Profit', color: TREND_SERIES_COLOR.gross_profit, valueFormatter: (v) => peso(v) },
                { dataKey: 'net_profit',   label: 'Net Profit',   color: TREND_SERIES_COLOR.net_profit,   valueFormatter: (v) => peso(v) },
            ]}
            grid={{ horizontal: true }}
            margin={{ top: 40, left: 100, right: 10, bottom: 30 }}
            slotProps={{ legend: { direction: 'row', position: { vertical: 'top', horizontal: 'right' } } }}
        />
    );
}

// Horizontal bar chart where every row must stay clickable — including a
// ₱0.00 row, which renders at zero width and gives onItemClick nothing to hit.
// x-charts' own onAxisClick turned out unreliable here too: for a horizontal
// layout it has to guess whether the click belongs to the value axis or the
// category axis, and that guess picked the wrong one in testing. Computing the
// row directly from click Y position against the plot geometry (which this
// component already controls via height/margin) sidesteps that guess entirely.
function ClickableBarChart({ rows, onSelect, height, margin, ...props }) {
    const handleClick = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const top = margin?.top ?? 0;
        const bottom = margin?.bottom ?? 0;
        const plotHeight = height - top - bottom;
        const relY = event.clientY - rect.top - top;
        if (plotHeight <= 0 || relY < 0 || relY > plotHeight) return;

        const index = Math.min(rows.length - 1, Math.floor((relY / plotHeight) * rows.length));
        onSelect(rows[index]);
    };

    return (
        <Box onClick={handleClick} sx={{ cursor: 'pointer', height }}>
            <BarChart dataset={rows} height={height} margin={margin} {...props} />
        </Box>
    );
}

function AgingChart({ rows, onSelect }) {
    return (
        <ClickableBarChart
            rows={rows}
            onSelect={onSelect}
            height={220}
            layout="horizontal"
            yAxis={[{ scaleType: 'band', dataKey: 'bucket', tickLabelStyle: { fontSize: 12 } }]}
            xAxis={[{ valueFormatter: (v) => peso(v) }]}
            series={[{ dataKey: 'amount', label: 'Outstanding', color: AGING_COLOR, valueFormatter: (v) => peso(v) }]}
            grid={{ vertical: true }}
            margin={{ left: 145, right: 20, top: 10, bottom: 30 }}
            slotProps={{ legend: { hidden: true } }}
        />
    );
}

// Payables has no due_date to bucket by age like receivables — this shows the one
// breakdown payables actually has: expenses vs purchase orders outstanding.
function PayablesChart({ rows, onSelect }) {
    return (
        <ClickableBarChart
            rows={rows}
            onSelect={onSelect}
            height={140}
            layout="horizontal"
            yAxis={[{ scaleType: 'band', dataKey: 'bucket', tickLabelStyle: { fontSize: 12 } }]}
            xAxis={[{ valueFormatter: (v) => peso(v) }]}
            series={[{ dataKey: 'amount', label: 'Outstanding', color: PAYABLES_COLOR, valueFormatter: (v) => peso(v) }]}
            grid={{ vertical: true }}
            margin={{ left: 145, right: 20, top: 10, bottom: 30 }}
            slotProps={{ legend: { hidden: true } }}
        />
    );
}

// Each bar IS a named category, so color carries identity here (categorical),
// unlike Aging/Payables above where color is a plain magnitude cue (sequential).
function ExpensesByCategoryChart({ rows, onSelect }) {
    if (!rows || rows.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                No expenses recorded yet.
            </Typography>
        );
    }

    const categories = rows.map((r) => r.category);
    const colors = rows.map((r, i) => (r.category === 'Other' ? OTHER_CATEGORY_COLOR : CATEGORY_COLORS[i % CATEGORY_COLORS.length]));

    return (
        <ClickableBarChart
            rows={rows}
            onSelect={(row) => row.category !== 'Other' && onSelect(row)}
            height={Math.max(180, rows.length * 36)}
            layout="horizontal"
            yAxis={[{
                scaleType: 'band',
                dataKey: 'category',
                tickLabelStyle: { fontSize: 12 },
                colorMap: { type: 'ordinal', values: categories, colors },
            }]}
            xAxis={[{ valueFormatter: (v) => peso(v) }]}
            series={[{ dataKey: 'amount', label: 'Amount', valueFormatter: (v) => peso(v) }]}
            grid={{ vertical: true }}
            margin={{ left: 150, right: 20, top: 10, bottom: 30 }}
            slotProps={{ legend: { hidden: true } }}
        />
    );
}

export default function Dashboard({
    dateRange, stats, receivablesAging, recentInvoices, periodTrend, payablesBreakdown, expensesByCategory,
}) {
    const hasAging = receivablesAging?.some((r) => Number(r.amount) > 0);
    const hasInvoices = recentInvoices?.length > 0;

    const goToAgingBucket = (row) => router.get('/payments', {
        ...(row.from !== null ? { aging_from: row.from } : {}),
        ...(row.to !== null ? { aging_to: row.to } : {}),
    });

    const goToPayablesTab = (row) => router.get('/payables', { outstanding: 1, tab: row.tab });

    const goToExpenseCategory = (row) => router.get('/payables', { q: row.category, tab: 'expenses' });

    const kpis = [
        { label: 'Total Sales',       value: stats?.total_sales,  trend: stats?.trends?.total_sales },
        { label: 'Gross Profit',      value: stats?.gross_profit, trend: stats?.trends?.gross_profit },
        { label: 'BIR & Savings',     value: stats?.bir_savings,  trend: stats?.trends?.bir_savings },
        { label: 'Net Profit / Loss', value: stats?.net_profit,   trend: stats?.trends?.net_profit },
        { label: 'Total Receivables', value: stats?.total_ar },
        { label: 'Total Payables',    value: stats?.total_ap },
    ];

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

            <KpiStrip items={kpis} />

            {/* Revenue trend */}
            <Grid container spacing={2.5} mb={2.5}>
                <Grid size={12}>
                    <SectionCard title="Revenue & Profit by Period">
                        <RevenueTrendChart data={periodTrend} />
                    </SectionCard>
                </Grid>
            </Grid>

            {/* Lower panels */}
            <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <SectionCard title="Receivables Aging">
                        {hasAging ? (
                            <AgingChart rows={receivablesAging} onSelect={goToAgingBucket} />
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

            {/* Payables & expenses */}
            <Grid container spacing={2.5} mt={0.5}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <SectionCard title="Payables Breakdown">
                        {payablesBreakdown?.some((r) => Number(r.amount) > 0) ? (
                            <PayablesChart rows={payablesBreakdown} onSelect={goToPayablesTab} />
                        ) : (
                            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                                No outstanding payables.
                            </Typography>
                        )}
                    </SectionCard>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    <SectionCard title="Expenses by Category">
                        <ExpensesByCategoryChart rows={expensesByCategory} onSelect={goToExpenseCategory} />
                    </SectionCard>
                </Grid>
            </Grid>
        </AppLayout>
    );
}
