import { useEffect, useRef, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, IconButton,
    InputLabel, List, ListItem, ListItemText, MenuItem, Select, Stack,
    Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Tabs, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Payment as PaymentIcon } from '@mui/icons-material';
import { peso, longDate as fmt } from '@/utils/format';
import SearchField from '@/Components/Shared/SearchField';

const STATUS_COLOR = { unpaid: 'default', partial: 'warning', paid: 'success' };
const STATUS_LABEL = { unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid' };
const METHODS = ['Cash', 'Check', 'Bank Transfer', 'GCash', 'Other'];

function itemPaidStatus(item) {
    if (item.paid <= 0) return { label: 'Unpaid', color: 'default' };
    if (item.balance <= 0.0001) return { label: 'Paid', color: 'success' };
    return { label: 'Partial', color: 'warning' };
}

function paymentHistoryText(p) {
    const amount = Number(p.tax_withheld) > 0
        ? `${peso(p.amount)} + ${peso(p.tax_withheld)} tax withheld — ${p.method ?? 'Unspecified'}`
        : `${peso(p.amount)} — ${p.method ?? 'Unspecified'}`;
    const detail = p.method === 'Check'
        ? `${fmt(p.payment_date)} · ${p.bank_name ?? '—'} #${p.check_no ?? '—'}${p.check_date ? ` · dated ${fmt(p.check_date)}` : ''}`
        : `${fmt(p.payment_date)}${p.reference_no ? ` · Ref: ${p.reference_no}` : ''}`;
    return { amount, detail };
}

function MethodFields({ data, setData, errors }) {
    const isCheck = data.method === 'Check';
    return (
        <>
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
        </>
    );
}

// ── Purchases (item-level allocation, mirrors Receivables/Payments) ──────

function PurchasePaymentForm({ purchase, onSaved, onCancel }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        purchase_order_id: purchase.id,
        payment_date: '',
        amount: '',
        tax_withheld: '',
        method: 'Cash',
        reference_no: '',
        bank_name: '',
        check_no: '',
        check_date: '',
        notes: '',
        allocations: purchase.items.map((it) => ({ purchase_item_id: it.id, amount: '' })),
    });

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
        const next = purchase.items.map((it) => {
            const cap = Math.max(0, it.balance);
            const take = Math.min(cap, remaining);
            remaining -= take;
            return { purchase_item_id: it.id, amount: take > 0 ? take.toFixed(2) : '' };
        });
        setData('allocations', next);
    };

    const submit = (e) => {
        e.preventDefault();
        post('/purchase-payments', { onSuccess: () => { reset(); onSaved(); } });
    };

    return (
        <form onSubmit={submit}>
            <Stack spacing={2.5} pt={1}>
                <Stack direction="row" spacing={2}>
                    <TextField
                        label="Amount Paid" type="number" fullWidth required autoFocus
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value)}
                        error={!!errors.amount} helperText={errors.amount || 'Actual cash/check amount'}
                        inputProps={{ step: 'any', min: 0 }}
                    />
                    <TextField
                        label="Withholding Tax" type="number" fullWidth
                        value={data.tax_withheld}
                        onChange={(e) => setData('tax_withheld', e.target.value)}
                        error={!!errors.tax_withheld} helperText={errors.tax_withheld || 'Tax you withheld from the supplier, if any'}
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
                        Settles {peso(settledTotal)} of the purchase ({peso(amountNum)} paid + {peso(taxNum)} tax withheld).
                    </Typography>
                )}

                <MethodFields data={data} setData={setData} errors={errors} />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">ALLOCATE TO ITEMS</Typography>
                    <Button type="button" size="small" onClick={autoFill}>Auto-fill</Button>
                </Stack>

                <Stack spacing={1}>
                    {purchase.items.map((it, index) => (
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
                    {!balanced && <Typography variant="caption" color="error.dark">Must match amount paid + tax withheld</Typography>}
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

function PurchaseDialog({ open, onClose, purchase, canEdit }) {
    const [mode, setMode] = useState('list');
    if (!purchase) return null;

    const handleDelete = (id) => {
        if (!confirm('Delete this payment? Its item allocations will be removed too.')) return;
        router.delete(`/purchase-payments/${id}`, { preserveScroll: true });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle fontWeight={700}>
                Payments — PO #{purchase.id}
                <Typography variant="body2" color="text.secondary" fontWeight={400} mt={0.5}>
                    {purchase.supplier?.name ?? '—'} · Total {peso(purchase.total_amount)}
                </Typography>
            </DialogTitle>
            <Divider />
            <DialogContent>
                {mode === 'form' ? (
                    <PurchasePaymentForm purchase={purchase} onSaved={() => setMode('list')} onCancel={() => setMode('list')} />
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
                                {purchase.items.map((it) => {
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
                        {purchase.payments.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                No payments recorded yet.
                            </Typography>
                        ) : (
                            <List disablePadding>
                                {purchase.payments.map((p) => {
                                    const { amount, detail } = paymentHistoryText(p);
                                    return (
                                        <ListItem
                                            key={p.id}
                                            divider
                                            secondaryAction={canEdit && (
                                                <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            )}
                                        >
                                            <ListItemText primary={amount} secondary={detail} />
                                        </ListItem>
                                    );
                                })}
                            </List>
                        )}

                        {canEdit && purchase.balance > 0.0001 && (
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

// ── Expenses (no line items — payment settles the expense directly) ──────

function ExpensePaymentForm({ expense, onSaved, onCancel }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        expense_id: expense.id,
        payment_date: '',
        amount: '',
        tax_withheld: '',
        method: 'Cash',
        reference_no: '',
        bank_name: '',
        check_no: '',
        check_date: '',
        notes: '',
    });

    const amountNum = Number(data.amount) || 0;
    const taxNum = Number(data.tax_withheld) || 0;
    const settledTotal = amountNum + taxNum;
    const remaining = Number(expense.amount) - Number(expense.paid_amount);
    const withinBalance = settledTotal <= remaining + 0.005;

    const submit = (e) => {
        e.preventDefault();
        post('/expense-payments', { onSuccess: () => { reset(); onSaved(); } });
    };

    return (
        <form onSubmit={submit}>
            <Stack spacing={2.5} pt={1}>
                <Stack direction="row" spacing={2}>
                    <TextField
                        label="Amount Paid" type="number" fullWidth required autoFocus
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value)}
                        error={!!errors.amount} helperText={errors.amount || `Actual cash/check amount (balance: ${peso(remaining)})`}
                        inputProps={{ step: 'any', min: 0 }}
                    />
                    <TextField
                        label="Withholding Tax" type="number" fullWidth
                        value={data.tax_withheld}
                        onChange={(e) => setData('tax_withheld', e.target.value)}
                        error={!!errors.tax_withheld} helperText={errors.tax_withheld || 'Tax you withheld from the payee, if any'}
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
                        Settles {peso(settledTotal)} of the expense ({peso(amountNum)} paid + {peso(taxNum)} tax withheld).
                    </Typography>
                )}
                {!withinBalance && (
                    <Typography variant="caption" color="error.main">
                        This exceeds the remaining balance of {peso(remaining)}.
                    </Typography>
                )}

                <MethodFields data={data} setData={setData} errors={errors} />

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
                <Button type="submit" variant="contained" disabled={processing || amountNum <= 0 || !withinBalance}>
                    Record Payment
                </Button>
            </DialogActions>
        </form>
    );
}

function ExpenseDialog({ open, onClose, expense, canEdit }) {
    const [mode, setMode] = useState('list');
    if (!expense) return null;

    const balance = Number(expense.amount) - Number(expense.paid_amount);

    const handleDelete = (id) => {
        if (!confirm('Delete this payment?')) return;
        router.delete(`/expense-payments/${id}`, { preserveScroll: true });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle fontWeight={700}>
                Payments — {expense.description}
                <Typography variant="body2" color="text.secondary" fontWeight={400} mt={0.5}>
                    {expense.category?.name ?? '—'} · Total {peso(expense.amount)} · Balance {peso(balance)}
                </Typography>
            </DialogTitle>
            <Divider />
            <DialogContent>
                {mode === 'form' ? (
                    <ExpensePaymentForm expense={expense} onSaved={() => setMode('list')} onCancel={() => setMode('list')} />
                ) : (
                    <>
                        <Typography variant="caption" color="text.secondary">PAYMENT HISTORY</Typography>
                        {expense.payments.length === 0 ? (
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                No payments recorded yet.
                            </Typography>
                        ) : (
                            <List disablePadding>
                                {expense.payments.map((p) => {
                                    const { amount, detail } = paymentHistoryText(p);
                                    return (
                                        <ListItem
                                            key={p.id}
                                            divider
                                            secondaryAction={canEdit && (
                                                <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            )}
                                        >
                                            <ListItemText primary={amount} secondary={detail} />
                                        </ListItem>
                                    );
                                })}
                            </List>
                        )}

                        {canEdit && balance > 0.0001 && (
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

// ── Page ──────────────────────────────────────────────────────────────

export default function PayablesIndex({ periods, currentPeriod, expenses, purchases, search }) {
    const { auth } = usePage().props;
    const canEditPurchases = auth.permissions.includes('manage purchases') && !currentPeriod?.is_closed;
    const canEditExpenses = auth.permissions.includes('manage expenses') && !currentPeriod?.is_closed;

    const [tab, setTab] = useState('purchases');
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');
    const [activePurchaseId, setActivePurchaseId] = useState(null);
    const [activeExpenseId, setActiveExpenseId] = useState(null);
    const [searchInput, setSearchInput] = useState(search ?? '');
    const searchTimer = useRef(null);
    const crossPeriod = Boolean(search);

    useEffect(() => () => clearTimeout(searchTimer.current), []);

    const handleSearchChange = (value) => {
        setSearchInput(value);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            router.get('/payables', value.trim() ? { q: value.trim() } : {}, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 400);
    };

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/payables', { period_id: id }, { preserveState: false });
    };

    const withBalance = (row) => ({ ...row, balance: Number(row.total_amount ?? row.amount) - Number(row.paid_amount) });

    const purchaseRows = purchases.map((po) => withBalance({ ...po, total_amount: po.total_amount }));
    const expenseRows = expenses.map((e) => withBalance(e));

    const purchaseTotals = purchases.reduce((acc, p) => {
        acc.total += Number(p.total_amount); acc.paid += Number(p.paid_amount); return acc;
    }, { total: 0, paid: 0 });
    const expenseTotals = expenses.reduce((acc, e) => {
        acc.total += Number(e.amount); acc.paid += Number(e.paid_amount); return acc;
    }, { total: 0, paid: 0 });

    const activePurchase = activePurchaseId ? purchaseRows.find((p) => p.id === activePurchaseId) : null;
    const activeExpense = activeExpenseId ? expenseRows.find((e) => e.id === activeExpenseId) : null;

    return (
        <AppLayout title="Payables">
            <Head title="Payables" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={crossPeriod ? 2 : 3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Payables</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Pay suppliers and vendors back — for Purchases and Expenses.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <SearchField value={searchInput} onChange={handleSearchChange} placeholder="Find supplier, description (any period)..." />
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

            {search && (
                <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                    <Chip
                        label={`Showing: results for "${search}" (all periods)`}
                        color="primary"
                        variant="outlined"
                        onDelete={() => { setSearchInput(''); router.get('/payables'); }}
                    />
                </Stack>
            )}

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab value="purchases" label="Purchases" />
                <Tab value="expenses" label="Expenses" />
            </Tabs>

            {tab === 'purchases' && (
                <Card>
                    <CardContent sx={{ p: '0 !important' }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Supplier</TableCell>
                                        {crossPeriod && <TableCell>Period</TableCell>}
                                        <TableCell>Date</TableCell>
                                        <TableCell align="right">Total</TableCell>
                                        <TableCell align="right">Paid</TableCell>
                                        <TableCell align="right">Balance</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="center" sx={{ width: 60 }} />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {purchaseRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={crossPeriod ? 8 : 7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                                {search ? `No purchases match "${search}".` : 'No purchases for this period.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        purchaseRows.map((po) => (
                                            <TableRow key={po.id} hover>
                                                <TableCell fontWeight={500}>{po.supplier?.name ?? '—'}</TableCell>
                                                {crossPeriod && (
                                                    <TableCell sx={{ color: 'text.secondary' }}>{po.period?.name ?? '—'}</TableCell>
                                                )}
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(po.po_date)}</TableCell>
                                                <TableCell align="right">{peso(po.total_amount)}</TableCell>
                                                <TableCell align="right">{peso(po.paid_amount)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>{peso(po.balance)}</TableCell>
                                                <TableCell>
                                                    <Chip label={STATUS_LABEL[po.status] ?? po.status} size="small" color={STATUS_COLOR[po.status] ?? 'default'} variant="outlined" />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" onClick={() => setActivePurchaseId(po.id)}>
                                                        <PaymentIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {purchases.length > 0 && (
                            <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                                <Stack direction="row" justifyContent="flex-end" spacing={3}>
                                    <Typography variant="body2" color="text.secondary">Total: <b>{peso(purchaseTotals.total)}</b></Typography>
                                    <Typography variant="body2" color="text.secondary">Paid: <b>{peso(purchaseTotals.paid)}</b></Typography>
                                    <Typography variant="body2" color="text.secondary">Balance: <b>{peso(purchaseTotals.total - purchaseTotals.paid)}</b></Typography>
                                </Stack>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {tab === 'expenses' && (
                <Card>
                    <CardContent sx={{ p: '0 !important' }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Description</TableCell>
                                        <TableCell>Category</TableCell>
                                        {crossPeriod && <TableCell>Period</TableCell>}
                                        <TableCell>Date</TableCell>
                                        <TableCell align="right">Total</TableCell>
                                        <TableCell align="right">Paid</TableCell>
                                        <TableCell align="right">Balance</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="center" sx={{ width: 60 }} />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {expenseRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={crossPeriod ? 9 : 8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                                {search ? `No expenses match "${search}".` : 'No expenses for this period.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        expenseRows.map((e) => (
                                            <TableRow key={e.id} hover>
                                                <TableCell fontWeight={500}>{e.description}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>{e.category?.name ?? '—'}</TableCell>
                                                {crossPeriod && (
                                                    <TableCell sx={{ color: 'text.secondary' }}>{e.period?.name ?? '—'}</TableCell>
                                                )}
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(e.expense_date)}</TableCell>
                                                <TableCell align="right">{peso(e.amount)}</TableCell>
                                                <TableCell align="right">{peso(e.paid_amount)}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>{peso(e.balance)}</TableCell>
                                                <TableCell>
                                                    <Chip label={STATUS_LABEL[e.status] ?? e.status} size="small" color={STATUS_COLOR[e.status] ?? 'default'} variant="outlined" />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" onClick={() => setActiveExpenseId(e.id)}>
                                                        <PaymentIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {expenses.length > 0 && (
                            <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                                <Stack direction="row" justifyContent="flex-end" spacing={3}>
                                    <Typography variant="body2" color="text.secondary">Total: <b>{peso(expenseTotals.total)}</b></Typography>
                                    <Typography variant="body2" color="text.secondary">Paid: <b>{peso(expenseTotals.paid)}</b></Typography>
                                    <Typography variant="body2" color="text.secondary">Balance: <b>{peso(expenseTotals.total - expenseTotals.paid)}</b></Typography>
                                </Stack>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            <PurchaseDialog
                key={`po-${activePurchase?.id ?? 'none'}`}
                open={!!activePurchase}
                onClose={() => setActivePurchaseId(null)}
                purchase={activePurchase}
                canEdit={canEditPurchases}
            />
            <ExpenseDialog
                key={`exp-${activeExpense?.id ?? 'none'}`}
                open={!!activeExpense}
                onClose={() => setActiveExpenseId(null)}
                expense={activeExpense}
                canEdit={canEditExpenses}
            />
        </AppLayout>
    );
}
