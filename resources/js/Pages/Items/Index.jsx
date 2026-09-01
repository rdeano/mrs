import { useMemo, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControlLabel, IconButton,
    Stack, Switch, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { peso } from '@/utils/format';
import SearchField from '@/Components/Shared/SearchField';

function ItemForm({ open, onClose, item }) {
    const editing = Boolean(item);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name:          item?.name          ?? '',
        unit:          item?.unit          ?? '',
        default_price: item?.default_price ?? '',
        is_active:     item?.is_active     ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            put(`/items/${item.id}`, opts);
        } else {
            post('/items', opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Item' : 'Add Item'}</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.5} pt={1}>
                        <TextField
                            label="Item Name"
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
                                label="Unit"
                                placeholder="kg, box, pc..."
                                value={data.unit}
                                onChange={(e) => setData('unit', e.target.value)}
                                error={!!errors.unit}
                                helperText={errors.unit}
                                fullWidth
                            />
                            <TextField
                                label="Default Price"
                                type="number"
                                value={data.default_price}
                                onChange={(e) => setData('default_price', e.target.value)}
                                error={!!errors.default_price}
                                helperText={errors.default_price}
                                fullWidth
                                inputProps={{ step: 'any', min: 0 }}
                            />
                        </Stack>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                />
                            }
                            label="Active"
                        />
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button type="button" onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>
                        {editing ? 'Save Changes' : 'Add Item'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function ItemsIndex({ items }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage items');
    const [formOpen, setFormOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [search, setSearch] = useState('');

    const handleDelete = (id) => {
        if (confirm('Delete this item?')) {
            router.delete(`/items/${id}`);
        }
    };

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((it) => (
            it.name?.toLowerCase().includes(q)
            || it.unit?.toLowerCase().includes(q)
        ));
    }, [items, search]);

    return (
        <AppLayout title="Items">
            <Head title="Items" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Items</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Product catalog used for Receivables and Purchases line items.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <SearchField value={search} onChange={setSearch} placeholder="Search name, unit..." />
                    {canEdit && (
                        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditItem(null); setFormOpen(true); }}>
                            Add Item
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
                                    <TableCell>Unit</TableCell>
                                    <TableCell align="right">Default Price</TableCell>
                                    <TableCell>Status</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            {search ? 'No items match your search.' : 'No items found.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredItems.map((it) => (
                                        <TableRow key={it.id} hover>
                                            <TableCell fontWeight={500}>{it.name}</TableCell>
                                            <TableCell>{it.unit ?? '—'}</TableCell>
                                            <TableCell align="right">{it.default_price ? peso(it.default_price) : '—'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={it.is_active ? 'Active' : 'Inactive'}
                                                    size="small"
                                                    color={it.is_active ? 'success' : 'default'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            {canEdit && (
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                        <IconButton size="small" onClick={() => { setEditItem(it); setFormOpen(true); }}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(it.id)}>
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

            <ItemForm
                key={editItem?.id ?? 'new'}
                open={formOpen}
                onClose={() => setFormOpen(false)}
                item={editItem}
            />
        </AppLayout>
    );
}
