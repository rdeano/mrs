import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import {
    Box, Card, CardContent, Chip, FormControl, InputLabel, MenuItem,
    Pagination, Select, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';

const EVENT_COLOR = { created: 'success', updated: 'info', deleted: 'error' };

function ChangeSummary({ properties }) {
    const attrs = properties?.attributes;
    if (!attrs || Object.keys(attrs).length === 0) return '—';

    const summary = Object.entries(attrs)
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

    return (
        <Tooltip
            arrow
            title={<pre style={{ margin: 0, fontSize: 11 }}>{JSON.stringify(attrs, null, 2)}</pre>}
        >
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'default' }}>
                {summary}{Object.keys(attrs).length > 3 ? ', …' : ''}
            </Typography>
        </Tooltip>
    );
}

export default function ActivityLogIndex({ activities, users, subjectTypes, filters }) {
    const updateFilter = (key, value) => {
        router.get('/activity-log', { ...filters, [key]: value || undefined }, { preserveState: true, preserveScroll: true });
    };

    const changePage = (page) => {
        router.get('/activity-log', { ...filters, page }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AppLayout title="Activity Log">
            <Head title="Activity Log" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Activity Log</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Full audit trail of who created, updated, or deleted what, across the whole app.
                    </Typography>
                </Box>
            </Stack>

            <Card sx={{ mb: 2.5 }}>
                <CardContent>
                    <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>User</InputLabel>
                            <Select
                                label="User"
                                value={filters.causer_id ?? ''}
                                onChange={(e) => updateFilter('causer_id', e.target.value)}
                            >
                                <MenuItem value="">All Users</MenuItem>
                                {users.map((u) => (
                                    <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Model</InputLabel>
                            <Select
                                label="Model"
                                value={filters.subject_type ?? ''}
                                onChange={(e) => updateFilter('subject_type', e.target.value)}
                            >
                                <MenuItem value="">All Models</MenuItem>
                                {subjectTypes.map((t) => (
                                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            size="small"
                            label="From"
                            type="date"
                            value={filters.from_date ?? ''}
                            onChange={(e) => updateFilter('from_date', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            size="small"
                            label="To"
                            type="date"
                            value={filters.to_date ?? ''}
                            onChange={(e) => updateFilter('to_date', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Stack>
                </CardContent>
            </Card>

            <Card>
                <CardContent sx={{ p: '0 !important' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date/Time</TableCell>
                                    <TableCell>User</TableCell>
                                    <TableCell>Action</TableCell>
                                    <TableCell>Model</TableCell>
                                    <TableCell>Changes</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {activities.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No activity found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    activities.data.map((a) => (
                                        <TableRow key={a.id} hover>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{a.created_at}</TableCell>
                                            <TableCell>{a.causer_name ?? 'System'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={a.event ?? a.description}
                                                    size="small"
                                                    color={EVENT_COLOR[a.event] ?? 'default'}
                                                    sx={{ textTransform: 'capitalize' }}
                                                />
                                            </TableCell>
                                            <TableCell>{a.subject_type}{a.subject_id ? ` #${a.subject_id}` : ''}</TableCell>
                                            <TableCell><ChangeSummary properties={a.properties} /></TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {activities.last_page > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                            <Pagination
                                count={activities.last_page}
                                page={activities.current_page}
                                onChange={(e, page) => changePage(page)}
                                size="small"
                            />
                        </Box>
                    )}
                </CardContent>
            </Card>
        </AppLayout>
    );
}
