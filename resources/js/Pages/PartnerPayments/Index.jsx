import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, IconButton,
    InputLabel, MenuItem, Select, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add, Delete, Edit, InfoOutlined } from '@mui/icons-material';
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
                                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
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

export default function PartnerPaymentsIndex({
    periods, currentPeriod, entries, partners, total, totalsByPartner, search, partnerBalances,
}) {
    const { auth } = usePage().props;
    const crossPeriod = Boolean(search);
    const canEdit = auth.permissions.includes('manage partners') && !crossPeriod && !currentPeriod?.is_closed;
    const [formOpen, setFormOpen] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');
    const [searchInput, setSearchInput] = useState(search ?? '');

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
                        Cash draws paid out to each partner. Not part of the P&L — this is a record of profit already distributed.
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

            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: '0 !important' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pt: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Partner Balances</Typography>
                        <Tooltip title="Entitled = all-time Net Profit (after BIR & Savings) × each partner's current share %, same rule the P&L page applies everywhere. There's no historical snapshot of share % per period, so changing a partner's rate today re-prices their entitlement across every past period too — same as it already does on the P&L page.">
                            <InfoOutlined sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </Tooltip>
                    </Stack>
                    <TableContainer sx={{ mt: 1 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Partner</TableCell>
                                    <TableCell align="right">Share %</TableCell>
                                    <TableCell align="right">Entitled (all-time)</TableCell>
                                    <TableCell align="right">Paid (all-time)</TableCell>
                                    <TableCell align="right">Balance</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {partnerBalances.map((row) => (
                                    <TableRow key={row.partner} hover>
                                        <TableCell fontWeight={500}>{row.partner}</TableCell>
                                        <TableCell align="right">{row.share_percentage.toFixed(2)}%</TableCell>
                                        <TableCell align="right">{peso(row.entitled)}</TableCell>
                                        <TableCell align="right">{peso(row.paid)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: row.balance < 0 ? 'error.main' : 'success.main' }}>
                                            {peso(row.balance)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

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

            {totalsByPartner.length > 0 && (
                <Stack direction="row" spacing={1.5} flexWrap="wrap" mb={3}>
                    {totalsByPartner.map((row) => (
                        <Chip
                            key={row.partner}
                            label={`${row.partner}: ${peso(row.total)}`}
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                        />
                    ))}
                </Stack>
            )}

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
