import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, IconButton,
    InputLabel, List, ListItem, ListItemText, MenuItem, Select, Stack,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Typography,
} from '@mui/material';
import { Add, Delete, Payment as PaymentIcon, Receipt } from '@mui/icons-material';
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
        wt_cert_no: '',
        wt_cert_date: '',
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
                    <>
                        <Typography variant="caption" color="text.secondary">
                            Settles {peso(settledTotal)} of the invoice ({peso(amountNum)} received + {peso(taxNum)} tax withheld).
                        </Typography>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="WT Cert No. (2307)" fullWidth
                                value={data.wt_cert_no}
                                onChange={(e) => setData('wt_cert_no', e.target.value)}
                                error={!!errors.wt_cert_no} helperText={errors.wt_cert_no}
                            />
                            <TextField
                                label="WT Cert Date" type="date" fullWidth
                                value={data.wt_cert_date}
                                onChange={(e) => setData('wt_cert_date', e.target.value)}
                                error={!!errors.wt_cert_date} helperText={errors.wt_cert_date}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Stack>
                    </>
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
                                                <>
                                                    {Number(p.tax_withheld) > 0
                                                        ? `${peso(p.amount)} + ${peso(p.tax_withheld)} tax withheld — ${p.method ?? 'Unspecified'}`
                                                        : `${peso(p.amount)} — ${p.method ?? 'Unspecified'}`}
                                                    {p.payment_batch_id && (
                                                        <Chip size="small" variant="outlined" color="info" label="part of multi-invoice check" sx={{ ml: 1 }} />
                                                    )}
                                                </>
                                            }
                                            secondary={
                                                (p.method === 'Check'
                                                    ? `${fmt(p.payment_date)} · ${p.bank_name ?? '—'} #${p.check_no ?? '—'}${p.check_date ? ` · dated ${fmt(p.check_date)}` : ''}`
                                                    : `${fmt(p.payment_date)}${p.reference_no ? ` · Ref: ${p.reference_no}` : ''}`)
                                                + (p.wt_cert_no ? ` · WT Cert #${p.wt_cert_no}${p.wt_cert_date ? ` dated ${fmt(p.wt_cert_date)}` : ''}` : '')
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

function MultiInvoicePaymentDialog({ open, onClose, onSaved }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        payment_date: '',
        method: 'Check',
        reference_no: '',
        bank_name: '',
        check_no: '',
        check_date: '',
        wt_cert_no: '',
        wt_cert_date: '',
        notes: '',
        invoices: [],
    });
    const [meta, setMeta] = useState({}); // invoice_id -> invoice (items/balance) for display only
    const [searchInput, setSearchInput] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [totalWt, setTotalWt] = useState('');
    const searchTimer = useRef(null);

    const isCheck = data.method === 'Check';

    useEffect(() => {
        if (!open) return;
        clearTimeout(searchTimer.current);
        setSearching(true);
        searchTimer.current = setTimeout(() => {
            fetch(`/payments/search-invoices?q=${encodeURIComponent(searchInput)}`)
                .then((r) => r.json())
                .then((json) => setResults(json))
                .finally(() => setSearching(false));
        }, 300);
        return () => clearTimeout(searchTimer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput, open]);

    const addInvoice = (invoice) => {
        if (data.invoices.some((e) => e.invoice_id === invoice.id)) return;
        setMeta((m) => ({ ...m, [invoice.id]: invoice }));
        setData('invoices', [
            ...data.invoices,
            {
                invoice_id: invoice.id,
                amount: '',
                tax_withheld: '',
                allocations: invoice.items.map((it) => ({ invoice_item_id: it.id, amount: '' })),
            },
        ]);
    };

    const removeInvoice = (invoiceId) => {
        setData('invoices', data.invoices.filter((e) => e.invoice_id !== invoiceId));
    };

    const updateEntry = (index, field, value) => {
        setData('invoices', data.invoices.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
    };

    const updateAllocation = (index, allocIndex, value) => {
        setData('invoices', data.invoices.map((e, i) => {
            if (i !== index) return e;
            return { ...e, allocations: e.allocations.map((a, j) => (j === allocIndex ? { ...a, amount: value } : a)) };
        }));
    };

    const autoFill = (index) => {
        const entry = data.invoices[index];
        const invoice = meta[entry.invoice_id];
        let remaining = (Number(entry.amount) || 0) + (Number(entry.tax_withheld) || 0);
        const next = invoice.items.map((it) => {
            const cap = Math.max(0, it.balance);
            const take = Math.min(cap, remaining);
            remaining -= take;
            return { invoice_item_id: it.id, amount: take > 0 ? take.toFixed(2) : '' };
        });
        updateEntry(index, 'allocations', next);
    };

    // One 2307 certificate often covers the whole batch; this splits its
    // total proportionally to each invoice's Amount Applied so the split
    // roughly matches how much of the sale each invoice represents — the
    // user can still hand-edit any invoice's share afterward.
    const autoSplitWt = () => {
        const total = Number(totalWt) || 0;
        if (total <= 0 || data.invoices.length === 0) return;
        const amountSum = data.invoices.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        let remaining = total;
        const next = data.invoices.map((e, i) => {
            const isLast = i === data.invoices.length - 1;
            const share = amountSum > 0 ? (Number(e.amount) || 0) / amountSum * total : total / data.invoices.length;
            const amt = isLast ? remaining : Math.round(share * 100) / 100;
            remaining -= amt;
            return { ...e, tax_withheld: amt > 0 ? amt.toFixed(2) : '' };
        });
        setData('invoices', next);
    };

    const totalTaxWithheld = data.invoices.reduce((sum, e) => sum + (Number(e.tax_withheld) || 0), 0);
    const grandTotal = data.invoices.reduce((sum, e) => sum + (Number(e.amount) || 0) + (Number(e.tax_withheld) || 0), 0);
    const allBalanced = data.invoices.length >= 2 && data.invoices.every((e) => {
        const settled = (Number(e.amount) || 0) + (Number(e.tax_withheld) || 0);
        const allocated = e.allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
        return settled > 0 && Math.abs(settled - allocated) < 0.005;
    });

    const handleClose = () => {
        reset();
        setMeta({});
        setResults([]);
        setSearchInput('');
        setTotalWt('');
        onClose();
    };

    const submit = (e) => {
        e.preventDefault();
        post('/payments/batch', {
            onSuccess: () => {
                reset();
                setMeta({});
                setResults([]);
                setSearchInput('');
                setTotalWt('');
                onSaved();
            },
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
            <DialogTitle fontWeight={700}>
                Multi-Invoice Payment
                <Typography variant="body2" color="text.secondary" fontWeight={400} mt={0.5}>
                    Record one check/transfer that settles several invoices at once.
                </Typography>
            </DialogTitle>
            <Divider />
            <form onSubmit={submit}>
                <DialogContent>
                    <Stack spacing={2.5}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Date" type="date" fullWidth required
                                value={data.payment_date}
                                onChange={(e) => setData('payment_date', e.target.value)}
                                error={!!errors.payment_date} helperText={errors.payment_date}
                                InputLabelProps={{ shrink: true }}
                            />
                            <FormControl fullWidth>
                                <InputLabel>Method</InputLabel>
                                <Select label="Method" value={data.method} onChange={(e) => setData('method', e.target.value)}>
                                    {METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                                </Select>
                            </FormControl>
                            {!isCheck && (
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
                                    label="Bank Name" fullWidth required
                                    value={data.bank_name}
                                    onChange={(e) => setData('bank_name', e.target.value)}
                                    error={!!errors.bank_name} helperText={errors.bank_name}
                                />
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
                                    error={!!errors.check_date} helperText={errors.check_date}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Stack>
                        )}

                        <Divider />

                        <Typography variant="caption" color="text.secondary">ADD INVOICES</Typography>
                        <SearchField value={searchInput} onChange={setSearchInput} placeholder="Find invoice no. or customer..." sx={{ minWidth: '100%' }} />
                        {results.length > 0 && (
                            <List disablePadding dense sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 180, overflow: 'auto' }}>
                                {results.filter((r) => !data.invoices.some((e) => e.invoice_id === r.id)).map((r) => (
                                    <ListItem
                                        key={r.id}
                                        divider
                                        secondaryAction={<Button size="small" onClick={() => addInvoice(r)}>Add</Button>}
                                    >
                                        <ListItemText
                                            primary={`#${r.invoice_no} — ${r.customer?.name ?? '—'}`}
                                            secondary={`Balance: ${peso(r.balance)}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                        {searching && <Typography variant="caption" color="text.secondary">Searching…</Typography>}

                        {errors.invoices && (
                            <Typography variant="caption" color="error">{errors.invoices}</Typography>
                        )}

                        {data.invoices.length > 0 && (
                            <Stack spacing={2}>
                                <Divider />
                                <Typography variant="caption" color="text.secondary">
                                    WITHHOLDING TAX (optional — one 2307 certificate can cover this whole batch)
                                </Typography>
                                <Stack direction="row" spacing={2} alignItems="flex-start">
                                    <TextField
                                        label="WT Cert No. (2307)" fullWidth
                                        value={data.wt_cert_no}
                                        onChange={(e) => setData('wt_cert_no', e.target.value)}
                                        error={!!errors.wt_cert_no} helperText={errors.wt_cert_no}
                                    />
                                    <TextField
                                        label="WT Cert Date" type="date" fullWidth
                                        value={data.wt_cert_date}
                                        onChange={(e) => setData('wt_cert_date', e.target.value)}
                                        error={!!errors.wt_cert_date} helperText={errors.wt_cert_date}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        label="Total WT for this batch" type="number" fullWidth
                                        value={totalWt}
                                        onChange={(e) => setTotalWt(e.target.value)}
                                        helperText="Split across invoices below, proportional to Amount Applied"
                                        inputProps={{ step: 'any', min: 0 }}
                                    />
                                    <Button type="button" onClick={autoSplitWt} sx={{ whiteSpace: 'nowrap', mt: 1 }}>
                                        Split
                                    </Button>
                                </Stack>
                                {totalTaxWithheld > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                        Withholding tax currently allocated across invoices: {peso(totalTaxWithheld)}
                                    </Typography>
                                )}
                                <Divider />
                                <Typography variant="caption" color="text.secondary">SELECTED INVOICES</Typography>
                                {data.invoices.map((entry, index) => {
                                    const invoice = meta[entry.invoice_id];
                                    if (!invoice) return null;
                                    const settled = (Number(entry.amount) || 0) + (Number(entry.tax_withheld) || 0);
                                    const allocated = entry.allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
                                    const balanced = Math.abs(settled - allocated) < 0.005;
                                    return (
                                        <Card key={entry.invoice_id} variant="outlined">
                                            <CardContent>
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                                                    <Box>
                                                        <Typography fontWeight={600}>#{invoice.invoice_no} — {invoice.customer?.name ?? '—'}</Typography>
                                                        <Typography variant="caption" color="text.secondary">Balance: {peso(invoice.balance)}</Typography>
                                                    </Box>
                                                    <IconButton size="small" color="error" onClick={() => removeInvoice(entry.invoice_id)}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                                <Stack direction="row" spacing={2} mb={1.5}>
                                                    <TextField
                                                        label="Amount Applied" type="number" size="small" fullWidth required
                                                        value={entry.amount}
                                                        onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                                                        error={!!errors[`invoices.${index}.amount`]}
                                                        inputProps={{ step: 'any', min: 0 }}
                                                    />
                                                    <TextField
                                                        label="Withholding Tax" type="number" size="small" fullWidth
                                                        value={entry.tax_withheld}
                                                        onChange={(e) => updateEntry(index, 'tax_withheld', e.target.value)}
                                                        inputProps={{ step: 'any', min: 0 }}
                                                    />
                                                </Stack>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                    <Typography variant="caption" color="text.secondary">ALLOCATE TO ITEMS</Typography>
                                                    <Button type="button" size="small" onClick={() => autoFill(index)}>Auto-fill</Button>
                                                </Stack>
                                                <Stack spacing={1} mb={1}>
                                                    {invoice.items.map((it, itIndex) => (
                                                        <Stack key={it.id} direction="row" spacing={1.5} alignItems="center">
                                                            <Box sx={{ flex: 2 }}>
                                                                <Typography variant="body2">{it.item_name}</Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Balance: {peso(it.balance)} of {peso(it.amount)}
                                                                </Typography>
                                                            </Box>
                                                            <TextField
                                                                label="Allocate" type="number" size="small" sx={{ flex: 1 }}
                                                                value={entry.allocations[itIndex]?.amount ?? ''}
                                                                onChange={(e) => updateAllocation(index, itIndex, e.target.value)}
                                                                error={!!errors[`invoices.${index}.allocations.${itIndex}.amount`]}
                                                                inputProps={{ step: 'any', min: 0 }}
                                                            />
                                                        </Stack>
                                                    ))}
                                                </Stack>
                                                <Box sx={{
                                                    bgcolor: balanced ? 'success.50' : 'error.50',
                                                    border: '1px solid', borderColor: balanced ? 'success.200' : 'error.200',
                                                    borderRadius: 2, px: 1.5, py: 0.75,
                                                }}>
                                                    <Typography variant="caption" color={balanced ? 'success.dark' : 'error.dark'}>
                                                        Allocated {peso(allocated)} / {peso(settled)}
                                                    </Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        )}

                        <TextField
                            label="Notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            multiline rows={2} fullWidth
                        />

                        <Stack direction="row" justifyContent="space-between" sx={{
                            bgcolor: 'grey.100', borderRadius: 2, px: 2, py: 1,
                        }}>
                            <Typography variant="body2">Total across {data.invoices.length} invoice(s)</Typography>
                            <Typography variant="body2" fontWeight={700}>{peso(grandTotal)}</Typography>
                        </Stack>
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button type="button" onClick={handleClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing || !allBalanced}>
                        Record Payment
                    </Button>
                </DialogActions>
            </form>
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

export default function PaymentsIndex({ periods, currentPeriod, invoices, agingFilter, search }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage invoices') && !currentPeriod?.is_closed;
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');
    const [activeInvoiceId, setActiveInvoiceId] = useState(null);
    const [multiOpen, setMultiOpen] = useState(false);
    const [searchInput, setSearchInput] = useState(search ?? '');
    const searchTimer = useRef(null);
    const crossPeriod = Boolean(agingFilter) || Boolean(search);

    useEffect(() => () => clearTimeout(searchTimer.current), []);

    // A single payment often settles invoices spread across different
    // periods, so searching by invoice no./customer looks across ALL
    // periods (server-side) instead of just whatever period is selected —
    // no more hunting for which period an invoice lives in.
    const handleSearchChange = (value) => {
        setSearchInput(value);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            router.get('/payments', value.trim() ? { q: value.trim() } : {}, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 400);
    };

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

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={crossPeriod ? 2 : 3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Payments</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Record checks/cash received against receivables, allocated per item.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    {canEdit && (
                        <Button startIcon={<Receipt />} variant="outlined" onClick={() => setMultiOpen(true)}>
                            Multi-Invoice Payment
                        </Button>
                    )}
                    <SearchField value={searchInput} onChange={handleSearchChange} placeholder="Find invoice no, customer (any period)..." />
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
                </Stack>
            </Stack>

            {search ? (
                <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                    <Chip
                        label={`Showing: results for "${search}" (all periods)`}
                        color="primary"
                        variant="outlined"
                        onDelete={() => { setSearchInput(''); router.get('/payments'); }}
                    />
                </Stack>
            ) : agingFilter && (
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
                                    {crossPeriod && <TableCell>Period</TableCell>}
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
                                {invoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={crossPeriod ? 10 : 9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            {search
                                                ? `No invoices match "${search}".`
                                                : agingFilter
                                                    ? 'No outstanding invoices in this range.'
                                                    : 'No receivables for this period.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    invoices.map((invoice) => {
                                        const inv = invoiceWithBalance(invoice);
                                        return (
                                            <TableRow key={inv.id} hover>
                                                <TableCell fontWeight={500}>{inv.invoice_no}</TableCell>
                                                <TableCell>{inv.customer?.name ?? '—'}</TableCell>
                                                {crossPeriod && (
                                                    <TableCell sx={{ color: 'text.secondary' }}>{inv.period?.name ?? '—'}</TableCell>
                                                )}
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

            <MultiInvoicePaymentDialog
                open={multiOpen}
                onClose={() => setMultiOpen(false)}
                onSaved={() => { setMultiOpen(false); router.reload({ only: ['invoices'] }); }}
            />
        </AppLayout>
    );
}
