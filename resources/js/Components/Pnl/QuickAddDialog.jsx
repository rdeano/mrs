import { useEffect, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import {
    Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, IconButton, InputLabel,
    List, ListItem, ListItemText, MenuItem, Select, Stack, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { peso, longDate } from '@/utils/format';

const ENDPOINT = {
    expense:  '/expenses',
    purchase: '/purchases',
    invoice:  '/receivables',
    salary:   '/salaries',
    wastage:  '/wastages',
};

function ExpenseFields({ data, setData, errors, categoryName }) {
    return (
        <>
            <TextField label="Category" value={categoryName ?? ''} fullWidth disabled />
            <TextField
                label="Description"
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
                error={!!errors.description}
                helperText={errors.description}
                fullWidth
            />
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
                    value={data.expense_date}
                    onChange={(e) => setData('expense_date', e.target.value)}
                    error={!!errors.expense_date} helperText={errors.expense_date}
                    InputLabelProps={{ shrink: true }}
                />
            </Stack>
            <Stack direction="row" spacing={2}>
                <TextField label="Reference No." value={data.reference_no} onChange={(e) => setData('reference_no', e.target.value)} fullWidth />
                <TextField label="Paid By" value={data.paid_by} onChange={(e) => setData('paid_by', e.target.value)} fullWidth />
            </Stack>
        </>
    );
}

function PurchaseFields({ data, setData, errors, suppliers }) {
    return (
        <>
            <Autocomplete
                options={suppliers}
                getOptionLabel={(s) => s.name}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                value={suppliers.find((s) => s.id === data.supplier_id) ?? null}
                onChange={(e, newValue) => setData('supplier_id', newValue?.id ?? '')}
                renderInput={(params) => (
                    <TextField {...params} label="Supplier" required error={!!errors.supplier_id} helperText={errors.supplier_id} autoFocus />
                )}
                fullWidth
            />
            <Stack direction="row" spacing={2}>
                <TextField
                    label="Total Amount" type="number" fullWidth required
                    value={data.total_amount}
                    onChange={(e) => setData('total_amount', e.target.value)}
                    error={!!errors.total_amount} helperText={errors.total_amount}
                    inputProps={{ step: 'any', min: 0 }}
                />
                <TextField
                    label="Date" type="date" fullWidth required
                    value={data.po_date}
                    onChange={(e) => setData('po_date', e.target.value)}
                    error={!!errors.po_date} helperText={errors.po_date}
                    InputLabelProps={{ shrink: true }}
                />
            </Stack>
        </>
    );
}

function InvoiceFields({ data, setData, errors, customers }) {
    return (
        <>
            <Stack direction="row" spacing={2}>
                <TextField
                    label="Invoice No." fullWidth required autoFocus
                    value={data.invoice_no}
                    onChange={(e) => setData('invoice_no', e.target.value)}
                    error={!!errors.invoice_no} helperText={errors.invoice_no}
                />
                <Autocomplete
                    sx={{ minWidth: 240 }}
                    options={customers}
                    getOptionLabel={(c) => c.name}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    value={customers.find((c) => c.id === data.customer_id) ?? null}
                    onChange={(e, newValue) => setData('customer_id', newValue?.id ?? '')}
                    renderInput={(params) => (
                        <TextField {...params} label="Customer" required error={!!errors.customer_id} helperText={errors.customer_id} />
                    )}
                    fullWidth
                />
            </Stack>
            <Stack direction="row" spacing={2}>
                <TextField
                    label="Total Amount" type="number" fullWidth required
                    value={data.total_amount}
                    onChange={(e) => setData('total_amount', e.target.value)}
                    error={!!errors.total_amount} helperText={errors.total_amount}
                    inputProps={{ step: 'any', min: 0 }}
                />
                <TextField
                    label="Date" type="date" fullWidth required
                    value={data.invoice_date}
                    onChange={(e) => setData('invoice_date', e.target.value)}
                    error={!!errors.invoice_date} helperText={errors.invoice_date}
                    InputLabelProps={{ shrink: true }}
                />
            </Stack>
        </>
    );
}

function SalaryFields({ data, setData, errors, employees }) {
    return (
        <>
            <FormControl fullWidth required error={!!errors.employee_id}>
                <InputLabel>Employee</InputLabel>
                <Select
                    label="Employee"
                    value={data.employee_id}
                    onChange={(e) => setData('employee_id', e.target.value)}
                    autoFocus
                >
                    {employees.map((emp) => (
                        <MenuItem key={emp.id} value={emp.id}>{emp.name}{emp.role ? ` — ${emp.role}` : ''}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
                <TextField
                    label="Amount" type="number" fullWidth required
                    value={data.amount}
                    onChange={(e) => setData('amount', e.target.value)}
                    error={!!errors.amount} helperText={errors.amount}
                    inputProps={{ step: 'any', min: 0 }}
                />
                <TextField
                    label="Payment Date" type="date" fullWidth required
                    value={data.payment_date}
                    onChange={(e) => setData('payment_date', e.target.value)}
                    error={!!errors.payment_date} helperText={errors.payment_date}
                    InputLabelProps={{ shrink: true }}
                />
            </Stack>
        </>
    );
}

function WastageFields({ data, setData, errors }) {
    const computed = Number(data.qty || 0) * Number(data.cost_price || 0);
    return (
        <>
            <Stack direction="row" spacing={2}>
                <TextField
                    label="Item Name" fullWidth required autoFocus
                    value={data.item_name}
                    onChange={(e) => setData('item_name', e.target.value)}
                    error={!!errors.item_name} helperText={errors.item_name}
                />
                <TextField label="Unit" value={data.unit} onChange={(e) => setData('unit', e.target.value)} sx={{ width: 100 }} />
            </Stack>
            <Stack direction="row" spacing={2}>
                <TextField
                    label="Qty Wasted" type="number" fullWidth required
                    value={data.qty}
                    onChange={(e) => setData('qty', e.target.value)}
                    error={!!errors.qty} helperText={errors.qty}
                    inputProps={{ step: 'any', min: 0 }}
                />
                <TextField
                    label="Cost Price / unit" type="number" fullWidth required
                    value={data.cost_price}
                    onChange={(e) => setData('cost_price', e.target.value)}
                    error={!!errors.cost_price} helperText={errors.cost_price}
                    inputProps={{ step: 'any', min: 0 }}
                />
            </Stack>
            {computed > 0 && (
                <Box sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200', borderRadius: 2, px: 2, py: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="error.dark">Computed Wastage Amount</Typography>
                        <Typography variant="body2" fontWeight={700} color="error.main">{peso(computed)}</Typography>
                    </Stack>
                </Box>
            )}
            <TextField
                label="Date" type="date" fullWidth required
                value={data.wastage_date}
                onChange={(e) => setData('wastage_date', e.target.value)}
                error={!!errors.wastage_date} helperText={errors.wastage_date}
                InputLabelProps={{ shrink: true }}
            />
        </>
    );
}

const INITIAL_DATA = {
    expense:  (periodId, date, e) => ({ pnl_period_id: periodId, description: e?.description ?? '', amount: e?.amount ?? '', expense_date: e?.expense_date ?? date, reference_no: e?.reference_no ?? '', paid_by: e?.paid_by ?? '', notes: e?.notes ?? '' }),
    purchase: (periodId, date, e) => ({ pnl_period_id: periodId, supplier_id: e?.supplier_id ?? '', total_amount: e?.total_amount ?? '', po_date: e?.po_date ?? date, notes: e?.notes ?? '' }),
    invoice:  (periodId, date, e) => ({ pnl_period_id: periodId, invoice_no: e?.invoice_no ?? '', customer_id: e?.customer_id ?? '', total_amount: e?.total_amount ?? '', invoice_date: e?.invoice_date ?? date, notes: e?.notes ?? '' }),
    salary:   (periodId, date, e) => ({ pnl_period_id: periodId, employee_id: e?.employee_id ?? '', amount: e?.amount ?? '', payment_date: e?.payment_date ?? date, notes: e?.notes ?? '' }),
    wastage:  (periodId, date, e) => ({ pnl_period_id: periodId, item_name: e?.item_name ?? '', unit: e?.unit ?? 'kg', qty: e?.qty ?? '', cost_price: e?.cost_price ?? '', wastage_date: e?.wastage_date ?? date, notes: e?.notes ?? '' }),
};

function EntryFormPanel({ sourceType, entry, category, periodId, date, suppliers, customers, employees, onSaved, onCancel, showCancel }) {
    const { data, setData, processing, errors, reset } = useForm(INITIAL_DATA[sourceType](periodId, date, entry));

    const submit = (e) => {
        e.preventDefault();
        const payload = sourceType === 'expense' ? { ...data, expense_category_id: category?.id } : data;
        const opts = { preserveScroll: true, onSuccess: () => { reset(); onSaved(); } };

        if (entry) {
            router.put(`${ENDPOINT[sourceType]}/${entry.id}`, payload, opts);
        } else {
            router.post(ENDPOINT[sourceType], payload, opts);
        }
    };

    return (
        <form onSubmit={submit}>
            <Stack spacing={2.5} pt={1}>
                {sourceType === 'expense' && <ExpenseFields data={data} setData={setData} errors={errors} categoryName={category?.name} />}
                {sourceType === 'purchase' && <PurchaseFields data={data} setData={setData} errors={errors} suppliers={suppliers} />}
                {sourceType === 'invoice' && <InvoiceFields data={data} setData={setData} errors={errors} customers={customers} />}
                {sourceType === 'salary' && <SalaryFields data={data} setData={setData} errors={errors} employees={employees} />}
                {sourceType === 'wastage' && <WastageFields data={data} setData={setData} errors={errors} />}

                <TextField
                    label="Notes"
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                />
            </Stack>
            <Divider sx={{ mt: 2.5 }} />
            <DialogActions sx={{ px: 0, py: 2 }}>
                {showCancel && <Button onClick={onCancel} color="inherit">Back</Button>}
                <Button type="submit" variant="contained" disabled={processing}>
                    {entry ? 'Save Changes' : 'Add Entry'}
                </Button>
            </DialogActions>
        </form>
    );
}

export default function QuickAddDialog({ open, onClose, context, expenseCategories, suppliers, customers, employees }) {
    const sourceType = context?.sourceType;
    const category = sourceType === 'expense'
        ? expenseCategories.find((ec) => ec.pnl_line_item_id === context.lineItemId)
        : null;

    const [entries, setEntries] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [mode, setMode] = useState('list'); // 'list' | 'form'
    const [activeEntry, setActiveEntry] = useState(null); // null = adding new, else editing this one

    const refetch = () => {
        if (!context) return;
        setLoadingList(true);
        const params = new URLSearchParams({
            pnl_line_item_id: context.lineItemId,
            pnl_period_id: context.periodId,
            date: context.date,
        });
        fetch(`/pnl/cell-entries?${params}`)
            .then((r) => r.json())
            .then((json) => {
                const list = json.entries ?? [];
                setEntries(list);
                setLoadingList(false);
                setMode(list.length === 0 ? 'form' : 'list');
                setActiveEntry(null);
            })
            .catch(() => { setEntries([]); setLoadingList(false); setMode('form'); setActiveEntry(null); });
    };

    useEffect(() => {
        if (open && context) refetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, context?.lineItemId, context?.date, context?.periodId]);

    if (!context || !sourceType) return null;

    const handleDelete = (id) => {
        if (!confirm('Delete this entry?')) return;
        router.delete(`${ENDPOINT[sourceType]}/${id}`, { preserveScroll: true, onSuccess: refetch });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle fontWeight={700}>
                {context.sourceLabel} — {context.lineItemName}
                <Typography variant="body2" color="text.secondary" fontWeight={400} mt={0.5}>
                    {longDate(context.date)}
                </Typography>
            </DialogTitle>
            <Divider />
            <DialogContent>
                {loadingList ? (
                    <Stack alignItems="center" py={4}><CircularProgress size={28} /></Stack>
                ) : mode === 'list' ? (
                    <>
                        <List disablePadding>
                            {entries.map((entry) => (
                                <ListItem
                                    key={entry.id}
                                    divider
                                    secondaryAction={
                                        <Stack direction="row" spacing={0.5}>
                                            <IconButton size="small" onClick={() => { setActiveEntry(entry); setMode('form'); }}>
                                                <Edit fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDelete(entry.id)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Stack>
                                    }
                                >
                                    <ListItemText primary={entry.label} secondary={peso(entry.amount)} />
                                </ListItem>
                            ))}
                        </List>
                        <Button
                            startIcon={<Add />}
                            sx={{ mt: 2 }}
                            onClick={() => { setActiveEntry(null); setMode('form'); }}
                        >
                            Add another entry
                        </Button>
                    </>
                ) : (
                    <EntryFormPanel
                        key={activeEntry?.id ?? 'new'}
                        sourceType={sourceType}
                        entry={activeEntry}
                        category={category}
                        periodId={context.periodId}
                        date={context.date}
                        suppliers={suppliers}
                        customers={customers}
                        employees={employees}
                        onSaved={refetch}
                        onCancel={() => setMode('list')}
                        showCancel={entries.length > 0}
                    />
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
