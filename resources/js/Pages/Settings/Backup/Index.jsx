import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, IconButton, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { Backup as BackupIcon, Delete, Download } from '@mui/icons-material';

function fileSize(bytes) {
    if (!bytes) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) {
        n /= 1024;
        i += 1;
    }
    return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function BackupIndex({ backups }) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.includes('manage settings');
    const [creating, setCreating] = useState(false);

    const handleCreate = () => {
        setCreating(true);
        router.post('/settings/backup', {}, {
            preserveScroll: true,
            onFinish: () => setCreating(false),
        });
    };

    const handleDelete = (name) => {
        if (confirm(`Delete backup "${name}"?`)) {
            router.delete(`/settings/backup/${name}`, { preserveScroll: true });
        }
    };

    return (
        <AppLayout title="Backup">
            <Head title="Backup" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Backup</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Generate a full database backup and download it as a .zip archive.
                    </Typography>
                </Box>
                {canManage && (
                    <Button
                        variant="contained"
                        startIcon={<BackupIcon />}
                        onClick={handleCreate}
                        disabled={creating}
                    >
                        {creating ? 'Generating…' : 'Generate Backup'}
                    </Button>
                )}
            </Stack>

            <Card>
                <CardContent sx={{ p: '0 !important' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>File</TableCell>
                                    <TableCell>Size</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell align="center" sx={{ width: 100 }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {backups.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No backups yet. Click "Generate Backup" to create one.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    backups.map((b) => (
                                        <TableRow key={b.name} hover>
                                            <TableCell fontWeight={500} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                                {b.name}
                                            </TableCell>
                                            <TableCell>{fileSize(b.size)}</TableCell>
                                            <TableCell>{b.created_at}</TableCell>
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    <Tooltip title="Download">
                                                        <IconButton
                                                            size="small"
                                                            component="a"
                                                            href={`/settings/backup/${b.name}/download`}
                                                        >
                                                            <Download fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {canManage && (
                                                        <Tooltip title="Delete">
                                                            <IconButton size="small" color="error" onClick={() => handleDelete(b.name)}>
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </AppLayout>
    );
}
