import AppLayout from '@/Layouts/AppLayout';
import { Head, useForm, router } from '@inertiajs/react';
import {
    Box, Button, Card, CardContent, Stack, TextField, Typography,
} from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';

export default function CreatePeriod() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        start_date: '',
        end_date: '',
        notes: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/pnl/periods');
    };

    return (
        <AppLayout title="New Period">
            <Head title="New Period" />

            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => router.get('/pnl')}
                    size="small"
                >
                    Back
                </Button>
                <Typography variant="h5" fontWeight={600}>
                    New P&L Period
                </Typography>
            </Stack>

            <Card elevation={2} sx={{ maxWidth: 520 }}>
                <CardContent>
                    <form onSubmit={submit}>
                        <Stack spacing={3}>
                            <TextField
                                label="Period Name"
                                placeholder="e.g. July 2026"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                fullWidth
                                autoFocus
                                required
                            />
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    label="Start Date"
                                    type="date"
                                    value={data.start_date}
                                    onChange={(e) => setData('start_date', e.target.value)}
                                    error={!!errors.start_date}
                                    helperText={errors.start_date}
                                    fullWidth
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                                <TextField
                                    label="End Date"
                                    type="date"
                                    value={data.end_date}
                                    onChange={(e) => setData('end_date', e.target.value)}
                                    error={!!errors.end_date}
                                    helperText={errors.end_date}
                                    fullWidth
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Stack>
                            <TextField
                                label="Notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                multiline
                                rows={3}
                                fullWidth
                            />
                            <Box display="flex" justifyContent="flex-end">
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={<Save />}
                                    disabled={processing}
                                >
                                    {processing ? 'Creating…' : 'Create Period'}
                                </Button>
                            </Box>
                        </Stack>
                    </form>
                </CardContent>
            </Card>
        </AppLayout>
    );
}
