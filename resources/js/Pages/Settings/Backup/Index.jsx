import { useRef, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent,
    DialogContentText, DialogTitle, IconButton, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Backup as BackupIcon, Delete, Download, Restore, UploadFile } from '@mui/icons-material';

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

const CONFIRM_WORD = 'RESTORE';

export default function BackupIndex({ backups }) {
    const { auth } = usePage().props;
    const canManage = auth.permissions.includes('manage settings');
    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [restoreTarget, setRestoreTarget] = useState(null); // { type: 'file', name } | { type: 'upload', file }
    const fileInputRef = useRef(null);

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

    const closeRestoreDialog = () => {
        setRestoreTarget(null);
        setConfirmText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUploadChosen = (e) => {
        const file = e.target.files?.[0];
        if (file) setRestoreTarget({ type: 'upload', file });
    };

    const runRestore = () => {
        if (!restoreTarget || confirmText !== CONFIRM_WORD) return;
        setRestoring(true);

        if (restoreTarget.type === 'file') {
            router.post(`/settings/backup/${restoreTarget.name}/restore`, {}, {
                preserveScroll: true,
                onFinish: () => {
                    setRestoring(false);
                    closeRestoreDialog();
                },
            });
        } else {
            router.post('/settings/backup/restore-upload', { backup_file: restoreTarget.file }, {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    setRestoring(false);
                    closeRestoreDialog();
                },
            });
        }
    };

    return (
        <AppLayout title="Backup">
            <Head title="Backup" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Backup</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Generate a full database backup, download it, or restore the database from a backup.
                    </Typography>
                </Box>
                {canManage && (
                    <Stack direction="row" spacing={1.5}>
                        <Button
                            variant="outlined"
                            startIcon={<UploadFile />}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Upload &amp; Restore
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".zip,.sql"
                            hidden
                            onChange={handleUploadChosen}
                        />
                        <Button
                            variant="contained"
                            startIcon={<BackupIcon />}
                            onClick={handleCreate}
                            disabled={creating}
                        >
                            {creating ? 'Generating…' : 'Generate Backup'}
                        </Button>
                    </Stack>
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
                                    <TableCell align="center" sx={{ width: 140 }} />
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
                                                        <>
                                                            <Tooltip title="Restore this backup">
                                                                <IconButton
                                                                    size="small"
                                                                    color="warning"
                                                                    onClick={() => setRestoreTarget({ type: 'file', name: b.name })}
                                                                >
                                                                    <Restore fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Delete">
                                                                <IconButton size="small" color="error" onClick={() => handleDelete(b.name)}>
                                                                    <Delete fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
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

            <Dialog open={!!restoreTarget} onClose={restoring ? undefined : closeRestoreDialog} maxWidth="xs" fullWidth>
                <DialogTitle>Restore database</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        This replaces every table in the current database with the contents of{' '}
                        <strong>
                            {restoreTarget?.type === 'file' ? restoreTarget.name : restoreTarget?.file?.name}
                        </strong>
                        . All data added since that backup will be lost. This cannot be undone.
                    </Alert>
                    <DialogContentText sx={{ mb: 1.5 }}>
                        Type <strong>{CONFIRM_WORD}</strong> to confirm.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={CONFIRM_WORD}
                        disabled={restoring}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeRestoreDialog} disabled={restoring}>Cancel</Button>
                    <Button
                        color="warning"
                        variant="contained"
                        onClick={runRestore}
                        disabled={confirmText !== CONFIRM_WORD || restoring}
                    >
                        {restoring ? 'Restoring…' : 'Restore'}
                    </Button>
                </DialogActions>
            </Dialog>
        </AppLayout>
    );
}
