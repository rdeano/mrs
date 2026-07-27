import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, IconButton,
    InputLabel, MenuItem, Select, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField,
    Typography, Tooltip,
} from '@mui/material';
import { Add, Delete, Edit, AutoAwesome } from '@mui/icons-material';

const peso = (v) =>
    '₱' + Number(v ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function EntryForm({ open, onClose, periodId, entry }) {
    const editing = Boolean(entry);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        pnl_period_id: periodId ?? '',
        item_name:     entry?.item_name   ?? '',
        unit:          entry?.unit        ?? 'kg',
        qty:           entry?.qty         ?? '',
        cost_price:    entry?.cost_price  ?? '',
        wastage_date:  entry?.wastage_date ?? '',
        notes:         entry?.notes       ?? '',
    });

    const computed = Number(data.qty || 0) * Number(data.cost_price || 0);

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            router.put(`/wastages/${entry.id}`, data, opts);
        } else {
            router.post('/wastages', data, opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Wastage Entry' : 'Add Wastage Entry'}</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.5} pt={1}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Item Name"
                                value={data.item_name}
                                onChange={(e) => setData('item_name', e.target.value)}
                                error={!!errors.item_name}
                                helperText={errors.item_name}
                                fullWidth
                                required
                                autoFocus
                            />
                            <TextField
                                label="Unit"
                                value={data.unit}
                                onChange={(e) => setData('unit', e.target.value)}
                                sx={{ width: 100 }}
                            />
                        </Stack>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Qty Wasted"
                                type="number"
                                value={data.qty}
                                onChange={(e) => setData('qty', e.target.value)}
                                error={!!errors.qty}
                                helperText={errors.qty}
                                fullWidth
                                required
                                inputProps={{ step: 'any', min: 0 }}
                            />
                            <TextField
                                label="Cost Price / unit"
                                type="number"
                                value={data.cost_price}
                                onChange={(e) => setData('cost_price', e.target.value)}
                                error={!!errors.cost_price}
                                helperText={errors.cost_price}
                                fullWidth
                                required
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
                            label="Date"
                            type="date"
                            value={data.wastage_date}
                            onChange={(e) => setData('wastage_date', e.target.value)}
                            error={!!errors.wastage_date}
                            helperText={errors.wastage_date}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                        />
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
                        {editing ? 'Save Changes' : 'Add Entry'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function WastagesIndex({ periods, currentPeriod, entries, total }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage expenses') && !currentPeriod?.is_closed;
    const [formOpen, setFormOpen] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/wastages', { period_id: id }, { preserveState: false });
    };

    const handleDelete = (id) => {
        if (confirm('Delete this wastage entry?')) {
            router.delete(`/wastages/${id}`);
        }
    };

    return (
        <AppLayout title="Wastages">
            <Head title="Wastages" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h5" fontWeight={700}>Wastages</Typography>
                        <Tooltip title="Values auto-feed into the P&L Wastages row">
                            <Chip icon={<AutoAwesome fontSize="small" />} label="Formula-driven" size="small" color="secondary" variant="outlined" />
                        </Tooltip>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Records here automatically update the Wastages line in the P&L statement.
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
                            Add Entry
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
                                    <TableCell>Item</TableCell>
                                    <TableCell align="right">Qty</TableCell>
                                    <TableCell>Unit</TableCell>
                                    <TableCell align="right">Cost/unit</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell>Notes</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No wastage entries for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    entries.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(row.wastage_date)}</TableCell>
                                            <TableCell fontWeight={500}>{row.item_name}</TableCell>
                                            <TableCell align="right">{Number(row.qty).toLocaleString()}</TableCell>
                                            <TableCell>{row.unit ?? '—'}</TableCell>
                                            <TableCell align="right">{peso(row.cost_price)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: 'error.main' }}>{peso(row.amount)}</TableCell>
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
                                <Typography variant="body2" color="text.secondary">Total Wastage:</Typography>
                                <Typography variant="body2" fontWeight={700} color="error.main">{peso(total)}</Typography>
                            </Stack>
                        </Box>
                    )}
                </CardContent>
            </Card>

            <EntryForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                periodId={currentPeriod?.id}
                entry={editEntry}
            />
        </AppLayout>
    );
}
