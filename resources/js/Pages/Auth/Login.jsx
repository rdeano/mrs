import { useForm, Head } from '@inertiajs/react';
import {
    Alert, Box, Button, Card, CardContent, Divider,
    InputAdornment, Stack, TextField, Typography,
} from '@mui/material';
import { LockOutlined, MailOutline } from '@mui/icons-material';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                bgcolor: '#0F172A',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
            }}
        >
            <Head title="Sign In" />

            <Box sx={{ width: '100%', maxWidth: 420 }}>
                {/* Brand */}
                <Box textAlign="center" mb={4}>
                    <Typography variant="h5" fontWeight={800} color="#fff" letterSpacing={-0.5}>
                        MRS Meat Trading
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
                        Management System
                    </Typography>
                </Box>

                <Card sx={{ border: '1px solid rgba(255,255,255,0.08)', bgcolor: '#1E293B' }}>
                    <CardContent sx={{ p: '28px !important' }}>
                        <Typography variant="h6" fontWeight={700} color="#fff" mb={0.5}>
                            Sign in
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>
                            Enter your credentials to continue
                        </Typography>

                        {errors.email && (
                            <Alert severity="error" sx={{ mb: 2 }}>{errors.email}</Alert>
                        )}

                        <form onSubmit={submit}>
                            <Stack spacing={2.5}>
                                <TextField
                                    label="Email address"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    error={!!errors.email}
                                    fullWidth
                                    autoFocus
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <MailOutline fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: 'rgba(255,255,255,0.05)',
                                            color: '#fff',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                                            '&.Mui-focused fieldset': { borderColor: '#2563EB' },
                                        },
                                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                                        '& .MuiInputLabel-root.Mui-focused': { color: '#2563EB' },
                                    }}
                                />
                                <TextField
                                    label="Password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    error={!!errors.password}
                                    helperText={errors.password}
                                    fullWidth
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlined fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: 'rgba(255,255,255,0.05)',
                                            color: '#fff',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                                            '&.Mui-focused fieldset': { borderColor: '#2563EB' },
                                        },
                                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                                        '& .MuiInputLabel-root.Mui-focused': { color: '#2563EB' },
                                        '& .MuiFormHelperText-root': { color: '#FC8181' },
                                    }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                    disabled={processing}
                                    sx={{ py: 1.5, fontWeight: 600, fontSize: '0.9rem' }}
                                >
                                    {processing ? 'Signing in…' : 'Sign In'}
                                </Button>
                            </Stack>
                        </form>
                    </CardContent>
                </Card>

                <Typography variant="caption" textAlign="center" display="block" mt={3} sx={{ color: 'rgba(255,255,255,0.25)' }}>
                    © {new Date().getFullYear()} MRS Meat Trading
                </Typography>
            </Box>
        </Box>
    );
}
