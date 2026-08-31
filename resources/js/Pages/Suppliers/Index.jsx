import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, IconButton,
    Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';

function SupplierForm({ open, onClose, supplier }) {
    const editing = Boolean(supplier);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name:            supplier?.name            ?? '',
        phone:           supplier?.phone            ?? '',
        contact_person:  supplier?.contact_person   ?? '',
        notes:           supplier?.notes            ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            put(`/suppliers/${supplier.id}`, opts);
        } else {
            post('/suppliers', opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.5} pt={1}>
                        <TextField
                            label="Name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            error={!!errors.name}
                            helperText={errors.name}
                            fullWidth
                            required
                            autoFocus
                        />

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                error={!!errors.phone}
                                helperText={errors.phone}
                                fullWidth
                            />
                            <TextField
                                label="Contact Person"
                                value={data.contact_person}
                                onChange={(e) => setData('contact_person', e.target.value)}
                                error={!!errors.contact_person}
                                helperText={errors.contact_person}
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
                    <Button type="button" onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>
                        {editing ? 'Save Changes' : 'Add Supplier'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function SuppliersIndex({ suppliers }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage suppliers');
    const [formOpen, setFormOpen] = useState(false);
    const [editSupplier, setEditSupplier] = useState(null);

    const handleDelete = (id) => {
        if (confirm('Delete this supplier?')) {
            router.delete(`/suppliers/${id}`);
        }
    };

    return (
        <AppLayout title="Suppliers">
            <Head title="Suppliers" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Suppliers</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Suppliers used for Purchases.
                    </Typography>
                </Box>
                {canEdit && (
                    <Button variant="contained" startIcon={<Add />} onClick={() => { setEditSupplier(null); setFormOpen(true); }}>
                        Add Supplier
                    </Button>
                )}
            </Stack>

            <Card>
                <CardContent sx={{ p: '0 !important' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Phone</TableCell>
                                    <TableCell>Contact Person</TableCell>
                                    <TableCell>Notes</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {suppliers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No suppliers found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    suppliers.map((s) => (
                                        <TableRow key={s.id} hover>
                                            <TableCell fontWeight={500}>{s.name}</TableCell>
                                            <TableCell>{s.phone ?? '—'}</TableCell>
                                            <TableCell>{s.contact_person ?? '—'}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary', maxWidth: 280 }}>{s.notes ?? '—'}</TableCell>
                                            {canEdit && (
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                        <IconButton size="small" onClick={() => { setEditSupplier(s); setFormOpen(true); }}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(s.id)}>
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
                </CardContent>
            </Card>

            <SupplierForm
                key={editSupplier?.id ?? 'new'}
                open={formOpen}
                onClose={() => setFormOpen(false)}
                supplier={editSupplier}
            />
        </AppLayout>
    );
}
