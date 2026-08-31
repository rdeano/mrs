import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControl, IconButton,
    InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Edit, VpnKey } from '@mui/icons-material';

const ROLE_COLOR = { admin: 'error', manager: 'primary', viewer: 'default' };

function UserForm({ open, onClose, roles, user }) {
    const editing = Boolean(user);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name:     user?.name  ?? '',
        email:    user?.email ?? '',
        password: '',
        password_confirmation: '',
        role:     user?.role  ?? roles[0] ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            put(`/settings/users/${user.id}`, opts);
        } else {
            post('/settings/users', opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit User' : 'Add User'}</DialogTitle>
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
                            label="Email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            error={!!errors.email}
                            helperText={errors.email}
                            fullWidth
                            required
                        />

                        {!editing && (
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    label="Password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    error={!!errors.password}
                                    helperText={errors.password || 'Min 8 characters'}
                                    fullWidth
                                    required
                                />
                                <TextField
                                    label="Confirm Password"
                                    type="password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    fullWidth
                                    required
                                />
                            </Stack>
                        )}

                        <FormControl fullWidth required error={!!errors.role}>
                            <InputLabel>Role</InputLabel>
                            <Select
                                label="Role"
                                value={data.role}
                                onChange={(e) => setData('role', e.target.value)}
                            >
                                {roles.map((r) => (
                                    <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button type="button" onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>
                        {editing ? 'Save Changes' : 'Add User'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

function PasswordDialog({ open, onClose, user }) {
    const { data, setData, put, processing, errors, reset } = useForm({
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(`/settings/users/${user.id}/password`, {
            onSuccess: () => { reset(); onClose(); },
        });
    };

    if (!user) return null;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>Reset Password</DialogTitle>
                <Divider />
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Setting a new password for <b>{user.name}</b> ({user.email}).
                    </Typography>
                    <Stack spacing={2.5}>
                        <TextField
                            label="New Password"
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            error={!!errors.password}
                            helperText={errors.password || 'Min 8 characters'}
                            fullWidth
                            required
                            autoFocus
                        />
                        <TextField
                            label="Confirm New Password"
                            type="password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            fullWidth
                            required
                        />
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button type="button" onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>
                        Update Password
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function UsersIndex({ users, roles }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage users');
    const [formOpen, setFormOpen] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [passwordUser, setPasswordUser] = useState(null);

    const handleDelete = (user) => {
        if (user.id === auth.user.id) return;
        if (confirm(`Delete user "${user.name}"?`)) {
            router.delete(`/settings/users/${user.id}`);
        }
    };

    return (
        <AppLayout title="Users">
            <Head title="Users" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Users</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Login accounts and roles. Add real accounts here and retire the seeded default.
                    </Typography>
                </Box>
                {canEdit && (
                    <Button variant="contained" startIcon={<Add />} onClick={() => { setEditUser(null); setFormOpen(true); }}>
                        Add User
                    </Button>
                )}
            </Stack>

            <Card>
                <CardContent sx={{ p: '0 !important' }}>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Created</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 120 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((u) => (
                                        <TableRow key={u.id} hover>
                                            <TableCell fontWeight={500}>
                                                {u.name}
                                                {u.id === auth.user.id && (
                                                    <Chip label="You" size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                                                )}
                                            </TableCell>
                                            <TableCell>{u.email}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={u.role ?? '—'}
                                                    size="small"
                                                    color={ROLE_COLOR[u.role] ?? 'default'}
                                                    variant="outlined"
                                                    sx={{ textTransform: 'capitalize' }}
                                                />
                                            </TableCell>
                                            <TableCell>{u.created_at}</TableCell>
                                            {canEdit && (
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                        <IconButton size="small" onClick={() => { setEditUser(u); setFormOpen(true); }}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" onClick={() => setPasswordUser(u)}>
                                                            <VpnKey fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            disabled={u.id === auth.user.id}
                                                            onClick={() => handleDelete(u)}
                                                        >
                                                            <Delete fontSize="small" />
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
                </CardContent>
            </Card>

            <UserForm
                key={editUser?.id ?? 'new'}
                open={formOpen}
                onClose={() => setFormOpen(false)}
                roles={roles}
                user={editUser}
            />

            <PasswordDialog
                key={`pwd-${passwordUser?.id ?? 'none'}`}
                open={!!passwordUser}
                onClose={() => setPasswordUser(null)}
                user={passwordUser}
            />
        </AppLayout>
    );
}
