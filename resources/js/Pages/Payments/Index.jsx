import { useMemo, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, IconButton,
    InputLabel, List, ListItem, ListItemText, MenuItem, Select, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Typography,
} from '@mui/material';
import { Add, Delete, Payment as PaymentIcon } from '@mui/icons-material';
import { peso, longDate as fmt } from '@/utils/format';
import SearchField from '@/Components/Shared/SearchField';

const STATUS_COLOR = { sent: 'default', partial: 'warning', paid: 'success', overdue: 'error', draft: 'default' };
const STATUS_LABEL = { sent: 'Unpaid', partial: 'Partial', paid: 'Paid', overdue: 'Overdue', draft: 'Draft' };
const METHODS = ['Cash', 'Check', 'Bank Transfer', 'GCash', 'Other'];

function itemPaidStatus(item) {
    if (item.paid <= 0) return { label: 'Unpaid', color: 'default' };
    if (item.balance <= 0.0001) return { label: 'Paid', color: 'success' };
    return { label: 'Partial', color: 'warning' };
}

function PaymentForm({ invoice, onSaved, onCancel }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        invoice_id: invoice.id,
        payment_date: '',
        amount: '',
        tax_withheld: '',
        method: 'Cash',
        reference_no: '',
        bank_name: '',
        check_no: '',
        check_date: '',
        notes: '',
        allocations: invoice.items.map((it) => ({ invoice_item_id: it.id, amount: '' })),
    });

    const isCheck = data.method === 'Check';

    const setAllocation = (index, value) => {
        setData('allocations', data.allocations.map((a, i) => (i === index ? { ...a, amount: value } : a)));
    };

    const allocatedTotal = data.allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const amountNum = Number(data.amount) || 0;
    const taxNum = Number(data.tax_withheld) || 0;
    const settledTotal = amountNum + taxNum;
    const balanced = Math.abs(allocatedTotal - settledTotal) < 0.005;

    const autoFill = () => {
        let remaining = settledTotal;
        const next = invoice.items.map((it) => {
            const cap = Math.max(0, it.balance);
            const take = Math.min(cap, remaining);
            remaining -= take;
            return { invoice_item_id: it.id, amount: take > 0 ? take.toFixed(2) : '' };
        });
        setData('allocations', next);
    };

    const submit = (e) => {
        e.preventDefault();
        post('/payments', { onSuccess: () => { reset(); onSaved(); } });
    };

    return (
        <form onSubmit={submit}>
            <Stack spacing={2.5} pt={1}>
                <Stack direction="row" spacing={2}>
                    <TextField
                        label="Amount Received" type="number" fullWidth required autoFocus
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value)}
                        error={!!errors.amount} helperText={errors.amount || 'Actual cash/check amount'}
                        inputProps={{ step: 'any', min: 0 }}
                    />
                    <TextField
                        label="Withholding Tax" type="number" fullWidth
                        value={data.tax_withheld}
                        onChange={(e) => setData('tax_withheld', e.target.value)}
                        error={!!errors.tax_withheld} helperText={errors.tax_withheld || 'Tax the customer deducted, if any'}
                        inputProps={{ step: 'any', min: 0 }}
                    />
                    <TextField
                        label="Date" type="date" fullWidth required
                        value={data.payment_date}
                        onChange={(e) => setData('payment_date', e.target.value)}
                        error={!!errors.payment_date} helperText={errors.payment_date}
                        InputLabelProps={{ shrink: true }}
                    />
                </Stack>
                {taxNum > 0 && (
                    <Typography variant="caption" color="text.secondary">
                        Settles {peso(settledTotal)} of the invoice ({peso(amountNum)} received + {peso(taxNum)} tax withheld).
                    </Typography>
                )}
                <Stack direction="row" spacing={2}>
                    <FormControl fullWidth>
                        <InputLabel>Method</InputLabel>
                        <Select label="Method" value={data.method} onChange={(e) => setData('method', e.target.value)}>
                            {METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </Select>
                    </FormControl>
                    {isCheck ? (
                        <TextField
                            label="Bank Name" fullWidth required
                            value={data.bank_name}
                            onChange={(e) => setData('bank_name', e.target.value)}
                            error={!!errors.bank_name} helperText={errors.bank_name}
                        />
                    ) : (
                        <TextField
                            label="Reference No." fullWidth
                            value={data.reference_no}
                            onChange={(e) => setData('reference_no', e.target.value)}
                            error={!!errors.reference_no} helperText={errors.reference_no}
                        />
                    )}
                </Stack>

                {isCheck && (
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Check No." fullWidth required
                            value={data.check_no}
                            onChange={(e) => setData('check_no', e.target.value)}
                            error={!!errors.check_no} helperText={errors.check_no}
                        />
                        <TextField
                            label="Check Date" type="date" fullWidth required
                            value={data.check_date}
                            onChange={(e) => setData('check_date', e.target.value)}
                            error={!!errors.check_date} helperText={errors.check_date || 'Date written on the check'}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Stack>
                )}

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">ALLOCATE TO ITEMS</Typography>
                    <Button type="button" size="small" onClick={autoFill}>Auto-fill</Button>
                </Stack>

                <Stack spacing={1}>
                    {invoice.items.map((it, index) => (
                        <Stack key={it.id} direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ flex: 2 }}>
                                <Typography variant="body2">{it.item_name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Balance: {peso(it.balance)} of {peso(it.amount)}
                                </Typography>
                            </Box>
                            <TextField
                                label="Allocate" type="number" size="small" sx={{ flex: 1 }}
                                value={data.allocations[index].amount}
                                onChange={(e) => setAllocation(index, e.target.value)}
                                error={!!errors[`allocations.${index}.amount`]}
                                inputProps={{ step: 'any', min: 0 }}
                            />
                        </Stack>
                    ))}
                </Stack>

                {errors.allocations && (
                    <Typography variant="caption" color="error">{errors.allocations}</Typography>
                )}

                <Stack direction="row" justifyContent="space-between" sx={{
                    bgcolor: balanced ? 'success.50' : 'error.50',
                    border: '1px solid', borderColor: balanced ? 'success.200' : 'error.200',
                    borderRadius: 2, px: 2, py: 1,
                }}>
                    <Typography variant="body2" color={balanced ? 'success.dark' : 'error.dark'}>
                        Allocated: {peso(allocatedTotal)} / {peso(settledTotal)}
                    </Typography>
                    {!balanced && <Typography variant="caption" color="error.dark">Must match amount received + tax withheld</Typography>}
                </Stack>

                <TextField
                    label="Notes"
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                    multiline rows={2} fullWidth
                />
            </Stack>
            <Divider sx={{ mt: 2.5 }} />
            <DialogActions sx={{ px: 0, py: 2 }}>
                <Button type="button" onClick={onCancel} color="inherit">Back</Button>
                <Button type="submit" variant="contained" disabled={processing || !balanced || amountNum <= 0}>
                    Record Payment
                </Button>
            </DialogActions>
        </form>
    );
}

function PaymentDialog({ open, onClose, invoice, canEdit }) {
    const [mode, setMode] = useState('list');

    if (!invoice) return null;

    const handleDeletePayment = (id) => {
        if (!confirm('Delete this payment? Its item allocations will be removed too.')) return;
        router.delete(`/payments/${id}`, { preserveScroll: true });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle fontWeight={700}>
                Payments — #{invoice.invoice_no}
                <Typography variant="body2" color="text.secondary" fontWeight={400} mt={0.5}>
                    {invoice.customer?.name ?? '—'} · Total {peso(invoice.total_amount)}
                </Typography>
            </DialogTitle>
            <Divider />
            <DialogContent>
                {mode === 'form' ? (
                    <PaymentForm invoice={invoice} onSaved={() => setMode('list')} onCancel={() => setMode('list')} />
                ) : (
                    <>
                        <Typography variant="caption" color="text.secondary">ITEMS</Typography>
                        <Table size="small" sx={{ mb: 3 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Item</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell align="right">Paid</TableCell>
                                    <TableCell align="right">Balance</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {invoice.items.map((it) => {
                                    const st = itemPaidStatus(it);
                                    return (
                                        <TableRow key={it.id}>
                                            <TableCell>{it.item_name}</TableCell>
                                            <TableCell align="right">{peso(it.amount)}</TableCell>
                                            <TableCell align="right">{peso(it.paid)}</TableCell>
                                            <TableCell align="right">{peso(it.balance)}</TableCell>
                                            <TableCell>
                                                <Chip label={st.label} size="small" color={st.color} variant="outlined" />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        <Typography variant="caption" color="text.secondary">PAYMENT HISTORY</Typography>
                        {invoice.payments.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                No payments recorded yet.
                            </Typography>
                        ) : (
                            <List disablePadding>
                                {invoice.payments.map((p) => (
                                    <ListItem
                                        key={p.id}
                                        divider
                                        secondaryAction={canEdit && (
                                            <IconButton size="small" color="error" onClick={() => handleDeletePayment(p.id)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        )}
                                    >
                                        <ListItemText
                                            primary={
                                                Number(p.tax_withheld) > 0
                                                    ? `${peso(p.amount)} + ${peso(p.tax_withheld)} tax withheld — ${p.method ?? 'Unspecified'}`
                                                    : `${peso(p.amount)} — ${p.method ?? 'Unspecified'}`
                                            }
                                            secondary={
                                                p.method === 'Check'
                                                    ? `${fmt(p.payment_date)} · ${p.bank_name ?? '—'} #${p.check_no ?? '—'}${p.check_date ? ` · dated ${fmt(p.check_date)}` : ''}`
                                                    : `${fmt(p.payment_date)}${p.reference_no ? ` · Ref: ${p.reference_no}` : ''}`
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}

                        {canEdit && invoice.balance > 0.0001 && (
                            <Button startIcon={<Add />} sx={{ mt: 2 }} onClick={() => setMode('form')}>
                                Record Payment
                            </Button>
                        )}
                    </>
                )}
            </DialogContent>
            {mode === 'list' && (
                <>
                    <Divider />
                    <DialogActions sx={{ px: 3, py: 2 }}>
                        <Button onClick={onClose} color="inherit">Close</Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
}

function agingFilterLabel(filter) {
    if (!filter) return '';
    if (filter.from === null && filter.to === 0) return 'Not yet due';
    if (filter.from === null) return `Up to ${filter.to} days overdue`;
    if (filter.to === null) return `${filter.from}+ days overdue`;
    return `${filter.from}–${filter.to} days overdue`;
}

export default function PaymentsIndex({ periods, currentPeriod, invoices, agingFilter }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage invoices') && !currentPeriod?.is_closed;
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');
    const [activeInvoiceId, setActiveInvoiceId] = useState(null);
    const [search, setSearch] = useState('');

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/payments', { period_id: id }, { preserveState: false });
    };

    const invoiceWithBalance = (invoice) => ({
        ...invoice,
        balance: Number(invoice.total_amount) - Number(invoice.paid_amount),
    });

    const filteredInvoices = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return invoices;
        return invoices.filter((inv) => (
            inv.invoice_no?.toLowerCase().includes(q)
            || inv.customer?.name?.toLowerCase().includes(q)
            || (STATUS_LABEL[inv.status] ?? inv.status)?.toLowerCase().includes(q)
        ));
    }, [invoices, search]);

    const totals = invoices.reduce((acc, inv) => {
        acc.total += Number(inv.total_amount);
        acc.paid += Number(inv.paid_amount);
        return acc;
    }, { total: 0, paid: 0 });

    const activeInvoice = activeInvoiceId
        ? invoiceWithBalance(invoices.find((i) => i.id === activeInvoiceId))
        : null;

    return (
        <AppLayout title="Payments">
            <Head title="Payments" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={agingFilter ? 2 : 3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Payments</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Record checks/cash received against receivables, allocated per item.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <SearchField value={search} onChange={setSearch} placeholder="Search invoice no, customer..." />
                    {!agingFilter && (
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Period</InputLabel>
                            <Select value={selectedPeriodId} label="Period" onChange={(e) => changePeriod(e.target.value)}>
                                {periods.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>{p.name}{p.is_closed ? ' 🔒' : ''}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </Stack>
            </Stack>

            {agingFilter && (
                <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                    <Chip
                        label={`Showing: ${agingFilterLabel(agingFilter)} (all periods)`}
                        color="warning"
                        variant="outlined"
                        onDelete={() => router.get('/payments')}
                    />
                </Stack>
            )}

            <Card>
                <CardContent sx={{ p: '0 !important' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Invoice No.</TableCell>
                                    <TableCell>Customer</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Due Date</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                    <TableCell align="right">Paid</TableCell>
                                    <TableCell align="right">Balance</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="center" sx={{ width: 60 }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredInvoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            {search
                                                ? 'No receivables match your search.'
                                                : agingFilter
                                                    ? 'No outstanding invoices in this range.'
                                                    : 'No receivables for this period.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInvoices.map((invoice) => {
                                        const inv = invoiceWithBalance(invoice);
                                        return (
                                            <TableRow key={inv.id} hover>
                                                <TableCell fontWeight={500}>{inv.invoice_no}</TableCell>
                                                <TableCell>{inv.customer?.name ?? '—'}</TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(inv.invoice_date)}</TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(inv.due_date)}</TableCell>
                                                <TableCell align="right">{peso(inv.total_amount)}</TableCell>
                                                <TableCell align="right">{peso(inv.paid_amount)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>{peso(inv.balance)}</TableCell>
                                                <TableCell>
                                                    <Chip label={STATUS_LABEL[inv.status] ?? inv.status} size="small" color={STATUS_COLOR[inv.status] ?? 'default'} variant="outlined" />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" onClick={() => setActiveInvoiceId(inv.id)}>
                                                        <PaymentIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {invoices.length > 0 && (
                        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                            <Stack direction="row" justifyContent="flex-end" spacing={3}>
                                <Typography variant="body2" color="text.secondary">Total: <b>{peso(totals.total)}</b></Typography>
                                <Typography variant="body2" color="text.secondary">Paid: <b>{peso(totals.paid)}</b></Typography>
                                <Typography variant="body2" color="text.secondary">Balance: <b>{peso(totals.total - totals.paid)}</b></Typography>
                            </Stack>
                        </Box>
                    )}
                </CardContent>
            </Card>

            <PaymentDialog
                key={activeInvoice?.id ?? 'none'}
                open={!!activeInvoice}
                onClose={() => setActiveInvoiceId(null)}
                invoice={activeInvoice}
                canEdit={canEdit}
            />
        </AppLayout>
    );
}
