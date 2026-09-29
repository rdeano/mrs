import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, IconButton,
    InputLabel, MenuItem, Select, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add, Delete, Edit, ExpandMore, InfoOutlined } from '@mui/icons-material';
import { peso, longDate as fmt } from '@/utils/format';
import SearchField from '@/Components/Shared/SearchField';

function EntryForm({ open, onClose, periodId, partners, entry }) {
    const editing = Boolean(entry);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        pnl_period_id: periodId ?? '',
        partner_id:    entry?.partner_id   ?? '',
        amount:        entry?.amount       ?? '',
        payment_date:  entry?.payment_date ?? '',
        method:        entry?.method       ?? '',
        reference_no:  entry?.reference_no ?? '',
        notes:         entry?.notes        ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            put(`/partner-payments/${entry.id}`, opts);
        } else {
            post('/partner-payments', opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Partner Payment' : 'Record Partner Payment'}</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.5} pt={1}>
                        <FormControl fullWidth required error={!!errors.partner_id}>
                            <InputLabel>Partner</InputLabel>
                            <Select
                                label="Partner"
                                value={data.partner_id}
                                onChange={(e) => setData('partner_id', e.target.value)}
                                autoFocus
                            >
                                {partners.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>{p.name}{p.is_active ? '' : ' (inactive)'}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Amount"
                                type="number"
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                error={!!errors.amount}
                                helperText={errors.amount}
                                fullWidth
                                required
                                inputProps={{ step: 'any', min: 0.01 }}
                            />
                            <TextField
                                label="Payment Date"
                                type="date"
                                value={data.payment_date}
                                onChange={(e) => setData('payment_date', e.target.value)}
                                error={!!errors.payment_date}
                                helperText={errors.payment_date}
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Stack>

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Method"
                                placeholder="Cash, Check, Bank Transfer..."
                                value={data.method}
                                onChange={(e) => setData('method', e.target.value)}
                                error={!!errors.method}
                                helperText={errors.method}
                                fullWidth
                            />
                            <TextField
                                label="Reference No."
                                value={data.reference_no}
                                onChange={(e) => setData('reference_no', e.target.value)}
                                error={!!errors.reference_no}
                                helperText={errors.reference_no}
                                fullWidth
                            />
                        </Stack>

                        <TextField
                            label="Notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            multiline
                            rows={2}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button type="button" onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>
                        {editing ? 'Save Changes' : 'Record Payment'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

// YYYY-MM-DD -> MM/DD/YYYY (matches the rest of the app / the Excel)
const mdY = (d) => {
    if (!d) return '';
    const [y, m, day] = String(d).slice(0, 10).split('-');
    return `${m}/${day}/${y}`;
};

const pct = (v) => `${parseFloat(Number(v).toFixed(2))}%`;

// Positive = company still owes the partner; negative = partner drew more than earned.
function BalanceText({ value, variant = 'body2' }) {
    const v = Number(value);
    const color = v > 0 ? 'warning.dark' : v < 0 ? 'error.main' : 'success.main';
    return <Typography component="span" variant={variant} fontWeight={700} color={color}>{v < 0 ? '−' : ''}{peso(Math.abs(v))}</Typography>;
}

function balanceLabel(v) {
    if (v > 0) return 'Still owed to partner';
    if (v < 0) return 'Overdrawn (paid more than earned)';
    return 'Fully paid';
}

function ShareTimeline({ timeline }) {
    return (
        <Stack spacing={0.5}>
            {timeline.map((t, i) => (
                <Stack key={t.from} direction="row" spacing={1} alignItems="baseline">
                    <Typography variant="body2" fontWeight={700} sx={{ minWidth: 56 }}>{pct(t.share_percentage)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {/* The first rate covers everything before the next change, so its own start date is noise. */}
                        {i === 0
                            ? (t.to ? `up to ${mdY(t.to)}` : 'all dates')
                            : (t.to ? `${mdY(t.from)} – ${mdY(t.to)}` : `from ${mdY(t.from)}`)}
                        {t.notes ? ` · ${t.notes}` : ''}
                    </Typography>
                </Stack>
            ))}
        </Stack>
    );
}

function PartnerCard({ row }) {
    return (
        <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5} gap={1}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>{row.partner}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Current share: <b>{pct(row.share_percentage)}</b>
                        </Typography>
                    </Box>
                    {row.share_ended_on ? (
                        <Tooltip title={row.ended_note ?? ''}>
                            <Chip size="small" label={`Share ended ${mdY(row.share_ended_on)}`} />
                        </Tooltip>
                    ) : (
                        <Chip size="small" color={row.is_active ? 'success' : 'default'} variant="outlined" label={row.is_active ? 'Active' : 'Inactive'} />
                    )}
                </Stack>

                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing="0.04em">
                    Share history
                </Typography>
                <Box mt={0.5} mb={2}><ShareTimeline timeline={row.timeline} /></Box>

                <Divider sx={{ mb: 1.5 }} />
                <Stack spacing={0.75}>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Earned (all periods)</Typography>
                        <Typography variant="body2" fontWeight={600}>{peso(row.entitled)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">Paid out</Typography>
                        <Typography variant="body2" fontWeight={600}>− {peso(row.paid)}</Typography>
                    </Stack>
                    <Divider />
                    <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                        <Typography variant="body2" fontWeight={600}>{balanceLabel(row.balance)}</Typography>
                        <BalanceText value={row.balance} variant="subtitle1" />
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}

// "33.33%" or, when the rate changed mid-period, "33.33% → 0% from 09/16"
function ratesLabel(rates) {
    if (!rates?.length) return '—';
    return rates
        .map((r, i) => (i === 0 ? pct(r.share_percentage) : `${pct(r.share_percentage)} from ${mdY(r.from).slice(0, 5)}`))
        .join(' → ');
}

const splitChanged = (period, balances) => balances.some((b) => (period.partners[b.id]?.rates?.length ?? 0) > 1);

const EMPTY_ROW = { rates: [], earned: 0, paid: 0 };

function PeriodSummary({ period, balances }) {
    return (
        <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: '0 !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 2 }} flexWrap="wrap" gap={1}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700}>This period: {period.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            What each partner earned from this period's net profit vs. what was paid out in this period.
                        </Typography>
                    </Box>
                    <Stack alignItems="flex-end">
                        <Typography variant="caption" color="text.secondary">Net Profit (after BIR & Savings)</Typography>
                        <Typography variant="subtitle1" fontWeight={700} color={period.net_profit < 0 ? 'error.main' : 'text.primary'}>
                            {peso(period.net_profit)}
                        </Typography>
                    </Stack>
                </Stack>
                {splitChanged(period, balances) && (
                    <Alert severity="info" sx={{ mx: 2, mt: 1.5, py: 0 }}>
                        The share split changed during this period. Each day uses the rate in effect on that day.
                    </Alert>
                )}
                <TableContainer sx={{ mt: 1 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Partner</TableCell>
                                <TableCell>Share this period</TableCell>
                                <TableCell align="right">Earned</TableCell>
                                <TableCell align="right">Paid this period</TableCell>
                                <TableCell align="right">Earned − Paid</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {balances.map((b) => {
                                const row = period.partners[b.id] ?? EMPTY_ROW;
                                return (
                                    <TableRow key={b.id} hover>
                                        <TableCell sx={{ fontWeight: 500 }}>{b.partner}</TableCell>
                                        <TableCell>{ratesLabel(row.rates)}</TableCell>
                                        <TableCell align="right">{peso(row.earned)}</TableCell>
                                        <TableCell align="right">{peso(row.paid)}</TableCell>
                                        <TableCell align="right"><BalanceText value={row.earned - row.paid} /></TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
}

const sep = { borderLeft: '1px solid', borderColor: 'divider' };

function PeriodBreakdown({ breakdown, balances, currentPeriodId }) {
    return (
        <Accordion disableGutters sx={{ mb: 3, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Box>
                    <Typography variant="subtitle1" fontWeight={700}>Earnings by period</Typography>
                    <Typography variant="caption" color="text.secondary">
                        How the all-time totals add up, period by period. Hover an Earned amount to see the share % used.
                    </Typography>
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell rowSpan={2}>Period</TableCell>
                                <TableCell rowSpan={2} align="right">Net Profit</TableCell>
                                {balances.map((b) => (
                                    <TableCell key={b.id} colSpan={2} align="center" sx={{ ...sep, fontWeight: 700 }}>{b.partner}</TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                {balances.map((b) => [
                                    <TableCell key={`${b.id}-e`} align="right" sx={sep}>Earned</TableCell>,
                                    <TableCell key={`${b.id}-p`} align="right">Paid</TableCell>,
                                ])}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {breakdown.map((period) => (
                                <TableRow key={period.id} hover selected={period.id === currentPeriodId}>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {period.name}{period.is_closed ? ' 🔒' : ''}
                                        {splitChanged(period, balances) && (
                                            <Chip size="small" label="split changed" color="info" variant="outlined" sx={{ ml: 1, height: 20 }} />
                                        )}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: period.net_profit < 0 ? 'error.main' : undefined }}>{peso(period.net_profit)}</TableCell>
                                    {balances.map((b) => {
                                        const row = period.partners[b.id] ?? EMPTY_ROW;
                                        return [
                                            <TableCell key={`${b.id}-e`} align="right" sx={{ ...sep, color: row.earned ? undefined : 'text.disabled' }}>
                                                <Tooltip title={`Share: ${ratesLabel(row.rates)}`}>
                                                    <span>{peso(row.earned)}</span>
                                                </Tooltip>
                                            </TableCell>,
                                            <TableCell key={`${b.id}-p`} align="right" sx={{ color: row.paid ? undefined : 'text.disabled' }}>
                                                {peso(row.paid)}
                                            </TableCell>,
                                        ];
                                    })}
                                </TableRow>
                            ))}
                            <TableRow sx={{ '& td': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                                <TableCell>Total</TableCell>
                                <TableCell align="right">{peso(breakdown.reduce((sum, p) => sum + p.net_profit, 0))}</TableCell>
                                {balances.map((b) => [
                                    <TableCell key={`${b.id}-e`} align="right" sx={sep}>{peso(b.entitled)}</TableCell>,
                                    <TableCell key={`${b.id}-p`} align="right">
                                        {peso(b.paid)}
                                        {b.unassigned_paid > 0 && (
                                            <Tooltip title={`Includes ${peso(b.unassigned_paid)} recorded without a period`}>
                                                <InfoOutlined sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle', color: 'text.disabled' }} />
                                            </Tooltip>
                                        )}
                                    </TableCell>,
                                ])}
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </AccordionDetails>
        </Accordion>
    );
}

export default function PartnerPaymentsIndex({
    periods, currentPeriod, entries, partners, total, search, partnerBalances, allTimeNetProfit, periodBreakdown, splitWarnings,
}) {
    const { auth } = usePage().props;
    const crossPeriod = Boolean(search);
    const canEdit = auth.permissions.includes('manage partners') && !crossPeriod && !currentPeriod?.is_closed;
    const [formOpen, setFormOpen] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');
    const [searchInput, setSearchInput] = useState(search ?? '');
    const currentPeriodRow = periodBreakdown.find((p) => p.id === currentPeriod?.id);

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/partner-payments', { period_id: id }, { preserveState: false });
    };

    const handleSearchChange = (value) => {
        setSearchInput(value);
        router.get('/partner-payments', value.trim() ? { q: value.trim() } : {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleDelete = (id) => {
        if (confirm('Delete this partner payment?')) {
            router.delete(`/partner-payments/${id}`);
        }
    };

    return (
        <AppLayout title="Partner Payments">
            <Head title="Partner Payments" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Partner Payments</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Each partner's share of net profit, and the cash draws paid out against it. Not part of the P&L.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <SearchField value={searchInput} onChange={handleSearchChange} placeholder="Search partner, reference..." />
                    {!crossPeriod && (
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Period</InputLabel>
                            <Select value={selectedPeriodId} label="Period" onChange={(e) => changePeriod(e.target.value)}>
                                {periods.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>{p.name}{p.is_closed ? ' 🔒' : ''}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    {canEdit && (
                        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditEntry(null); setFormOpen(true); }}>
                            Record Payment
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1} mb={1.5} flexWrap="wrap">
                <Typography variant="subtitle1" fontWeight={700}>Partner Balances (all periods)</Typography>
                <Tooltip title="Earned = each day's Net Profit (after BIR & Savings) × the partner's share % on that day, added up across all periods — the same figures as the partner rows on the P&L. Changing a share % on the Partners page only affects days from its effective date onward.">
                    <InfoOutlined sx={{ fontSize: 16, color: 'text.disabled' }} />
                </Tooltip>
                <Box flexGrow={1} />
                <Typography variant="body2" color="text.secondary">
                    All-time Net Profit: <b>{peso(allTimeNetProfit)}</b>
                </Typography>
            </Stack>
            {splitWarnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Partner shares don't add up to 100% for:{' '}
                    {splitWarnings.map((w) => (
                        `${w.to ? `${mdY(w.from)} – ${mdY(w.to)}` : `${mdY(w.from)} onward`} (${pct(w.total)})`
                    )).join('; ')}
                    . Fix the rates on the <Link href="/partners">Partners page</Link>.
                </Alert>
            )}
            <Box sx={{ display: 'grid', gap: 2, mb: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
                {partnerBalances.map((row) => <PartnerCard key={row.id} row={row} />)}
            </Box>

            {currentPeriodRow && !crossPeriod && <PeriodSummary period={currentPeriodRow} balances={partnerBalances} />}

            <PeriodBreakdown breakdown={periodBreakdown} balances={partnerBalances} currentPeriodId={currentPeriod?.id} />

            {search && (
                <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                    <Chip
                        label={`Showing: results for "${search}" (all periods)`}
                        color="primary"
                        variant="outlined"
                        onDelete={() => { setSearchInput(''); router.get('/partner-payments'); }}
                    />
                </Stack>
            )}

            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                {crossPeriod ? 'Payments' : `Payments recorded in ${currentPeriod?.name ?? 'this period'}`}
            </Typography>
            <Card>
                <CardContent sx={{ p: '0 !important' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Partner</TableCell>
                                    {crossPeriod && <TableCell>Period</TableCell>}
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell>Method</TableCell>
                                    <TableCell>Reference</TableCell>
                                    <TableCell>Notes</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={crossPeriod ? 8 : 7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            {search ? 'No partner payments match your search.' : 'No partner payments for this period.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    entries.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(row.payment_date)}</TableCell>
                                            <TableCell fontWeight={500}>{row.partner?.name ?? '—'}</TableCell>
                                            {crossPeriod && <TableCell sx={{ color: 'text.secondary' }}>{row.period?.name ?? '—'}</TableCell>}
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>{peso(row.amount)}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary' }}>{row.method ?? '—'}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary' }}>{row.reference_no ?? '—'}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary', maxWidth: 200 }}>{row.notes ?? '—'}</TableCell>
                                            {canEdit && (
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                        <IconButton size="small" onClick={() => { setEditEntry(row); setFormOpen(true); }}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Stack>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {entries.length > 0 && (
                        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                            <Stack direction="row" justifyContent="flex-end" spacing={2}>
                                <Typography variant="body2" color="text.secondary">Total Paid:</Typography>
                                <Typography variant="body2" fontWeight={700}>{peso(total)}</Typography>
                            </Stack>
                        </Box>
                    )}
                </CardContent>
            </Card>

            <EntryForm
                key={editEntry?.id ?? 'new'}
                open={formOpen}
                onClose={() => setFormOpen(false)}
                periodId={currentPeriod?.id}
                partners={partners}
                entry={editEntry}
            />
        </AppLayout>
    );
}
