import { useMemo, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Autocomplete, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, IconButton,
    InputLabel, MenuItem, Select, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField,
    Typography, Tooltip,
} from '@mui/material';
import { Add, Delete, Edit, AutoAwesome } from '@mui/icons-material';
import { peso, longDate as fmt } from '@/utils/format';
import SearchField from '@/Components/Shared/SearchField';

const emptyItem = () => ({ item_name: '', qty: '', unit_price: '' });

function EntryForm({ open, onClose, periodId, customers, itemOptions, entry }) {
    const editing = Boolean(entry);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        pnl_period_id: periodId ?? '',
        customer_id:   entry?.customer_id  ?? '',
        invoice_no:    entry?.invoice_no    ?? '',
        invoice_date:  entry?.invoice_date  ?? '',
        notes:         entry?.notes         ?? '',
        items:         entry?.items?.length
            ? entry.items.map((it) => ({ item_name: it.item_name, qty: it.qty, unit_price: it.unit_price }))
            : [emptyItem()],
    });

    const setItem = (index, field, value) => {
        const next = data.items.map((row, i) => (i === index ? { ...row, [field]: value } : row));
        setData('items', next);
    };

    const addItem = () => setData('items', [...data.items, emptyItem()]);
    const removeItem = (index) => setData('items', data.items.filter((_, i) => i !== index));

    const rowAmount = (row) => (Number(row.qty) || 0) * (Number(row.unit_price) || 0);
    const total = data.items.reduce((sum, row) => sum + rowAmount(row), 0);

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            put(`/receivables/${entry.id}`, opts);
        } else {
            post('/receivables', opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Receivable' : 'Add Receivable'}</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.5} pt={1}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Invoice No."
                                value={data.invoice_no}
                                onChange={(e) => setData('invoice_no', e.target.value)}
                                error={!!errors.invoice_no}
                                helperText={errors.invoice_no}
                                fullWidth
                                required
                                autoFocus
                            />
                            <FormControl fullWidth required error={!!errors.customer_id}>
                                <InputLabel>Customer</InputLabel>
                                <Select
                                    label="Customer"
                                    value={data.customer_id}
                                    onChange={(e) => setData('customer_id', e.target.value)}
                                >
                                    {customers.map((c) => (
                                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                label="Date"
                                type="date"
                                value={data.invoice_date}
                                onChange={(e) => setData('invoice_date', e.target.value)}
                                error={!!errors.invoice_date}
                                helperText={errors.invoice_date}
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Stack>

                        <Divider textAlign="left">
                            <Typography variant="caption" color="text.secondary">ITEMS</Typography>
                        </Divider>

                        <Stack spacing={1.5}>
                            {data.items.map((row, index) => (
                                <Stack key={index} direction="row" spacing={1.5} alignItems="flex-start">
                                    <Autocomplete
                                        freeSolo
                                        options={itemOptions}
                                        getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.name)}
                                        value={row.item_name}
                                        onChange={(_, value) => {
                                            const next = data.items.map((r, i) => {
                                                if (i !== index) return r;
                                                if (value && typeof value === 'object') {
                                                    return {
                                                        ...r,
                                                        item_name: value.name,
                                                        unit_price: (value.default_price && !r.unit_price) ? value.default_price : r.unit_price,
                                                    };
                                                }
                                                return { ...r, item_name: value ?? '' };
                                            });
                                            setData('items', next);
                                        }}
                                        onInputChange={(_, value) => setItem(index, 'item_name', value)}
                                        sx={{ flex: 3 }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Item"
                                                required
                                                error={!!errors[`items.${index}.item_name`]}
                                                helperText={errors[`items.${index}.item_name`]}
                                            />
                                        )}
                                    />
                                    <TextField
                                        label="Qty"
                                        type="number"
                                        value={row.qty}
                                        onChange={(e) => setItem(index, 'qty', e.target.value)}
                                        error={!!errors[`items.${index}.qty`]}
                                        helperText={errors[`items.${index}.qty`]}
                                        sx={{ flex: 1, minWidth: 90 }}
                                        required
                                        inputProps={{ step: 'any', min: 0 }}
                                    />
                                    <TextField
                                        label="Price"
                                        type="number"
                                        value={row.unit_price}
                                        onChange={(e) => setItem(index, 'unit_price', e.target.value)}
                                        error={!!errors[`items.${index}.unit_price`]}
                                        helperText={errors[`items.${index}.unit_price`]}
                                        sx={{ flex: 1, minWidth: 110 }}
                                        required
                                        inputProps={{ step: 'any', min: 0 }}
                                    />
                                    <TextField
                                        label="Amount"
                                        value={peso(rowAmount(row))}
                                        sx={{ flex: 1.3, minWidth: 140 }}
                                        disabled
                                    />
                                    <IconButton
                                        type="button"
                                        size="small"
                                        color="error"
                                        onClick={() => removeItem(index)}
                                        disabled={data.items.length === 1}
                                        sx={{ mt: 1 }}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Stack>
                            ))}
                        </Stack>

                        <Box>
                            <Button type="button" size="small" startIcon={<Add />} onClick={addItem}>
                                Add Item
                            </Button>
                        </Box>

                        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ pr: 6 }}>
                            <Typography variant="body2" color="text.secondary">Total:</Typography>
                            <Typography variant="body2" fontWeight={700}>{peso(total)}</Typography>
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
                        {editing ? 'Save Changes' : 'Add Receivable'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function ReceivablesIndex({ periods, currentPeriod, entries, customers, itemOptions, total }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage invoices') && !currentPeriod?.is_closed;
    const [formOpen, setFormOpen] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');
    const [search, setSearch] = useState('');

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/receivables', { period_id: id }, { preserveState: false });
    };

    const handleDelete = (id) => {
        if (confirm('Delete this receivable? This removes all its item lines.')) {
            router.delete(`/receivables/${id}`);
        }
    };

    const filteredEntries = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return entries;
        return entries.filter((invoice) => (
            invoice.invoice_no?.toLowerCase().includes(q)
            || invoice.customer?.name?.toLowerCase().includes(q)
            || invoice.notes?.toLowerCase().includes(q)
            || invoice.items?.some((it) => it.item_name?.toLowerCase().includes(q))
        ));
    }, [entries, search]);

    // Flatten invoices -> one row per item line, with rowSpan on the invoice-level columns.
    const rows = filteredEntries.flatMap((invoice) => {
        const items = invoice.items?.length ? invoice.items : [{ id: `${invoice.id}-blank`, item_name: null, qty: null, unit_price: null, amount: invoice.total_amount }];
        return items.map((item, idx) => ({
            key: `${invoice.id}-${item.id ?? idx}`,
            invoice,
            item,
            isFirst: idx === 0,
            span: items.length,
        }));
    });

    return (
        <AppLayout title="Receivables">
            <Head title="Receivables" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h5" fontWeight={700}>Receivables</Typography>
                        <Tooltip title="Totals auto-feed into the P&L 'Trading Products - Sales' row">
                            <Chip icon={<AutoAwesome fontSize="small" />} label="Feeds P&L" size="small" color="secondary" variant="outlined" />
                        </Tooltip>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Sales per customer. Totals roll into Trading Products - Sales.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <SearchField value={search} onChange={setSearch} placeholder="Search invoice no, customer, item..." />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Period</InputLabel>
                        <Select value={selectedPeriodId} label="Period" onChange={(e) => changePeriod(e.target.value)}>
                            {periods.map((p) => (
                                <MenuItem key={p.id} value={p.id}>{p.name}{p.is_closed ? ' 🔒' : ''}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {canEdit && (
                        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditEntry(null); setFormOpen(true); }}>
                            Add Receivable
                        </Button>
                    )}
                </Stack>
            </Stack>

            <Card>
                <CardContent sx={{ p: '0 !important' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Invoice No.</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Item</TableCell>
                                    <TableCell align="right">Qty</TableCell>
                                    <TableCell align="right">Price</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Due Date</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            {search ? 'No receivables match your search.' : 'No receivables for this period.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map(({ key, invoice, item, isFirst, span }) => (
                                        <TableRow key={key} hover>
                                            {isFirst && (
                                                <TableCell rowSpan={span} fontWeight={500} sx={{ verticalAlign: 'top' }}>
                                                    {invoice.invoice_no}
                                                </TableCell>
                                            )}
                                            {isFirst && (
                                                <TableCell rowSpan={span} sx={{ verticalAlign: 'top' }}>
                                                    {invoice.customer?.name ?? '—'}
                                                </TableCell>
                                            )}
                                            <TableCell>{item.item_name ?? '—'}</TableCell>
                                            <TableCell align="right">{item.qty ?? '—'}</TableCell>
                                            <TableCell align="right">{item.unit_price ? peso(item.unit_price) : '—'}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>{peso(item.amount)}</TableCell>
                                            {isFirst && (
                                                <TableCell rowSpan={span} sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                                    {fmt(invoice.invoice_date)}
                                                </TableCell>
                                            )}
                                            {isFirst && (
                                                <TableCell rowSpan={span} sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                                    {fmt(invoice.due_date)}
                                                </TableCell>
                                            )}
                                            {canEdit && isFirst && (
                                                <TableCell rowSpan={span} align="center" sx={{ verticalAlign: 'top' }}>
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                        <IconButton size="small" onClick={() => { setEditEntry(invoice); setFormOpen(true); }}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(invoice.id)}>
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
                                <Typography variant="body2" color="text.secondary">Total Receivables:</Typography>
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
                customers={customers}
                itemOptions={itemOptions}
                entry={editEntry}
            />
        </AppLayout>
    );
}
