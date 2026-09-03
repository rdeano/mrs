import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import {
    Autocomplete, Box, Button, Card, CardContent,
    Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Typography,
} from '@mui/material';
import { Print } from '@mui/icons-material';
import { peso } from '@/utils/format';

const BRAND_RED = '#7A1F2B';

function usDate(d) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${Number(m)}/${Number(day)}/${y}`;
}

function SoaDocument({ statement, asOf, statementNo }) {
    const { customer, invoices, previous_balance, credits, new_charges, total_balance } = statement;

    // Flatten invoices -> one row per item, so Date/Invoice#/Balance can span
    // the invoice's item rows via rowSpan, matching the paper-statement look.
    const rows = invoices.flatMap((inv) => {
        const items = inv.items.length ? inv.items : [{ item_name: '', amount: inv.total_amount }];
        return items.map((item, idx) => ({
            key: `${inv.id}-${idx}`,
            invoice: inv,
            item,
            isFirst: idx === 0,
            span: items.length,
        }));
    });

    return (
        <Box
            id="soa-document"
            sx={{
                maxWidth: 850, mx: 'auto', bgcolor: '#fff', color: '#1a1a1a',
                p: { xs: 3, sm: 5 }, borderRadius: 2, boxShadow: 1,
                '@media print': { boxShadow: 'none', p: 0, maxWidth: 'none' },
            }}
        >
            {/* Letterhead */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                        component="img"
                        src="/images/logo.jpg"
                        alt="MRS Meat Trading"
                        sx={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_RED, letterSpacing: -0.3 }}>
                        MRS MEAT TRADING
                    </Typography>
                </Stack>
                <Typography variant="h4" fontWeight={800} letterSpacing={1} sx={{ color: BRAND_RED }}>
                    Statement
                </Typography>
            </Stack>

            {/* Meta block */}
            <Stack alignItems="flex-end" mt={1} mb={3}>
                <Box sx={{ minWidth: 240 }}>
                    {[
                        ['Date:', usDate(asOf)],
                        ['Statement:', statementNo || '—'],
                        ['Customer Id:', `#${customer.id}`],
                        ['Page:', '1 of 1'],
                    ].map(([label, value]) => (
                        <Stack key={label} direction="row" justifyContent="space-between" spacing={2}>
                            <Typography variant="body2" color="text.secondary">{label}</Typography>
                            <Typography variant="body2" fontWeight={600}>{value}</Typography>
                        </Stack>
                    ))}
                </Box>
            </Stack>

            {/* Bill To / Account Summary */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} mb={3}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" fontWeight={700} letterSpacing={0.5} color="text.secondary">
                        BILL TO
                    </Typography>
                    <Stack spacing={0.5} mt={0.75}>
                        <Stack direction="row" spacing={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>Name:</Typography>
                            <Typography variant="body2" fontWeight={600}>{customer.name}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>Company Name:</Typography>
                            <Typography variant="body2" fontWeight={600}>{customer.name}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>Address:</Typography>
                            <Typography variant="body2" fontWeight={600}>{customer.address || ''}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                            <Typography variant="body2" color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>Contact Number:</Typography>
                            <Typography variant="body2" fontWeight={600}>{customer.phone || ''}</Typography>
                        </Stack>
                    </Stack>
                </Box>

                <Box sx={{ flex: 1, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                    <Typography variant="caption" fontWeight={700} letterSpacing={0.5} color="text.secondary">
                        ACCOUNT SUMMARY
                    </Typography>
                    <Stack spacing={0.5} mt={0.75}>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Previous Balance:</Typography>
                            <Typography variant="body2" fontWeight={600}>{peso(previous_balance)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Credits:</Typography>
                            <Typography variant="body2" fontWeight={600}>{peso(credits)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">New Charges:</Typography>
                            <Typography variant="body2" fontWeight={600}>{peso(new_charges)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" pt={0.5} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="body2" fontWeight={700}>Total Balance:</Typography>
                            <Typography variant="body2" fontWeight={800} sx={{ color: BRAND_RED }}>{peso(total_balance)}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">Payment Due Date:</Typography>
                            <Typography variant="body2" fontWeight={600}>&nbsp;</Typography>
                        </Stack>
                    </Stack>
                </Box>
            </Stack>

            {/* Itemized new charges */}
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}></TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Balance</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No new charges in this period.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map(({ key, invoice, item, isFirst, span }) => (
                                <TableRow key={key}>
                                    {isFirst && (
                                        <TableCell rowSpan={span} sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                            {usDate(invoice.invoice_date)}
                                        </TableCell>
                                    )}
                                    {isFirst && (
                                        <TableCell rowSpan={span} sx={{ verticalAlign: 'top' }}>
                                            {invoice.invoice_no}
                                        </TableCell>
                                    )}
                                    <TableCell>{item.item_name}</TableCell>
                                    <TableCell align="right">{peso(item.amount)}</TableCell>
                                    {isFirst && (
                                        <TableCell rowSpan={span} align="right" sx={{ fontWeight: 700, verticalAlign: 'top' }}>
                                            {peso(invoice.total_amount)}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Current balance */}
            <Stack direction="row" justifyContent="flex-end" mt={2} mb={4}>
                <Stack direction="row" spacing={3} alignItems="center" sx={{ minWidth: 280 }}>
                    <Typography variant="body1" fontWeight={700} sx={{ flex: 1, textAlign: 'right' }}>Current Balance</Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ color: BRAND_RED }}>{peso(new_charges)}</Typography>
                </Stack>
            </Stack>

            {/* Footer */}
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                    If you have any questions about this invoice please contact
                </Typography>
                <Typography variant="body2" fontWeight={700} mt={0.5}>Mrs meat trading</Typography>
                <Typography variant="body2" color="text.secondary">Stall 136 Meat Section, Brgy 5 A , Davao City</Typography>
                <Typography variant="body2" color="text.secondary">0967-147-1656</Typography>
                <Typography variant="body2" color="text.secondary">mrsmeattarding2026@gmail.com</Typography>
                <Typography variant="body2" fontWeight={700} mt={1}>Thank You For Your Business</Typography>
            </Box>

            <Stack direction="row" spacing={6} mt={6}>
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ borderTop: '1px solid #999', pt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">Received By:</Typography>
                    </Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ borderTop: '1px solid #999', pt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">Date:</Typography>
                    </Box>
                </Box>
            </Stack>
        </Box>
    );
}

export default function StatementOfAccountIndex({ customers, customerId, asOf, periodFrom, statement }) {
    const [selectedCustomer, setSelectedCustomer] = useState(customers.find((c) => c.id === customerId) ?? null);
    const [asOfDate, setAsOfDate] = useState(asOf);
    const [fromDate, setFromDate] = useState(periodFrom);
    const [statementNo, setStatementNo] = useState('');

    const load = (customer, from, to) => {
        router.get('/statement-of-account', {
            customer_id: customer?.id ?? '',
            period_from: from,
            as_of: to,
        }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AppLayout title="Statement of Account">
            <Head title="Statement of Account" />

            <Stack
                direction="row" spacing={2} alignItems="center" flexWrap="wrap" mb={3}
                sx={{ '@media print': { display: 'none' } }}
            >
                <Autocomplete
                    options={customers}
                    getOptionLabel={(c) => c.name}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    value={selectedCustomer}
                    onChange={(_, v) => { setSelectedCustomer(v); load(v, fromDate, asOfDate); }}
                    sx={{ minWidth: 240 }}
                    renderInput={(params) => <TextField {...params} label="Customer" />}
                />
                <TextField
                    label="Period From"
                    type="date"
                    value={fromDate}
                    onChange={(e) => { setFromDate(e.target.value); load(selectedCustomer, e.target.value, asOfDate); }}
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="As Of"
                    type="date"
                    value={asOfDate}
                    onChange={(e) => { setAsOfDate(e.target.value); load(selectedCustomer, fromDate, e.target.value); }}
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="Statement No."
                    value={statementNo}
                    onChange={(e) => setStatementNo(e.target.value)}
                    sx={{ width: 140 }}
                />
                {statement && (
                    <Button variant="contained" startIcon={<Print />} onClick={() => window.print()} sx={{ bgcolor: BRAND_RED, '&:hover': { bgcolor: '#5e1721' } }}>
                        Print / Save as PDF
                    </Button>
                )}
            </Stack>

            {!statement ? (
                <Card sx={{ '@media print': { display: 'none' } }}>
                    <CardContent sx={{ py: 8, textAlign: 'center' }}>
                        <Typography color="text.secondary">Select a customer above to generate their statement of account.</Typography>
                    </CardContent>
                </Card>
            ) : (
                <SoaDocument statement={statement} asOf={asOfDate} statementNo={statementNo} />
            )}
        </AppLayout>
    );
}
