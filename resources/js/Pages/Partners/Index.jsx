import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControlLabel, IconButton,
    Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Typography,
} from '@mui/material';
import { Add, Edit } from '@mui/icons-material';

function PartnerForm({ open, onClose, partner }) {
    const editing = Boolean(partner);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: partner?.name ?? '',
        share_percentage: partner?.share_percentage ?? '',
        is_active: partner?.is_active ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            put(`/partners/${partner.id}`, opts);
        } else {
            post('/partners', opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Partner' : 'Add Partner'}</DialogTitle>
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
                        <TextField
                            label="Share Percentage"
                            type="number"
                            value={data.share_percentage}
                            onChange={(e) => setData('share_percentage', e.target.value)}
                            error={!!errors.share_percentage}
                            helperText={errors.share_percentage}
                            fullWidth
                            required
                            inputProps={{ step: 'any', min: 0, max: 100 }}
                            InputProps={{ endAdornment: '%' }}
                        />
                        <FormControlLabel
                            control={<Switch checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />}
                            label="Active (included in the P&L profit split)"
                        />
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button type="button" onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>
                        {editing ? 'Save Changes' : 'Add Partner'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function PartnersIndex({ partners, activeTotal }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage partners');
    const [formOpen, setFormOpen] = useState(false);
    const [editPartner, setEditPartner] = useState(null);

    const total = Number(activeTotal);

    return (
        <AppLayout title="Partners">
            <Head title="Partners" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={600}>Partners</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Each active partner's share percentage is applied to Net Profit on the P&L statement.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                        label={`Active share total: ${total.toFixed(2)}%`}
                        color={total === 100 ? 'success' : 'warning'}
                        variant="outlined"
                    />
                    {canEdit && (
                        <Button variant="contained" startIcon={<Add />} onClick={() => { setEditPartner(null); setFormOpen(true); }}>
                            Add Partner
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
                                    <TableCell align="right">Share %</TableCell>
                                    <TableCell>Status</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {partners.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No partners yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    partners.map((p) => (
                                        <TableRow key={p.id} hover sx={{ opacity: p.is_active ? 1 : 0.5 }}>
                                            <TableCell fontWeight={500}>{p.name}</TableCell>
                                            <TableCell align="right">{Number(p.share_percentage).toFixed(2)}%</TableCell>
                                            <TableCell>
                                                <Chip label={p.is_active ? 'Active' : 'Inactive'} size="small" color={p.is_active ? 'success' : 'default'} variant="outlined" />
                                            </TableCell>
                                            {canEdit && (
                                                <TableCell align="center">
                                                    <IconButton size="small" onClick={() => { setEditPartner(p); setFormOpen(true); }}>
                                                        <Edit fontSize="small" />
                                                    </IconButton>
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

            <PartnerForm
                key={editPartner?.id ?? 'new'}
                open={formOpen}
                onClose={() => setFormOpen(false)}
                partner={editPartner}
            />
        </AppLayout>
    );
}
