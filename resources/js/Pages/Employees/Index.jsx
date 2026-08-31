import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
    DialogContent, DialogTitle, Divider, FormControlLabel, IconButton,
    Stack, Switch, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';

function EmployeeForm({ open, onClose, employee }) {
    const editing = Boolean(employee);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name:      employee?.name      ?? '',
        role:      employee?.role      ?? '',
        is_active: employee?.is_active ?? true,
    });

    const submit = (e) => {
        e.preventDefault();
        const opts = { onSuccess: () => { reset(); onClose(); } };
        if (editing) {
            put(`/employees/${employee.id}`, opts);
        } else {
            post('/employees', opts);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={submit}>
                <DialogTitle fontWeight={700}>{editing ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
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
                            label="Role"
                            placeholder="Staff, Driver, Helper..."
                            value={data.role}
                            onChange={(e) => setData('role', e.target.value)}
                            error={!!errors.role}
                            helperText={errors.role}
                            fullWidth
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                />
                            }
                            label="Active"
                        />
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button type="button" onClick={onClose} color="inherit">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={processing}>
                        {editing ? 'Save Changes' : 'Add Employee'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function EmployeesIndex({ employees }) {
    const { auth } = usePage().props;
    const canEdit = auth.permissions.includes('manage salaries');
    const [formOpen, setFormOpen] = useState(false);
    const [editEmployee, setEditEmployee] = useState(null);

    const handleDelete = (id) => {
        if (confirm('Delete this employee?')) {
            router.delete(`/employees/${id}`);
        }
    };

    return (
        <AppLayout title="Employees">
            <Head title="Employees" />

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>Employees</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Employees used for Salaries.
                    </Typography>
                </Box>
                {canEdit && (
                    <Button variant="contained" startIcon={<Add />} onClick={() => { setEditEmployee(null); setFormOpen(true); }}>
                        Add Employee
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
                                    <TableCell>Role</TableCell>
                                    <TableCell>Status</TableCell>
                                    {canEdit && <TableCell align="center" sx={{ width: 80 }} />}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {employees.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                                            No employees found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    employees.map((emp) => (
                                        <TableRow key={emp.id} hover>
                                            <TableCell fontWeight={500}>{emp.name}</TableCell>
                                            <TableCell>{emp.role ?? '—'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={emp.is_active ? 'Active' : 'Inactive'}
                                                    size="small"
                                                    color={emp.is_active ? 'success' : 'default'}
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            {canEdit && (
                                                <TableCell align="center">
                                                    <Stack direction="row" spacing={0.5} justifyContent="center">
                                                        <IconButton size="small" onClick={() => { setEditEmployee(emp); setFormOpen(true); }}>
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton size="small" color="error" onClick={() => handleDelete(emp.id)}>
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

            <EmployeeForm
                key={editEmployee?.id ?? 'new'}
                open={formOpen}
                onClose={() => setFormOpen(false)}
                employee={editEmployee}
            />
        </AppLayout>
    );
}
