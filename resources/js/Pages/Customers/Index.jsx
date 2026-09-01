import { useMemo, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, IconButton,
    InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import SearchField from '@/Components/Shared/SearchField';

const TYPE_COLOR = { hotel: 'info', restaurant: 'secondary', distributor: 'success', other: 'default' };
const TYPE_LABEL = { hotel: 'Hotel', restaurant: 'Restaurant', distributor: 'Distributor', other: 'Other' };

function CustomerForm({ open, onClose, customer }) {
    const editing = Boolean(customer);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name:                customer?.name                ?? '',
        type:                customer?.type                ?? 'other',
        phone:               customer?.phone               ?? '',
        contact_person:      customer?.contact_person      ?? '',
        address:             customer?.address             ?? '',
        payment_terms_days:  customer?.payment_terms_days  ?? 30,
        notes:               customer?.notes               ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            put(`/customers/${customer.id}`, opts);
        } else {
            post('/customers', opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.5} pt={1}>
                        <Stack direction="row" spacing={2}>
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
                            <FormControl sx={{ minWidth: 160 }} required error={!!errors.type}>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    label="Type"
                                    value={data.type}
                                    onChange={(e) => setData('type', e.target.value)}
                                >
                                    <MenuItem value="hotel">Hotel</MenuItem>
                                    <MenuItem value="restaurant">Restaurant</MenuItem>
                                    <MenuItem value="distributor">Distributor</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>

                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Phone"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                fullWidth
                            />
                            <TextField
                                label="Contact Person"
                                value={data.contact_person}
                                onChange={(e) => setData('contact_person', e.target.value)}
                                fullWidth
                            />
                        </Stack>

                        <TextField
                            label="Address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            error={!!errors.address}
                            helperText={errors.address}
                            fullWidth
                        />

                        <TextField
                            label="Payment Terms (days)"
                            type="number"
                            value={data.payment_terms_days}
                            onChange={(e) => setData('payment_terms_days', e.target.value)}
                            error={!!errors.payment_terms_days}
                            helperText={errors.payment_terms_days || 'Invoice due date = invoice date + this many days (e.g. 14 = 2 weeks, 21 = 3 weeks)'}
                            fullWidth
                            required
                            inputProps={{ step: 1, min: 0, max: 365 }}
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
                        {editing ? 'Save Changes' : 'Add Customer'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function CustomersIndex({ customers }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage customers');
    const [formOpen, setFormOpen] = useState(false);
    const [editCustomer, setEditCustomer] = useState(null);
    const [search, setSearch] = useState('');

    const handleDelete = (id) => {
        if (confirm('Delete this customer?')) {
            router.delete(`/customers/${id}`);
        }
    };

    const filteredCustomers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return customers;
        return customers.filter((c) => (
            c.name?.toLowerCase().includes(q)
            || c.phone?.toLowerCase().includes(q)
            || c.contact_person?.toLowerCase().includes(q)
            || TYPE_LABEL[c.type]?.toLowerCase().includes(q)
        ));
    }, [customers, search]);

    return (
        <AppLayout title="Customers">
            <Head title="Customers" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Customers</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Customers used for Receivables.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <SearchField value={search} onChange={setSearch} placeholder="Search name, phone, contact..." />
                    {canEdit && (
                        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditCustomer(null); setFormOpen(true); }}>
                            Add Customer
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
                                    <TableCell>Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Phone</TableCell>
                                    <TableCell>Contact Person</TableCell>
                                    <TableCell>Terms</TableCell>
                                    <TableCell>Notes</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredCustomers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            {search ? 'No customers match your search.' : 'No customers found.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCustomers.map((c) => (
                                        <TableRow key={c.id} hover>
                                            <TableCell fontWeight={500}>{c.name}</TableCell>
                                            <TableCell>
                                                <Chip label={TYPE_LABEL[c.type]} size="small" color={TYPE_COLOR[c.type]} variant="outlined" />
                                            </TableCell>
                                            <TableCell>{c.phone ?? '—'}</TableCell>
                                            <TableCell>{c.contact_person ?? '—'}</TableCell>
                                            <TableCell>{c.payment_terms_days} days</TableCell>
                                            <TableCell sx={{ color: 'text.secondary', maxWidth: 240 }}>{c.notes ?? '—'}</TableCell>
                                            {canEdit && (
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                        <IconButton size="small" onClick={() => { setEditCustomer(c); setFormOpen(true); }}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
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

            <CustomerForm
                key={editCustomer?.id ?? 'new'}
                open={formOpen}
                onClose={() => setFormOpen(false)}
                customer={editCustomer}
            />
        </AppLayout>
    );
}
