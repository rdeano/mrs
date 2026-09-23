import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Card, CardContent, Typography, Stack, Select, MenuItem,
    FormControl, InputLabel, Chip, Button, Divider, IconButton, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Add, Delete, Lock, LockOpen, Edit, Check, Close } from '@mui/icons-material';
import PnlGrid from '@/Components/Pnl/PnlGrid';
import QuickAddDialog from '@/Components/Pnl/QuickAddDialog';
import { peso } from '@/utils/format';

function ProfitDistribution({ distribution, canEdit }) {
    const [editing, setEditing] = useState(false);
    const [percent, setPercent] = useState(distribution.bir_savings_percent);

    const save = () => {
        router.put('/pnl/bir-savings-percent', { bir_savings_percent: percent }, {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    };

    const row = (label, value, opts = {}) => (
        <Stack direction="row" justifyContent="space-between" alignItems="center" py={0.75}>
            <Typography variant="body2" color={opts.dim ? 'text.secondary' : 'text.primary'} fontWeight={opts.bold ? 700 : 400}>
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={opts.bold ? 700 : 500} color={opts.color}>
                {value}
            </Typography>
        </Stack>
    );

    return (
        <Card elevation={2} sx={{ mt: 3, maxWidth: 420 }}>
            <CardContent>
                <Typography variant="subtitle1" fontWeight={700} mb={1}>Profit Distribution</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Net Profit below is already after BIR &amp; Savings — see that row in the statement above for the breakdown.
                </Typography>
                <Divider sx={{ mb: 1 }} />

                {row('Net Profit', peso(distribution.net_profit), { bold: true })}

                <Stack direction="row" justifyContent="space-between" alignItems="center" py={0.75}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                            BIR &amp; Savings rate
                        </Typography>
                        {editing ? (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <TextField
                                    size="small"
                                    type="number"
                                    value={percent}
                                    onChange={(e) => setPercent(e.target.value)}
                                    sx={{ width: 72 }}
                                    inputProps={{ step: 'any', min: 0, max: 100 }}
                                    autoFocus
                                />
                                <Typography variant="body2" color="text.secondary">%</Typography>
                                <IconButton size="small" color="primary" onClick={save}>
                                    <Check fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={() => { setPercent(distribution.bir_savings_percent); setEditing(false); }}>
                                    <Close fontSize="small" />
                                </IconButton>
                            </Stack>
                        ) : (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Typography variant="body2" color="text.secondary">
                                    ({Number(distribution.bir_savings_percent)}%)
                                </Typography>
                                {distribution.is_locked ? (
                                    <Stack direction="row" alignItems="center" spacing={0.25} title="Locked in when this period was closed — changing the rate now won't affect it">
                                        <Lock sx={{ fontSize: 13, color: 'text.disabled' }} />
                                        <Typography variant="caption" color="text.disabled">locked at close</Typography>
                                    </Stack>
                                ) : canEdit && (
                                    <IconButton size="small" onClick={() => setEditing(true)}>
                                        <Edit sx={{ fontSize: 14 }} />
                                    </IconButton>
                                )}
                            </Stack>
                        )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        ({peso(distribution.bir_savings_amount)} deducted)
                    </Typography>
                </Stack>

                <Divider sx={{ my: 1 }} />
                {row('Divide by 3', peso(distribution.per_share), { bold: true, color: 'primary.main' })}
            </CardContent>
        </Card>
    );
}

function EditPeriodDialog({ open, onClose, period }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        name:       period?.name ?? '',
        start_date: period?.start_date ?? '',
        end_date:   period?.end_date ?? '',
        notes:      period?.notes ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(`/pnl/periods/${period.id}`, { onSuccess: () => { reset(); onClose(); } });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>Edit Period</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.5} pt={1}>
                        <TextField
                            label="Period Name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            error={!!errors.name}
                            helperText={errors.name}
                            fullWidth
                            autoFocus
                            required
                        />
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Start Date"
                                type="date"
                                value={data.start_date}
                                onChange={(e) => setData('start_date', e.target.value)}
                                error={!!errors.start_date}
                                helperText={errors.start_date}
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="End Date"
                                type="date"
                                value={data.end_date}
                                onChange={(e) => setData('end_date', e.target.value)}
                                error={!!errors.end_date}
                                helperText={errors.end_date}
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
                        {processing ? 'Saving…' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

const SOURCE_PERMISSION = {
    expense:  'manage expenses',
    purchase: 'manage purchases',
    invoice:  'manage invoices',
    salary:   'manage salaries',
    wastage:  'manage expenses',
    reseko:   'manage expenses',
};

export default function PnlIndex({ periods, currentPeriod, categories, dates, expenseCategories, suppliers, customers, employees, itemOptions, purchaseLines, profitDistribution }) {
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');
    const [quickAdd, setQuickAdd] = useState(null);
    const [editPeriodOpen, setEditPeriodOpen] = useState(false);
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage pnl') && !currentPeriod?.is_closed;

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/pnl', { period_id: id }, { preserveState: false });
    };

    const handleDeletePeriod = () => {
        if (!confirm(`Delete period "${currentPeriod.name}"? This also deletes its expenses, purchases, invoices, salaries, and wastages — everything is soft-deleted so it can be recovered if needed, but none of it will appear anywhere in the app once deleted.`)) return;
        router.delete(`/pnl/periods/${currentPeriod.id}`);
    };

    const handleAutoCellClick = (row, date) => {
        if (currentPeriod?.is_closed) return;
        const permission = SOURCE_PERMISSION[row.sourceType];
        if (!permission || !auth.permissions.includes(permission)) return;

        setQuickAdd({
            lineItemId:   row.lineItemId,
            lineItemName: row.name,
            sourceType:   row.sourceType,
            sourceLabel:  row.sourceLabel,
            date,
            periodId:     currentPeriod.id,
        });
    };

    return (
        <AppLayout title="P&L Statement">
            <Head title="P&L Statement" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h5" fontWeight={600}>Profit & Loss Statement</Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Period</InputLabel>
                        <Select value={selectedPeriodId} label="Period" onChange={(e) => changePeriod(e.target.value)}>
                            {periods.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.name} {p.is_closed && '🔒'}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {currentPeriod && auth.permissions.includes('manage pnl') && (
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Edit />}
                            onClick={() => setEditPeriodOpen(true)}
                        >
                            Edit
                        </Button>
                    )}
                    {currentPeriod && (
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={currentPeriod.is_closed ? <LockOpen /> : <Lock />}
                            onClick={() => router.post(`/pnl/periods/${currentPeriod.id}/toggle-close`)}
                        >
                            {currentPeriod.is_closed ? 'Reopen' : 'Close Period'}
                        </Button>
                    )}
                    {currentPeriod && auth.permissions.includes('manage pnl') && (
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<Delete />}
                            onClick={handleDeletePeriod}
                        >
                            Delete Period
                        </Button>
                    )}
                    <Button variant="contained" size="small" startIcon={<Add />} onClick={() => router.get('/pnl/periods/create')}>
                        New Period
                    </Button>
                </Stack>
            </Stack>

            {!currentPeriod ? (
                <Card>
                    <CardContent>
                        <Typography color="text.secondary">Select or create a period to start.</Typography>
                    </CardContent>
                </Card>
            ) : (
                <Card elevation={2}>
                    <CardContent sx={{ p: 0 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" px={2} py={1.5}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={700}>MRS Meat Trading</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Income Statement — {currentPeriod.name}
                                </Typography>
                            </Box>
                            {currentPeriod.is_closed && <Chip label="Closed" size="small" color="default" icon={<Lock fontSize="small" />} />}
                        </Stack>
                        <Divider />
                        <PnlGrid
                            categories={categories}
                            dates={dates}
                            periodId={currentPeriod.id}
                            canEdit={canEdit}
                            onAutoCellClick={handleAutoCellClick}
                        />
                    </CardContent>
                </Card>
            )}

            {currentPeriod && profitDistribution && (
                <ProfitDistribution distribution={profitDistribution} canEdit={auth.permissions.includes('manage pnl')} />
            )}

            <QuickAddDialog
                key={quickAdd ? `${quickAdd.lineItemId}-${quickAdd.date}` : 'none'}
                open={!!quickAdd}
                onClose={() => setQuickAdd(null)}
                context={quickAdd}
                expenseCategories={expenseCategories}
                suppliers={suppliers}
                customers={customers}
                employees={employees}
                itemOptions={itemOptions}
                purchaseLines={purchaseLines}
            />

            {currentPeriod && (
                <EditPeriodDialog
                    key={currentPeriod.id}
                    open={editPeriodOpen}
                    onClose={() => setEditPeriodOpen(false)}
                    period={currentPeriod}
                />
            )}
        </AppLayout>
    );
}
