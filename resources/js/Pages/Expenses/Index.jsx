import { useState } from 'react';
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

function EntryForm({ open, onClose, periodId, categories, entry }) {
    const editing = Boolean(entry);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        pnl_period_id:       periodId ?? '',
        expense_category_id: entry?.expense_category_id ?? '',
        description:         entry?.description  ?? '',
        amount:               entry?.amount        ?? '',
        expense_date:        entry?.expense_date   ?? '',
        reference_no:        entry?.reference_no   ?? '',
        paid_by:             entry?.paid_by        ?? '',
        notes:               entry?.notes          ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            router.put(`/expenses/${entry.id}`, data, opts);
        } else {
            router.post('/expenses', data, opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.5} pt={1}>
                        <Autocomplete
                            options={categories}
                            getOptionLabel={(c) => c.name + (c.pnl_line_item ? ` → ${c.pnl_line_item.name}` : '')}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            value={categories.find((c) => c.id === data.expense_category_id) ?? null}
                            onChange={(e, newValue) => setData('expense_category_id', newValue?.id ?? '')}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Category"
                                    required
                                    error={!!errors.expense_category_id}
                                    helperText={errors.expense_category_id}
                                    autoFocus
                                />
                            )}
                            fullWidth
                        />

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
                                label="Amount"
                                type="number"
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                error={!!errors.amount}
                                helperText={errors.amount}
                                fullWidth
                                required
                                inputProps={{ step: 'any', min: 0 }}
                            />
                            <TextField
                                label="Date"
                                type="date"
                                value={data.expense_date}
                                onChange={(e) => setData('expense_date', e.target.value)}
                                error={!!errors.expense_date}
                                helperText={errors.expense_date}
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Stack>

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Reference No."
                                value={data.reference_no}
                                onChange={(e) => setData('reference_no', e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Paid By"
                                value={data.paid_by}
                                onChange={(e) => setData('paid_by', e.target.value)}
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
                    <Button onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>
                        {editing ? 'Save Changes' : 'Add Expense'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function ExpensesIndex({ periods, currentPeriod, entries, categories, total }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage expenses') && !currentPeriod?.is_closed;
    const [formOpen, setFormOpen] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/expenses', { period_id: id }, { preserveState: false });
    };

    const handleDelete = (id) => {
        if (confirm('Delete this expense?')) {
            router.delete(`/expenses/${id}`);
        }
    };

    return (
        <AppLayout title="Expenses">
            <Head title="Expenses" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h5" fontWeight={700}>Expenses</Typography>
                        <Tooltip title="Each category rolls straight into its matching P&L line">
                            <Chip icon={<AutoAwesome fontSize="small" />} label="Feeds P&L" size="small" color="secondary" variant="outlined" />
                        </Tooltip>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Day-to-day expenses, grouped by category, auto-roll into the matching P&L line.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
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
                            Add Expense
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
                                    <TableCell>Date</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell>Reference</TableCell>
                                    <TableCell>Paid By</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No expenses for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    entries.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(row.expense_date)}</TableCell>
                                            <TableCell fontWeight={500}>{row.category?.name ?? '—'}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary' }}>{row.description ?? '—'}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>{peso(row.amount)}</TableCell>
                                            <TableCell>{row.reference_no ?? '—'}</TableCell>
                                            <TableCell>{row.paid_by ?? '—'}</TableCell>
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
                                <Typography variant="body2" color="text.secondary">Total Expenses:</Typography>
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
                categories={categories}
                entry={editEntry}
            />
        </AppLayout>
    );
}
