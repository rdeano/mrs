import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Box, Card, CardContent, Typography, Stack, Select, MenuItem,
    FormControl, InputLabel, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, Button, Divider, TextField,
    CircularProgress, Tooltip,
} from '@mui/material';
import { Add, Lock, LockOpen, AutoAwesome, Functions } from '@mui/icons-material';

const peso = (v) =>
    '₱' + Number(v ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isNeg = (v) => Number(v ?? 0) < 0;

function EditableCell({ value, lineItemId, periodId, date, disabled }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value ?? '');
    const [saving, setSaving] = useState(false);

    const save = () => {
        if (Number(val) === Number(value)) { setEditing(false); return; }
        setSaving(true);
        router.post('/pnl/entries', { pnl_line_item_id: lineItemId, pnl_period_id: periodId, entry_date: date, amount: val },
            { preserveState: true, preserveScroll: true, onFinish: () => { setSaving(false); setEditing(false); } }
        );
    };

    if (disabled) {
        return (
            <TableCell align="right" sx={{ color: 'text.disabled' }}>
                {val ? peso(val) : '—'}
            </TableCell>
        );
    }

    return (
        <TableCell align="right" sx={{ p: 0.5, minWidth: 110 }}>
            {editing ? (
                <TextField
                    size="small"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    onBlur={save}
                    onKeyDown={(e) => e.key === 'Enter' && save()}
                    autoFocus
                    inputProps={{ style: { textAlign: 'right' } }}
                    sx={{ width: 100 }}
                    InputProps={{ endAdornment: saving ? <CircularProgress size={12} /> : null }}
                />
            ) : (
                <Box
                    onClick={() => setEditing(true)}
                    sx={{ cursor: 'pointer', px: 1, py: 0.5, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                >
                    {val ? peso(val) : <Typography variant="caption" color="text.disabled">—</Typography>}
                </Box>
            )}
        </TableCell>
    );
}

export default function PnlIndex({ periods, currentPeriod, categories, dates }) {
    const [selectedPeriodId, setSelectedPeriodId] = useState(currentPeriod?.id ?? '');
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage pnl') && !currentPeriod?.is_closed;

    const changePeriod = (id) => {
        setSelectedPeriodId(id);
        router.get('/pnl', { period_id: id }, { preserveState: false });
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
                        <TableContainer>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Account</TableCell>
                                        {dates.map((d) => (
                                            <TableCell key={d} align="right" sx={{ fontWeight: 700, minWidth: 110 }}>
                                                {new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                            </TableCell>
                                        ))}
                                        <TableCell align="right" sx={{ fontWeight: 700, minWidth: 120, bgcolor: 'grey.50' }}>Total</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {categories.map((cat) => (
                                        <>
                                            {/* Category header */}
                                            <TableRow key={`cat-${cat.id}`} sx={{ bgcolor: 'grey.100' }}>
                                                <TableCell colSpan={dates.length + 2} sx={{ fontWeight: 700, py: 0.5 }}>
                                                    {cat.name.toUpperCase()}
                                                </TableCell>
                                            </TableRow>

                                            {/* Line items */}
                                            {cat.line_items.map((item) => {
                                                const rowTotal = dates.reduce(
                                                    (s, d) => s + Number(item.entries[d] ?? 0), 0
                                                );
                                                const isSubtotal = item.is_subtotal;
                                                const isFormula  = item.is_formula;

                                                return (
                                                    <TableRow
                                                        key={`item-${item.id}`}
                                                        hover
                                                        sx={isSubtotal
                                                            ? { bgcolor: 'primary.50' }
                                                            : isFormula
                                                                ? { bgcolor: 'secondary.50' }
                                                                : {}
                                                        }
                                                    >
                                                        <TableCell
                                                            sx={{
                                                                pl: isSubtotal ? 2 : 3,
                                                                fontWeight: isSubtotal ? 700 : 400,
                                                                fontStyle: isSubtotal ? 'normal' : 'inherit',
                                                            }}
                                                        >
                                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                                <span>{item.name}</span>
                                                                {isSubtotal && (
                                                                    <Chip
                                                                        icon={<Functions sx={{ fontSize: '11px !important' }} />}
                                                                        label="computed"
                                                                        size="small"
                                                                        color="primary"
                                                                        variant="outlined"
                                                                        sx={{ height: 18, fontSize: '0.65rem', cursor: 'default' }}
                                                                    />
                                                                )}
                                                                {isFormula && !isSubtotal && (
                                                                    <Tooltip title="Auto-calculated from Wastages records" arrow>
                                                                        <Chip
                                                                            icon={<AutoAwesome sx={{ fontSize: '11px !important' }} />}
                                                                            label="auto"
                                                                            size="small"
                                                                            color="secondary"
                                                                            variant="outlined"
                                                                            sx={{ height: 18, fontSize: '0.65rem', cursor: 'pointer' }}
                                                                            onClick={() => router.get('/wastages')}
                                                                        />
                                                                    </Tooltip>
                                                                )}
                                                            </Stack>
                                                        </TableCell>

                                                        {dates.map((d) =>
                                                            canEdit && !isFormula && !isSubtotal ? (
                                                                <EditableCell
                                                                    key={d}
                                                                    value={item.entries[d] ?? ''}
                                                                    lineItemId={item.id}
                                                                    periodId={currentPeriod.id}
                                                                    date={d}
                                                                    disabled={false}
                                                                />
                                                            ) : (
                                                                <TableCell
                                                                    key={d}
                                                                    align="right"
                                                                    sx={{
                                                                        color: isSubtotal && isNeg(item.entries[d])
                                                                            ? 'error.main'
                                                                            : (isFormula ? 'secondary.dark' : 'inherit'),
                                                                        fontStyle: isFormula && !isSubtotal ? 'italic' : 'normal',
                                                                        fontWeight: isSubtotal ? 600 : 400,
                                                                    }}
                                                                >
                                                                    {item.entries[d] != null && item.entries[d] !== 0
                                                                        ? peso(item.entries[d])
                                                                        : '—'}
                                                                </TableCell>
                                                            )
                                                        )}

                                                        <TableCell
                                                            align="right"
                                                            sx={{
                                                                fontWeight: isSubtotal ? 700 : 600,
                                                                bgcolor: isSubtotal ? 'primary.50' : 'grey.50',
                                                                color: isSubtotal && isNeg(rowTotal) ? 'error.main' : 'inherit',
                                                            }}
                                                        >
                                                            {rowTotal !== 0 ? peso(rowTotal) : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}

                                            {/* Category total row */}
                                            {cat.total !== null && (
                                                <TableRow
                                                    key={`total-${cat.id}`}
                                                    sx={{
                                                        bgcolor: cat.is_calculated ? 'primary.main' : 'primary.50',
                                                    }}
                                                >
                                                    <TableCell
                                                        sx={{
                                                            fontWeight: 700,
                                                            pl: 2,
                                                            color: cat.is_calculated ? '#fff' : 'inherit',
                                                        }}
                                                    >
                                                        {cat.is_calculated ? cat.name : `Total ${cat.name}`}
                                                    </TableCell>
                                                    {dates.map((d) => (
                                                        <TableCell
                                                            key={d}
                                                            align="right"
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: cat.is_calculated
                                                                    ? (isNeg(cat.date_totals?.[d]) ? '#ffcdd2' : '#fff')
                                                                    : (isNeg(cat.date_totals?.[d]) ? 'error.main' : 'inherit'),
                                                            }}
                                                        >
                                                            {cat.date_totals?.[d] != null && cat.date_totals[d] !== 0
                                                                ? peso(cat.date_totals[d])
                                                                : '—'}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell
                                                        align="right"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: cat.is_calculated
                                                                ? (isNeg(cat.total) ? '#ffcdd2' : '#fff')
                                                                : (isNeg(cat.total) ? 'error.main' : 'inherit'),
                                                        }}
                                                    >
                                                        {peso(cat.total)}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}
        </AppLayout>
    );
}
