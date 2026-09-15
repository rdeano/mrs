import {
    Box, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { peso, longDate as fmt } from '@/utils/format';

const PRINT_BRAND_RED = '#7A1F2B';

// Company letterhead — rendered once at the top of the print sheet.
function PrintLetterhead() {
    return (
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ maxWidth: 850, mx: 'auto', mb: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center">
                <Box
                    component="img"
                    src="/images/logo.jpg"
                    alt="MRS Meat Trading"
                    sx={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <Typography variant="h5" fontWeight={800} sx={{ color: PRINT_BRAND_RED, letterSpacing: -0.3 }}>
                    MRS MEAT TRADING
                </Typography>
            </Stack>
            <Typography variant="h5" fontWeight={800} letterSpacing={1} sx={{ color: PRINT_BRAND_RED }}>
                Expenses
            </Typography>
        </Stack>
    );
}

// Rendered off-screen at all times; only becomes visible under print media,
// while the interactive page (table, dialogs, filters) hides itself via the
// matching '@media print': { display: 'none' } on that content instead.
//
// All selected expenses are listed in a single table with one grand total,
// mirroring the purchases print sheet (one table, one total, no per-row
// headers).
export default function ExpensesPrintSheet({ expenses: selected }) {
    if (selected.length === 0) return null;

    const grandTotal = selected.reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <Box sx={{ display: 'none', '@media print': { display: 'block' } }}>
            <PrintLetterhead />
            <Box sx={{ maxWidth: 850, mx: 'auto', bgcolor: '#fff', color: '#1a1a1a' }}>
                <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Paid By</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {selected.map((e) => (
                                <TableRow key={e.id} sx={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(e.expense_date)}</TableCell>
                                    <TableCell>{e.category?.name ?? '—'}</TableCell>
                                    <TableCell>{e.description ?? '—'}</TableCell>
                                    <TableCell>{e.reference_no ?? '—'}</TableCell>
                                    <TableCell>{e.paid_by ?? '—'}</TableCell>
                                    <TableCell align="right">{peso(e.amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Stack direction="row" justifyContent="flex-end" mt={2} mb={4}>
                    <Stack direction="row" spacing={3} alignItems="center" sx={{ minWidth: 280 }}>
                        <Typography variant="body1" fontWeight={700} sx={{ flex: 1, textAlign: 'right' }}>Grand Total</Typography>
                        <Typography variant="h6" fontWeight={800} sx={{ color: PRINT_BRAND_RED }}>{peso(grandTotal)}</Typography>
                    </Stack>
                </Stack>

                <Stack direction="row" spacing={6} mt={6}>
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ borderTop: '1px solid #999', pt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Prepared By:</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ borderTop: '1px solid #999', pt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Received By:</Typography>
                        </Box>
                    </Box>
                </Stack>
            </Box>
        </Box>
    );
}
