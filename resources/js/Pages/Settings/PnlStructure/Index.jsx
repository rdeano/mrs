import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, FormControlLabel,
    IconButton, InputLabel, MenuItem, Radio, RadioGroup, Select, Stack,
    Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Tooltip, Typography,
} from '@mui/material';
import {
    Add, ArrowDownward, ArrowUpward, AutoAwesome, Edit, Lock,
} from '@mui/icons-material';

const ROLE_LABEL = {
    revenue:        'Revenue',
    cos:            'Cost of Sales',
    gross_profit:   'Calculated — Gross Profit',
    sga:            'SG&A',
    operating_profit: 'Calculated — Operating Profit',
    other_income:   'Other Income',
    other_expense:  'Other Expenses',
    net_profit:     'Calculated — Net Profit',
};

function CategoryDialog({ open, onClose, category }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        name: category?.name ?? '',
        is_active: category?.is_active ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        put(`/settings/pnl-categories/${category.id}`, {
            onSuccess: () => { reset(); onClose(); },
        });
    };

    if (!category) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>Edit Category</DialogTitle>
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
                        <FormControlLabel
                            control={<Switch checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />}
                            label="Active (shown on the P&L statement)"
                        />
                        <Typography variant="caption" color="text.secondary">
                            Formula role: {ROLE_LABEL[category.type]} — this cannot be changed here.
                        </Typography>
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button type="button" onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>Save Changes</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

function LineItemDialog({ open, onClose, item, category, editableCategories, expenseCategories }) {
    const editing = Boolean(item);
    const locked = editing && item.is_locked;

    const linkedExpenseCategory = editing
        ? expenseCategories.find((ec) => ec.pnl_line_item_id === item.id)
        : null;

    const { data, setData, post, put, processing, errors, reset } = useForm({
        pnl_category_id: item?.pnl_category_id ?? category?.id ?? '',
        name: item?.name ?? '',
        is_active: item?.is_active ?? true,
        source: linkedExpenseCategory ? 'existing' : 'manual',
        expense_category_id: linkedExpenseCategory?.id ?? '',
        new_expense_category_name: '',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            put(`/settings/pnl-line-items/${item.id}`, opts);
        } else {
            post('/settings/pnl-line-items', opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Line Item' : 'Add Line Item'}</DialogTitle>
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

                        {locked ? (
                            <Typography variant="body2" color="text.secondary">
                                This line item is locked to <strong>{item.source_label}</strong> — its category and
                                source can't be changed here, since {item.source_label} always rolls up into this
                                exact line item.
                            </Typography>
                        ) : (
                            <>
                                <FormControl fullWidth required error={!!errors.pnl_category_id}>
                                    <InputLabel>Category</InputLabel>
                                    <Select
                                        label="Category"
                                        value={data.pnl_category_id}
                                        onChange={(e) => setData('pnl_category_id', e.target.value)}
                                    >
                                        {editableCategories.map((c) => (
                                            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Box>
                                    <Typography variant="subtitle2" mb={1}>Where does this number come from?</Typography>
                                    <RadioGroup value={data.source} onChange={(e) => setData('source', e.target.value)}>
                                        <FormControlLabel value="manual" control={<Radio />} label="Manual entry on the P&L" />
                                        <FormControlLabel value="existing" control={<Radio />} label="An existing Expense Category" />
                                        <FormControlLabel value="new" control={<Radio />} label="A new Expense Category" />
                                    </RadioGroup>

                                    {data.source === 'existing' && (
                                        <FormControl fullWidth sx={{ mt: 1 }} error={!!errors.expense_category_id}>
                                            <InputLabel>Expense Category</InputLabel>
                                            <Select
                                                label="Expense Category"
                                                value={data.expense_category_id}
                                                onChange={(e) => setData('expense_category_id', e.target.value)}
                                            >
                                                {expenseCategories.map((ec) => (
                                                    <MenuItem key={ec.id} value={ec.id}>
                                                        {ec.name}
                                                        {ec.pnl_line_item?.name && ec.pnl_line_item.id !== item?.id
                                                            ? ` (currently feeds ${ec.pnl_line_item.name})`
                                                            : ''}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}

                                    {data.source === 'new' && (
                                        <TextField
                                            label="New Expense Category name"
                                            value={data.new_expense_category_name}
                                            onChange={(e) => setData('new_expense_category_name', e.target.value)}
                                            error={!!errors.new_expense_category_name}
                                            helperText={errors.new_expense_category_name}
                                            fullWidth
                                            sx={{ mt: 1 }}
                                        />
                                    )}
                                </Box>
                            </>
                        )}

                        {editing && (
                            <FormControlLabel
                                control={<Switch checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} />}
                                label="Active (shown on the P&L statement)"
                            />
                        )}
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button type="button" onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>
                        {editing ? 'Save Changes' : 'Add Line Item'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function PnlStructureIndex({ categories, expenseCategories, editableCategoryIds }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage settings');
    const [categoryDialog, setCategoryDialog] = useState(null);
    const [lineItemDialog, setLineItemDialog] = useState(null); // { item, category } | null

    const editableCategories = categories.filter((c) => editableCategoryIds.includes(c.id));

    const moveCategory = (id, direction) => router.post(`/settings/pnl-categories/${id}/move`, { direction }, { preserveScroll: true });
    const moveLineItem = (id, direction) => router.post(`/settings/pnl-line-items/${id}/move`, { direction }, { preserveScroll: true });

    return (
        <AppLayout title="P&L Structure">
            <Head title="P&L Structure" />

            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={600}>P&L Structure</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5} maxWidth={640}>
                        Manage the categories and line items that make up the P&L statement. Categories keep their
                        fixed formula role; line items can be added, renamed, reordered, retired, and pointed at an
                        Expense Category so they roll up automatically instead of being typed in manually.
                    </Typography>
                </Box>
            </Stack>

            <Stack spacing={2.5}>
                {categories.map((cat, catIdx) => (
                    <Card key={cat.id} elevation={2} sx={{ opacity: cat.is_active ? 1 : 0.55 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" px={2} py={1.5}>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                <Typography variant="subtitle1" fontWeight={700}>{cat.name}</Typography>
                                <Chip
                                    label={ROLE_LABEL[cat.type]}
                                    size="small"
                                    color={cat.is_calculated ? 'primary' : 'default'}
                                    variant={cat.is_calculated ? 'filled' : 'outlined'}
                                />
                                {!cat.is_active && <Chip label="Inactive" size="small" color="default" />}
                            </Stack>
                            {canEdit && (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    {!cat.is_calculated && (
                                        <>
                                            <IconButton size="small" disabled={catIdx === 0} onClick={() => moveCategory(cat.id, 'up')}>
                                                <ArrowUpward fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" disabled={catIdx === categories.length - 1} onClick={() => moveCategory(cat.id, 'down')}>
                                                <ArrowDownward fontSize="small" />
                                            </IconButton>
                                        </>
                                    )}
                                    <IconButton size="small" onClick={() => setCategoryDialog(cat)}>
                                        <Edit fontSize="small" />
                                    </IconButton>
                                </Stack>
                            )}
                        </Stack>
                        <Divider />
                        <CardContent sx={{ p: '0 !important' }}>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Line Item</TableCell>
                                            <TableCell>Source</TableCell>
                                            {canEdit && <TableCell align="center" sx={{ width: 120 }} />}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {cat.line_items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                    No line items.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            cat.line_items.map((item, itemIdx) => (
                                                <TableRow key={item.id} hover sx={{ opacity: item.is_active ? 1 : 0.5 }}>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell>
                                                        {item.source_label ? (
                                                            <Tooltip title={item.is_locked ? `Always sourced from ${item.source_label}` : `Auto-calculated from ${item.source_label}`} arrow>
                                                                <Chip
                                                                    icon={item.is_locked ? <Lock sx={{ fontSize: '13px !important' }} /> : <AutoAwesome sx={{ fontSize: '13px !important' }} />}
                                                                    label={item.source_label}
                                                                    size="small"
                                                                    color="secondary"
                                                                    variant="outlined"
                                                                />
                                                            </Tooltip>
                                                        ) : (
                                                            <Chip label="Manual" size="small" variant="outlined" />
                                                        )}
                                                        {!item.is_active && <Chip label="Inactive" size="small" sx={{ ml: 1 }} />}
                                                    </TableCell>
                                                    {canEdit && (
                                                        <TableCell align="center">
                                                            <Stack direction="row" spacing={0.25} justifyContent="center">
                                                                <IconButton size="small" disabled={itemIdx === 0} onClick={() => moveLineItem(item.id, 'up')}>
                                                                    <ArrowUpward fontSize="small" />
                                                                </IconButton>
                                                                <IconButton size="small" disabled={itemIdx === cat.line_items.length - 1} onClick={() => moveLineItem(item.id, 'down')}>
                                                                    <ArrowDownward fontSize="small" />
                                                                </IconButton>
                                                                <IconButton size="small" onClick={() => setLineItemDialog({ item, category: cat })}>
                                                                    <Edit fontSize="small" />
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
                            {canEdit && !cat.is_calculated && (
                                <Box px={2} py={1.5}>
                                    <Button
                                        size="small"
                                        startIcon={<Add />}
                                        onClick={() => setLineItemDialog({ item: null, category: cat })}
                                    >
                                        Add Line Item
                                    </Button>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </Stack>

            <CategoryDialog
                key={categoryDialog?.id ?? 'none'}
                open={!!categoryDialog}
                onClose={() => setCategoryDialog(null)}
                category={categoryDialog}
            />

            <LineItemDialog
                key={`${lineItemDialog?.item?.id ?? 'new'}-${lineItemDialog?.category?.id ?? 'none'}`}
                open={!!lineItemDialog}
                onClose={() => setLineItemDialog(null)}
                item={lineItemDialog?.item ?? null}
                category={lineItemDialog?.category ?? null}
                editableCategories={editableCategories}
                expenseCategories={expenseCategories}
            />
        </AppLayout>
    );
}
