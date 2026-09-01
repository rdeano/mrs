import { InputAdornment, TextField } from '@mui/material';
import { Search } from '@mui/icons-material';

export default function SearchField({ value, onChange, placeholder = 'Search...', sx }) {
    return (
        <TextField
            size="small"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            sx={{ minWidth: 240, ...sx }}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <Search fontSize="small" />
                    </InputAdornment>
                ),
            }}
        />
    );
}
