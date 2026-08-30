import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, IconButton,
    InputLabel, MenuItem, Select, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';

const TYPE_COLOR = { supplier: 'info', customer: 'success', both: 'secondary' };
const TYPE_LABEL = { supplier: 'Supplier', customer: 'Customer', both: 'Both' };

function ContactForm({ open, onClose, contact }) {
    const editing = Boolean(contact);
    const { data, setData, processing, errors, reset } = useForm({
        name:            contact?.name            ?? '',
        type:            contact?.type            ?? 'supplier',
        phone:           contact?.phone            ?? '',
        secondary_phone: contact?.secondary_phone ?? '',
        address:         contact?.address          ?? '',
        notes:           contact?.notes            ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            router.put(`/contacts/${contact.id}`, data, opts);
        } else {
            router.post('/contacts', data, opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
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
                                    <MenuItem value="supplier">Supplier</MenuItem>
                                    <MenuItem value="customer">Customer</MenuItem>
                                    <MenuItem value="both">Both</MenuItem>
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
                                label="Secondary Phone"
                                value={data.secondary_phone}
                                onChange={(e) => setData('secondary_phone', e.target.value)}
                                fullWidth
                            />
                        </Stack>

                        <TextField
                            label="Address"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            fullWidth
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
                        {editing ? 'Save Changes' : 'Add Contact'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function ContactsIndex({ contacts, type }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage contacts');
    const [formOpen, setFormOpen] = useState(false);
    const [editContact, setEditContact] = useState(null);
    const [typeFilter, setTypeFilter] = useState(type ?? '');

    const changeType = (val) => {
        setTypeFilter(val);
        router.get('/contacts', val ? { type: val } : {}, { preserveState: false });
    };

    const handleDelete = (id) => {
        if (confirm('Delete this contact?')) {
            router.delete(`/contacts/${id}`);
        }
    };

    return (
        <AppLayout title="Contacts">
            <Head title="Contacts" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Contacts</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Suppliers and customers in one directory.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Type</InputLabel>
                        <Select value={typeFilter} label="Type" onChange={(e) => changeType(e.target.value)}>
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="supplier">Supplier</MenuItem>
                            <MenuItem value="customer">Customer</MenuItem>
                            <MenuItem value="both">Both</MenuItem>
                        </Select>
                    </FormControl>
                    {canEdit && (
                        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditContact(null); setFormOpen(true); }}>
                            Add Contact
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
                                    <TableCell>Secondary Phone</TableCell>
                                    <TableCell>Address</TableCell>
                                    <TableCell>Notes</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {contacts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No contacts found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    contacts.map((c) => (
                                        <TableRow key={c.id} hover>
                                            <TableCell fontWeight={500}>{c.name}</TableCell>
                                            <TableCell>
                                                <Chip label={TYPE_LABEL[c.type]} size="small" color={TYPE_COLOR[c.type]} variant="outlined" />
                                            </TableCell>
                                            <TableCell>{c.phone ?? '—'}</TableCell>
                                            <TableCell>{c.secondary_phone ?? '—'}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary', maxWidth: 200 }}>{c.address ?? '—'}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary', maxWidth: 200 }}>{c.notes ?? '—'}</TableCell>
                                            {canEdit && (
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                        <IconButton size="small" onClick={() => { setEditContact(c); setFormOpen(true); }}>
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

            <ContactForm
                key={editContact?.id ?? 'new'}
                open={formOpen}
                onClose={() => setFormOpen(false)}
                contact={editContact}
            />
        </AppLayout>
    );
}
