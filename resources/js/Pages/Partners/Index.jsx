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

const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time

// YYYY-MM-DD -> MM/DD/YYYY
const fmtDate = (d) => {
    const [y, m, day] = String(d).slice(0, 10).split('-');
    return `${m}/${day}/${y}`;
};

const fmtPct = (v) => `${Number(v).toFixed(2)}%`;

function PartnerForm({ open, onClose, partner, firstPeriodStart }) {
    const editing = Boolean(partner);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: partner?.name ?? '',
        share_percentage: partner?.share_percentage ?? '',
        // New partner: from the first period by default. Rate change: from today.
        effective_from: editing ? today() : (firstPeriodStart ?? today()),
        rate_notes: '',
        is_active: partner?.is_active ?? true,
    });
    const rateChanged = !editing || Number(data.share_percentage) !== Number(partner.share_percentage);

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
                        {rateChanged && (
                            <>
                                <TextField
                                    label="Share % effective from"
                                    type="date"
                                    value={data.effective_from}
                                    onChange={(e) => setData('effective_from', e.target.value)}
                                    error={!!errors.effective_from}
                                    helperText={errors.effective_from ?? (editing
                                        ? 'New rate applies to profit from this date onward. Earlier dates keep the old rate.'
                                        : 'Rate applies to profit from this date onward.')}
                                    fullWidth
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                                {editing && (
                                    <TextField
                                        label="Reason (optional)"
                                        value={data.rate_notes}
                                        onChange={(e) => setData('rate_notes', e.target.value)}
                                        error={!!errors.rate_notes}
                                        helperText={errors.rate_notes ?? 'e.g. Resigned 09/15/2026'}
                                        fullWidth
                                    />
                                )}
                            </>
                        )}
                        <FormControlLabel
                            control={<Switch checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />}
                            label="Active (inactive partners stay on past P&L dates where they had a share)"
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

function RateHistory({ partner, canEdit }) {
    const rates = partner.rates ?? [];

    const remove = (rate) => {
        if (!window.confirm(`Remove the ${fmtPct(rate.share_percentage)} rate from ${fmtDate(rate.effective_from)}? The previous rate will apply again from that date.`)) return;
        router.delete(`/partners/${partner.id}/rates/${rate.id}`, { preserveScroll: true });
    };

    return (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {rates.map((r) => (
                <Chip
                    key={r.id}
                    size="small"
                    variant="outlined"
                    label={`${fmtPct(r.share_percentage)} from ${fmtDate(r.effective_from)}`}
                    title={r.notes ?? undefined}
                    onDelete={canEdit && rates.length > 1 ? () => remove(r) : undefined}
                />
            ))}
        </Stack>
    );
}

export default function PartnersIndex({ partners, activeTotal, firstPeriodStart }) {
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
                        Each partner's share % is applied to Net Profit for each date, using the rate in effect on that date.
                        Changing a rate only affects dates from its effective date onward.
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Chip
                        label={`Share total today: ${total.toFixed(2)}%`}
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
                                    <TableCell align="right">Current Share %</TableCell>
                                    <TableCell>Share History</TableCell>
                                    <TableCell>Status</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {partners.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No partners yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    partners.map((p) => (
                                        <TableRow key={p.id} hover sx={{ opacity: p.is_active ? 1 : 0.5 }}>
                                            <TableCell fontWeight={500}>{p.name}</TableCell>
                                            <TableCell align="right">{Number(p.share_percentage).toFixed(2)}%</TableCell>
                                            <TableCell><RateHistory partner={p} canEdit={canEdit} /></TableCell>
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
                firstPeriodStart={firstPeriodStart}
            />
        </AppLayout>
    );
}
