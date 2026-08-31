import { useState } from 'react';
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
        method: 'Cash',
        reference_no: '',
        notes: '',
        allocations: invoice.items.map((it) => ({ invoice_item_id: it.id, amount: '' })),
    });

    const setAllocation = (index, value) => {
        setData('allocations', data.allocations.map((a, i) => (i === index ? { ...a, amount: value } : a)));
    };

    const allocatedTotal = data.allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const amountNum = Number(data.amount) || 0;
    const balanced = Math.abs(allocatedTotal - amountNum) < 0.005;

    const autoFill = () => {
        let remaining = amountNum;
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
                        label="Amount" type="number" fullWidth required autoFocus
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value)}
                        error={!!errors.amount} helperText={errors.amount}
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
                <Stack direction="row" spacing={2}>
                    <FormControl fullWidth>
                        <InputLabel>Method</InputLabel>
                        <Select label="Method" value={data.method} onChange={(e) => setData('method', e.target.value)}>
                            {METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Reference No." fullWidth
                        value={data.reference_no}
                        onChange={(e) => setData('reference_no', e.target.value)}
                        error={!!errors.reference_no} helperText={errors.reference_no}
                    />
                </Stack>

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
                        Allocated: {peso(allocatedTotal)} / {peso(amountNum)}
                    </Typography>
                    {!balanced && <Typography variant="caption" color="error.dark">Must match the payment amount</Typography>}
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
                                            primary={`${peso(p.amount)} — ${p.method ?? 'Unspecified'}`}
                                            secondary={`${fmt(p.payment_date)}${p.reference_no ? ` · Ref: ${p.reference_no}` : ''}`}
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

export default function PaymentsIndex({ periods, currentPeriod, invoices }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage invoices') && !currentPeriod?.is_closed;
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');
    const [activeInvoiceId, setActiveInvoiceId] = useState(null);

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/payments', { period_id: id }, { preserveState: false });
    };

    const invoiceWithBalance = (invoice) => ({
        ...invoice,
        balance: Number(invoice.total_amount) - Number(invoice.paid_amount),
    });

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

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Payments</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Record checks/cash received against receivables, allocated per item.
                    </Typography>
                </Box>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Period</InputLabel>
                    <Select value={selectedPeriodId} label="Period" onChange={(e) => changePeriod(e.target.value)}>
                        {periods.map((p) => (
                            <MenuItem key={p.id} value={p.id}>{p.name}{p.is_closed ? ' 🔒' : ''}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>

            <Card>
                <CardContent sx={{ p: '0 !important' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Invoice No.</TableCell>
                                    <TableCell>Customer</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                    <TableCell align="right">Paid</TableCell>
                                    <TableCell align="right">Balance</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="center" sx={{ width: 60 }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {invoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No receivables for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    invoices.map((invoice) => {
                                        const inv = invoiceWithBalance(invoice);
                                        return (
                                            <TableRow key={inv.id} hover>
                                                <TableCell fontWeight={500}>{inv.invoice_no}</TableCell>
                                                <TableCell>{inv.customer?.name ?? '—'}</TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(inv.invoice_date)}</TableCell>
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
