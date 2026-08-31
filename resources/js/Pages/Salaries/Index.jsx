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
import { peso, longDate as fmt } from '@/utils/format';

function EntryForm({ open, onClose, periodId, employees, entry }) {
    const editing = Boolean(entry);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        pnl_period_id: periodId ?? '',
        employee_id:   entry?.employee_id  ?? '',
        amount:        entry?.amount        ?? '',
        payment_date:  entry?.payment_date  ?? '',
        notes:         entry?.notes         ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            put(`/salaries/${entry.id}`, opts);
        } else {
            post('/salaries', opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Salary Entry' : 'Add Salary Entry'}</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.5} pt={1}>
                        <FormControl fullWidth required error={!!errors.employee_id}>
                            <InputLabel>Employee</InputLabel>
                            <Select
                                label="Employee"
                                value={data.employee_id}
                                onChange={(e) => setData('employee_id', e.target.value)}
                                autoFocus
                            >
                                {employees.map((emp) => (
                                    <MenuItem key={emp.id} value={emp.id}>
                                        {emp.name}{emp.role ? ` — ${emp.role}` : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

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
                                label="Payment Date"
                                type="date"
                                value={data.payment_date}
                                onChange={(e) => setData('payment_date', e.target.value)}
                                error={!!errors.payment_date}
                                helperText={errors.payment_date}
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
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
                    <Button type="button" onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>
                        {editing ? 'Save Changes' : 'Add Entry'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function SalariesIndex({ periods, currentPeriod, entries, employees, total }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage salaries') && !currentPeriod?.is_closed;
    const [formOpen, setFormOpen] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/salaries', { period_id: id }, { preserveState: false });
    };

    const handleDelete = (id) => {
        if (confirm('Delete this salary entry?')) {
            router.delete(`/salaries/${id}`);
        }
    };

    return (
        <AppLayout title="Salaries">
            <Head title="Salaries" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h5" fontWeight={700}>Salaries</Typography>
                        <Tooltip title="Totals auto-feed into the P&L 'Salaries and Wages' row">
                            <Chip icon={<AutoAwesome fontSize="small" />} label="Feeds P&L" size="small" color="secondary" variant="outlined" />
                        </Tooltip>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Per-employee salary payments. Totals roll into Salaries and Wages.
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
                                    <TableCell>Employee</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell>Notes</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No salary entries for this period.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    entries.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(row.payment_date)}</TableCell>
                                            <TableCell fontWeight={500}>{row.employee?.name ?? '—'}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary' }}>{row.employee?.role ?? '—'}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 600 }}>{peso(row.amount)}</TableCell>
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
                                <Typography variant="body2" color="text.secondary">Total Salaries:</Typography>
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
                employees={employees}
                entry={editEntry}
            />
        </AppLayout>
    );
}
