import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Checkbox, Chip, Dialog, DialogActions,
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

function MultiInvoicePaymentDialog({ open, onClose, onSaved, initialInvoices }) {
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
        invoices: (initialInvoices ?? []).map((inv) => ({
            invoice_id: inv.id,
            amount: '',
            tax_withheld: '',
            allocations: inv.items.map((it) => ({ invoice_item_id: it.id, amount: '' })),
        })),
    });
    // invoice_id -> invoice (items/balance) for display only
    const [meta, setMeta] = useState(() => {
        const m = {};
        (initialInvoices ?? []).forEach((inv) => { m[inv.id] = inv; });
        return m;
    });
    const [searchInput, setSearchInput] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    // Batch-level totals only — no per-invoice or per-item entry. Whatever is
    // typed here gets applied across the selected invoices automatically
    // (oldest/first-added first, capped at each invoice's own balance) and
    // then, within each invoice, across its items — the user never touches
    // that breakdown.
    const [totalAmount, setTotalAmount] = useState(() => {
        const sum = (initialInvoices ?? []).reduce((s, inv) => s + Math.max(0, Number(inv.balance) || 0), 0);
        return sum > 0 ? sum.toFixed(2) : '';
    });
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
            { invoice_id: invoice.id, amount: '', tax_withheld: '', allocations: invoice.items.map((it) => ({ invoice_item_id: it.id, amount: '' })) },
        ]);
        setTotalAmount((prev) => {
            const next = (Number(prev) || 0) + Math.max(0, Number(invoice.balance) || 0);
            return next > 0 ? next.toFixed(2) : '';
        });
    };

    const removeInvoice = (invoiceId) => {
        const entry = data.invoices.find((e) => e.invoice_id === invoiceId);
        setData('invoices', data.invoices.filter((e) => e.invoice_id !== invoiceId));
        setTotalAmount((prev) => {
            const next = Math.max(0, (Number(prev) || 0) - (Number(entry?.amount) || 0));
            return next > 0 ? next.toFixed(2) : '';
        });
    };

    // Single source of truth: Total Amount + Total Withholding Tax for the
    // whole batch. This fans out, in order:
    //   1. Total Amount across invoices, oldest/first-added first, each
    //      capped at its own remaining balance.
    //   2. Total Withholding Tax across invoices, proportional to how much
    //      of the total each invoice ended up receiving.
    //   3. Each invoice's own (amount + tax) across its line items, in
    //      order, capped at each item's balance — same as the single-invoice
    //      auto-fill, just run silently for every invoice in the batch.
    const invoiceIdsKey = data.invoices.map((e) => e.invoice_id).join(',');
    useEffect(() => {
        if (data.invoices.length === 0) return;
        const totalAmt = Number(totalAmount) || 0;
        const totalTax = Number(totalWt) || 0;

        let remainingAmt = totalAmt;
        const amounts = data.invoices.map((e) => {
            const cap = Math.max(0, Number(meta[e.invoice_id]?.balance) || 0);
            const take = Math.min(cap, Math.max(0, remainingAmt));
            remainingAmt -= take;
            return take;
        });

        const amountSum = amounts.reduce((s, a) => s + a, 0);
        let remainingTax = totalTax;
        const taxes = amounts.map((amt, i) => {
            if (totalTax <= 0) return 0;
            const isLast = i === amounts.length - 1;
            const share = amountSum > 0 ? (amt / amountSum) * totalTax : totalTax / amounts.length;
            const val = isLast ? remainingTax : Math.round(share * 100) / 100;
            remainingTax -= val;
            return val;
        });

        const nextInvoices = data.invoices.map((e, i) => {
            const invoice = meta[e.invoice_id];
            let remaining = amounts[i] + taxes[i];
            const allocations = (invoice?.items ?? []).map((it) => {
                const cap = Math.max(0, Number(it.balance) || 0);
                const take = Math.min(cap, Math.max(0, remaining));
                remaining -= take;
                return { invoice_item_id: it.id, amount: take > 0 ? take.toFixed(2) : '' };
            });
            return {
                ...e,
                amount: amounts[i] > 0 ? amounts[i].toFixed(2) : '',
                tax_withheld: taxes[i] > 0 ? taxes[i].toFixed(2) : '',
                allocations,
            };
        });

        const changed = JSON.stringify(nextInvoices) !== JSON.stringify(data.invoices);
        if (changed) setData('invoices', nextInvoices);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalAmount, totalWt, invoiceIdsKey]);

    const appliedTotal = data.invoices.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalTaxWithheld = data.invoices.reduce((sum, e) => sum + (Number(e.tax_withheld) || 0), 0);
    const grandTotal = appliedTotal + totalTaxWithheld;
    const unapplied = Math.max(0, Math.round(((Number(totalAmount) || 0) - appliedTotal) * 100) / 100);
    const allApplied = data.invoices.length >= 2 && data.invoices.every((e) => (Number(e.amount) || 0) > 0);

    const handleClose = () => {
        reset();
        setMeta({});
        setResults([]);
        setSearchInput('');
        setTotalAmount('');
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
                setTotalAmount('');
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
                                <Typography variant="caption" color="text.secondary">BATCH TOTALS</Typography>
                                <Stack direction="row" spacing={2} alignItems="flex-start">
                                    <TextField
                                        label="Total Amount" type="number" fullWidth required
                                        value={totalAmount}
                                        onChange={(e) => setTotalAmount(e.target.value)}
                                        error={!!errors.amount}
                                        helperText={errors.amount || 'Applied across invoices below, oldest first'}
                                        inputProps={{ step: 'any', min: 0 }}
                                    />
                                    <TextField
                                        label="Total Withholding Tax" type="number" fullWidth
                                        value={totalWt}
                                        onChange={(e) => setTotalWt(e.target.value)}
                                        helperText="Optional — one 2307 certificate can cover this whole batch"
                                        inputProps={{ step: 'any', min: 0 }}
                                    />
                                </Stack>
                                {totalWt !== '' && Number(totalWt) > 0 && (
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
                                )}
                                {unapplied > 0.005 && (
                                    <Typography variant="caption" color="error">
                                        {peso(unapplied)} could not be applied — the selected invoices are already fully covered by the rest. Remove an invoice or lower the total.
                                    </Typography>
                                )}

                                <Divider />
                                <Typography variant="caption" color="text.secondary">SELECTED INVOICES</Typography>
                                <List disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                    {data.invoices.map((entry) => {
                                        const invoice = meta[entry.invoice_id];
                                        if (!invoice) return null;
                                        const amt = Number(entry.amount) || 0;
                                        const tax = Number(entry.tax_withheld) || 0;
                                        return (
                                            <ListItem
                                                key={entry.invoice_id}
                                                divider
                                                secondaryAction={
                                                    <IconButton size="small" color="error" onClick={() => removeInvoice(entry.invoice_id)}>
                                                        <Delete fontSize="small" />
                                                    </IconButton>
                                                }
                                            >
                                                <ListItemText
                                                    primary={`#${invoice.invoice_no} — ${invoice.customer?.name ?? '—'}`}
                                                    secondary={
                                                        `Balance: ${peso(invoice.balance)} · Applying ${peso(amt)}`
                                                        + (tax > 0 ? ` + ${peso(tax)} WT` : '')
                                                        + (amt <= 0 ? ' · not covered by the total above' : '')
                                                    }
                                                />
                                            </ListItem>
                                        );
                                    })}
                                </List>
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
                    <Button type="submit" variant="contained" disabled={processing || !allApplied}>
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
    const [multiInitialInvoices, setMultiInitialInvoices] = useState([]);
    const [multiInstance, setMultiInstance] = useState(0);
    const [selectedIds, setSelectedIds] = useState([]);
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
        setSelectedIds([]);
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
        setSelectedIds([]);
        router.get('/payments', { period_id: id }, { preserveState: false });
    };

    const invoiceWithBalance = (invoice) => ({
        ...invoice,
        balance: Number(invoice.total_amount) - Number(invoice.paid_amount),
    });

    const payableInvoices = invoices.filter((inv) => Number(inv.total_amount) - Number(inv.paid_amount) > 0.0001);
    const allSelected = payableInvoices.length > 0 && payableInvoices.every((inv) => selectedIds.includes(inv.id));
    const someSelected = selectedIds.length > 0 && !allSelected;

    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? [] : payableInvoices.map((inv) => inv.id));
    };

    const toggleSelectOne = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const openMultiBlank = () => {
        setMultiInitialInvoices([]);
        setMultiInstance((n) => n + 1);
        setMultiOpen(true);
    };

    const openMultiForSelection = () => {
        setMultiInitialInvoices(
            selectedIds.map((id) => invoiceWithBalance(invoices.find((i) => i.id === id))).filter(Boolean)
        );
        setMultiInstance((n) => n + 1);
        setMultiOpen(true);
    };

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
                        <Button startIcon={<Receipt />} variant="outlined" onClick={openMultiBlank}>
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

            {canEdit && selectedIds.length > 0 && (
                <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                    <Chip
                        color="primary"
                        label={`${selectedIds.length} invoice${selectedIds.length > 1 ? 's' : ''} selected`}
                        onDelete={() => setSelectedIds([])}
                    />
                    <Button
                        variant="contained" size="small" startIcon={<Receipt />}
                        onClick={openMultiForSelection}
                        disabled={selectedIds.length < 2}
                    >
                        Pay Selected
                    </Button>
                    {selectedIds.length < 2 && (
                        <Typography variant="caption" color="text.secondary">Select at least 2 invoices for a multi-invoice payment.</Typography>
                    )}
                </Stack>
            )}

            <Card>
                <CardContent sx={{ p: '0 !important' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {canEdit && (
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                size="small"
                                                checked={allSelected}
                                                indeterminate={someSelected}
                                                onChange={toggleSelectAll}
                                                disabled={payableInvoices.length === 0}
                                            />
                                        </TableCell>
                                    )}
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
                                        <TableCell colSpan={9 + (crossPeriod ? 1 : 0) + (canEdit ? 1 : 0)} align="center" sx={{ py: 5, color: 'text.secondary' }}>
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
                                        const payable = inv.balance > 0.0001;
                                        return (
                                            <TableRow key={inv.id} hover selected={selectedIds.includes(inv.id)}>
                                                {canEdit && (
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            size="small"
                                                            checked={selectedIds.includes(inv.id)}
                                                            onChange={() => toggleSelectOne(inv.id)}
                                                            disabled={!payable}
                                                        />
                                                    </TableCell>
                                                )}
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
                key={multiInstance}
                open={multiOpen}
                onClose={() => setMultiOpen(false)}
                onSaved={() => { setMultiOpen(false); setSelectedIds([]); router.reload({ only: ['invoices'] }); }}
                initialInvoices={multiInitialInvoices}
            />
        </AppLayout>
    );
}
