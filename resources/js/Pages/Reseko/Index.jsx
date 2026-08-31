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

function EntryForm({ open, onClose, periodId, purchaseLines, entry }) {
    const editing = Boolean(entry);
    const currentLine = entry?.purchase_item
        ? { id: entry.purchase_item.id, item_name: entry.item_name, unit: entry.unit, qty: entry.purchase_item.qty, unit_price: entry.purchase_item.unit_price, label: `${entry.supplier_name ?? ''} — ${entry.item_name}` }
        : null;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        pnl_period_id:     periodId ?? '',
        purchase_item_id:  entry?.purchase_item_id ?? '',
        qty:               entry?.qty              ?? '',
        reseko_date:       entry?.reseko_date       ?? '',
        notes:             entry?.notes             ?? '',
    });

    const [selectedLine, setSelectedLine] = useState(currentLine);

    const costPrice = selectedLine?.unit_price ?? 0;
    const computed = Number(data.qty || 0) * Number(costPrice || 0);

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            put(`/reseko/${entry.id}`, opts);
        } else {
            post('/reseko', opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Reseko Entry' : 'Add Reseko Entry'}</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.5} pt={1}>
                        <Autocomplete
                            options={purchaseLines}
                            getOptionLabel={(opt) => opt.label ?? ''}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            value={selectedLine}
                            onChange={(_, value) => {
                                setSelectedLine(value);
                                setData('purchase_item_id', value?.id ?? '');
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Purchase Line"
                                    required
                                    autoFocus
                                    error={!!errors.purchase_item_id}
                                    helperText={errors.purchase_item_id || 'Which purchase this shortage was found against'}
                                />
                            )}
                            fullWidth
                        />

                        {selectedLine && (
                            <Box sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2, py: 1.5 }}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="text.secondary">Purchased</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {Number(selectedLine.qty).toLocaleString()} {selectedLine.unit} @ {peso(selectedLine.unit_price)}/unit
                                    </Typography>
                                </Stack>
                            </Box>
                        )}

                        <TextField
                            label="Qty Short (purchased − delivered)"
                            type="number"
                            value={data.qty}
                            onChange={(e) => setData('qty', e.target.value)}
                            error={!!errors.qty}
                            helperText={errors.qty || 'Negative = more arrived than was purchased'}
                            fullWidth
                            required
                            inputProps={{ step: 'any' }}
                        />

                        {selectedLine && computed !== 0 && (
                            <Box sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200', borderRadius: 2, px: 2, py: 1.5 }}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="body2" color="error.dark">Computed Reseko Amount</Typography>
                                    <Typography variant="body2" fontWeight={700} color="error.main">{peso(computed)}</Typography>
                                </Stack>
                            </Box>
                        )}

                        <TextField
                            label="Date"
                            type="date"
                            value={data.reseko_date}
                            onChange={(e) => setData('reseko_date', e.target.value)}
                            error={!!errors.reseko_date}
                            helperText={errors.reseko_date}
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
                    <Button type="button" onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>
                        {editing ? 'Save Changes' : 'Add Entry'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function ResekoIndex({ periods, currentPeriod, entries, purchaseLines, total }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage expenses') && !currentPeriod?.is_closed;
    const [formOpen, setFormOpen] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/reseko', { period_id: id }, { preserveState: false });
    };

    const handleDelete = (id) => {
        if (confirm('Delete this reseko entry?')) {
            router.delete(`/reseko/${id}`);
        }
    };

    return (
        <AppLayout title="Reseko">
            <Head title="Reseko" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h5" fontWeight={700}>Reseko</Typography>
                        <Tooltip title="Values auto-feed into the P&L Reseko row">
                            <Chip icon={<AutoAwesome fontSize="small" />} label="Feeds P&L" size="small" color="secondary" variant="outlined" />
                        </Tooltip>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Shrinkage between what was purchased and what actually reached the customer, tied to the actual purchase line, valued at cost.
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
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            disabled={purchaseLines.length === 0}
                            onClick={() => { setEditEntry(null); setFormOpen(true); }}
                        >
                            Add Entry
                        </Button>
                    )}
                </Stack>
            </Stack>

            {canEdit && purchaseLines.length === 0 && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                    No purchase lines in this period yet — add a Purchase first, then you can log Reseko against its items.
                </Typography>
            )}

            <Card>
                <CardContent sx={{ p: '0 !important' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Supplier</TableCell>
                                    <TableCell>Item</TableCell>
                                    <TableCell align="right">Qty Short</TableCell>
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
                                        <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No reseko entries for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    entries.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(row.reseko_date)}</TableCell>
                                            <TableCell>{row.supplier_name ?? '—'}</TableCell>
                                            <TableCell fontWeight={500}>{row.item_name}</TableCell>
                                            <TableCell align="right">{Number(row.qty).toLocaleString()}</TableCell>
                                            <TableCell>{row.unit ?? '—'}</TableCell>
                                            <TableCell align="right">{peso(row.cost_price)}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600, color: row.amount < 0 ? 'success.main' : 'error.main' }}>{peso(row.amount)}</TableCell>
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
                                <Typography variant="body2" color="text.secondary">Total Reseko:</Typography>
                                <Typography variant="body2" fontWeight={700} color={total < 0 ? 'success.main' : 'error.main'}>{peso(total)}</Typography>
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
                purchaseLines={purchaseLines}
                entry={editEntry}
            />
        </AppLayout>
    );
}
