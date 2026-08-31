import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Box, Card, CardContent, Typography, Stack, Select, MenuItem,
    FormControl, InputLabel, Chip, Button, Divider,
} from '@mui/material';
import { Add, Delete, Lock, LockOpen } from '@mui/icons-material';
import PnlGrid from '@/Components/Pnl/PnlGrid';
import QuickAddDialog from '@/Components/Pnl/QuickAddDialog';

const SOURCE_PERMISSION = {
    expense:  'manage expenses',
    purchase: 'manage purchases',
    invoice:  'manage invoices',
    salary:   'manage salaries',
    wastage:  'manage expenses',
    reseko:   'manage expenses',
};

export default function PnlIndex({ periods, currentPeriod, categories, dates, expenseCategories, suppliers, customers, employees, itemOptions, purchaseLines }) {
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');
    const [quickAdd, setQuickAdd] = useState(null);
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage pnl') && !currentPeriod?.is_closed;

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/pnl', { period_id: id }, { preserveState: false });
    };

    const handleDeletePeriod = () => {
        if (!confirm(`Delete period "${currentPeriod.name}"? Its expenses, purchases, invoices, salaries, and wastages are kept — this only removes it from the P&L period list.`)) return;
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
        </AppLayout>
    );
}
