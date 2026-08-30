import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { router } from '@inertiajs/react';
import {
    Box, Chip, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { AutoAwesome, Functions } from '@mui/icons-material';
import { peso, isNeg, shortDate } from '@/utils/format';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Excel-like grid for the P&L line-item cells: arrow/tab/enter navigation,
 * type-to-edit, range selection, copy/paste, and fill-down (Ctrl/Cmd+D).
 * Category header rows and category total rows are rendered here too (for
 * layout) but are not part of the addressable/editable grid.
 */
export default function PnlGrid({ categories, dates, periodId, canEdit, onAutoCellClick }) {
    const rows = useMemo(() => {
        const list = [];
        categories.forEach((cat) => {
            (cat.line_items || []).forEach((item) => {
                list.push({
                    lineItemId:  item.id,
                    name:        item.name,
                    isAuto:      !!item.is_auto,
                    isSubtotal:  !!item.is_subtotal,
                    sourceType:  item.source_type,
                    sourceLabel: item.source_label,
                    sourceLink:  item.source_link,
                    entries:     item.entries || {},
                });
            });
        });
        return list;
    }, [categories]);

    const rowIndexByItemId = useMemo(() => {
        const m = new Map();
        rows.forEach((r, i) => m.set(r.lineItemId, i));
        return m;
    }, [rows]);

    // Mirrored in refs so rapid, back-to-back native key/mouse events (e.g. fast
    // typing or key repeat, which can fire faster than React re-renders) always
    // read the latest value instead of a stale closure from the previous render.
    const [active, setActiveState] = useState(null);   // { r, c }
    const [anchor, setAnchorState] = useState(null);    // { r, c } — start of selection
    const [editing, setEditingState] = useState(null);  // { r, c, value }
    const activeRef  = useRef(null);
    const anchorRef  = useRef(null);
    const editingRef = useRef(null);
    const containerRef = useRef(null);
    const editInputRef = useRef(null);
    const draggingRef = useRef(false);

    const setActive = (val) => { activeRef.current = val; setActiveState(val); };
    const setAnchor = (val) => { anchorRef.current = val; setAnchorState(val); };
    const setEditing = (val) => { editingRef.current = val; setEditingState(val); };

    const isEditableRow = useCallback((r) => {
        const row = rows[r];
        return canEdit && row && !row.isAuto && !row.isSubtotal;
    }, [rows, canEdit]);

    const getValue = useCallback((r, c) => {
        const row = rows[r];
        if (!row) return '';
        return row.entries[dates[c]] ?? '';
    }, [rows, dates]);

    const moveTo = useCallback((r, c, extend = false) => {
        r = clamp(r, 0, rows.length - 1);
        c = clamp(c, 0, dates.length - 1);
        setActive({ r, c });
        if (!extend) setAnchor({ r, c });
    }, [rows.length, dates.length]);

    const focusContainer = () => containerRef.current?.focus({ preventScroll: true });

    const commit = useCallback((r, c, rawValue) => {
        const row = rows[r];
        if (!row) return;
        const date = dates[c];
        const original = row.entries[date] ?? '';
        const amount = rawValue === '' ? 0 : Number(rawValue);
        if (Number.isNaN(amount)) return;
        if (Number(amount) === Number(original || 0)) return;

        router.post('/pnl/entries', {
            pnl_line_item_id: row.lineItemId,
            pnl_period_id:    periodId,
            entry_date:       date,
            amount,
        }, { preserveState: true, preserveScroll: true });
    }, [rows, dates, periodId]);

    const commitBatch = useCallback((changes) => {
        if (!changes.length) return;
        router.post('/pnl/entries/batch', {
            pnl_period_id: periodId,
            entries:       changes,
        }, { preserveState: true, preserveScroll: true });
    }, [periodId]);

    const getBounds = useCallback(() => {
        const a = anchorRef.current || activeRef.current;
        const b = activeRef.current;
        if (!a || !b) return null;
        return {
            rMin: Math.min(a.r, b.r), rMax: Math.max(a.r, b.r),
            cMin: Math.min(a.c, b.c), cMax: Math.max(a.c, b.c),
        };
    }, []);

    const isSelected = useCallback((r, c) => {
        const b = getBounds();
        if (!b) return false;
        return r >= b.rMin && r <= b.rMax && c >= b.cMin && c <= b.cMax;
    }, [getBounds]);

    const startEdit = (r, c, value) => {
        if (!isEditableRow(r)) return;
        // flushSync forces the <input> to mount synchronously so we can focus it
        // before the next native keydown is processed — without this, fast typing
        // can fire a second keystroke while focus is still on the container div.
        flushSync(() => setEditing({ r, c, value }));
        const el = editInputRef.current;
        if (el) {
            el.focus({ preventScroll: true });
            el.setSelectionRange(el.value.length, el.value.length);
        }
    };

    const copySelection = useCallback(() => {
        const b = getBounds();
        if (!b || !navigator.clipboard?.writeText) return;
        const lines = [];
        for (let r = b.rMin; r <= b.rMax; r++) {
            const cols = [];
            for (let c = b.cMin; c <= b.cMax; c++) cols.push(getValue(r, c));
            lines.push(cols.join('\t'));
        }
        navigator.clipboard.writeText(lines.join('\n'));
    }, [getBounds, getValue]);

    const pasteSelection = useCallback(async () => {
        const anchorCell = activeRef.current;
        if (!anchorCell || !navigator.clipboard?.readText) return;
        let text;
        try {
            text = await navigator.clipboard.readText();
        } catch {
            return;
        }
        const lines = text.replace(/\r/g, '').split('\n');
        while (lines.length && lines[lines.length - 1] === '') lines.pop();

        const changes = [];
        lines.forEach((line, dr) => {
            line.split('\t').forEach((val, dc) => {
                const r = anchorCell.r + dr;
                const c = anchorCell.c + dc;
                if (r < 0 || r >= rows.length || c < 0 || c >= dates.length) return;
                if (!isEditableRow(r)) return;
                const num = val.trim() === '' ? 0 : Number(val);
                if (Number.isNaN(num)) return;
                changes.push({ pnl_line_item_id: rows[r].lineItemId, entry_date: dates[c], amount: num });
            });
        });
        commitBatch(changes);
    }, [rows, dates, isEditableRow, commitBatch]);

    const fillDown = useCallback(() => {
        const b = getBounds();
        if (!b || b.rMin === b.rMax) return;
        const changes = [];
        for (let c = b.cMin; c <= b.cMax; c++) {
            const sourceVal = getValue(b.rMin, c);
            const num = sourceVal === '' ? 0 : Number(sourceVal);
            if (Number.isNaN(num)) continue;
            for (let r = b.rMin + 1; r <= b.rMax; r++) {
                if (!isEditableRow(r)) continue;
                changes.push({ pnl_line_item_id: rows[r].lineItemId, entry_date: dates[c], amount: num });
            }
        }
        commitBatch(changes);
    }, [getBounds, getValue, isEditableRow, rows, dates, commitBatch]);

    const onContainerKeyDown = (e) => {
        if (editingRef.current || !activeRef.current) return;
        const { r, c } = activeRef.current;
        const mod = e.ctrlKey || e.metaKey;

        if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelection(); return; }
        if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteSelection(); return; }
        if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); fillDown(); return; }

        switch (e.key) {
            case 'ArrowUp':    e.preventDefault(); moveTo(r - 1, c, e.shiftKey); break;
            case 'ArrowDown':  e.preventDefault(); moveTo(r + 1, c, e.shiftKey); break;
            case 'ArrowLeft':  e.preventDefault(); moveTo(r, c - 1, e.shiftKey); break;
            case 'ArrowRight': e.preventDefault(); moveTo(r, c + 1, e.shiftKey); break;
            case 'Tab':
                e.preventDefault();
                moveTo(r, c + (e.shiftKey ? -1 : 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (isEditableRow(r)) startEdit(r, c, String(getValue(r, c)));
                else moveTo(r + 1, c);
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                if (isEditableRow(r)) commit(r, c, 0);
                break;
            default:
                if (isEditableRow(r) && e.key.length === 1 && !mod && !e.altKey) {
                    e.preventDefault();
                    startEdit(r, c, e.key);
                }
        }
    };

    const onInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            commit(editing.r, editing.c, editing.value);
            const { r, c } = editing;
            setEditing(null);
            moveTo(r + 1, c);
            focusContainer();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setEditing(null);
            focusContainer();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            commit(editing.r, editing.c, editing.value);
            const { r, c } = editing;
            setEditing(null);
            moveTo(r, c + (e.shiftKey ? -1 : 1));
            focusContainer();
        }
    };

    const onInputBlur = () => {
        if (!editing) return;
        commit(editing.r, editing.c, editing.value);
        setEditing(null);
    };

    useEffect(() => {
        const onMouseUp = () => { draggingRef.current = false; };
        window.addEventListener('mouseup', onMouseUp);
        return () => window.removeEventListener('mouseup', onMouseUp);
    }, []);

    const onCellMouseDown = (r, c, e) => {
        const currentEdit = editingRef.current;
        if (currentEdit && (currentEdit.r !== r || currentEdit.c !== c)) {
            commit(currentEdit.r, currentEdit.c, currentEdit.value);
            setEditing(null);
        }
        const currentActive = activeRef.current;
        const wasActive = currentActive && currentActive.r === r && currentActive.c === c && !e.shiftKey;
        moveTo(r, c, e.shiftKey);
        draggingRef.current = true;
        focusContainer();

        const row = rows[r];
        if (row.isAuto && !row.isSubtotal && onAutoCellClick && !e.shiftKey) {
            onAutoCellClick(row, dates[c]);
            return;
        }
        if (wasActive) startEdit(r, c, String(getValue(r, c)));
    };

    const onCellMouseEnter = (r, c) => {
        if (draggingRef.current) setActive({ r, c });
    };

    const onCellDoubleClick = (r, c) => {
        startEdit(r, c, String(getValue(r, c)));
    };

    const rowTotal = (row) => dates.reduce((s, d) => s + Number(row.entries[d] ?? 0), 0);

    return (
        <TableContainer
            ref={containerRef}
            tabIndex={0}
            onKeyDown={onContainerKeyDown}
            sx={{ outline: 'none' }}
        >
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Account</TableCell>
                        {dates.map((d) => (
                            <TableCell key={d} align="right" sx={{ fontWeight: 700, minWidth: 110 }}>
                                {shortDate(d)}
                            </TableCell>
                        ))}
                        <TableCell align="right" sx={{ fontWeight: 700, minWidth: 120, bgcolor: 'grey.50' }}>Total</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {categories.map((cat) => (
                        <Fragment key={`cat-${cat.id}`}>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell colSpan={dates.length + 2} sx={{ fontWeight: 700, py: 0.5 }}>
                                    {cat.name.toUpperCase()}
                                </TableCell>
                            </TableRow>

                            {(cat.line_items || []).map((item) => {
                                const r = rowIndexByItemId.get(item.id);
                                const row = rows[r];
                                const editableRow = isEditableRow(r);
                                const total = rowTotal(row);

                                return (
                                    <TableRow
                                        key={`item-${item.id}`}
                                        hover
                                        sx={row.isSubtotal ? { bgcolor: 'primary.50' } : row.isAuto ? { bgcolor: 'secondary.50' } : {}}
                                    >
                                        <TableCell sx={{ pl: row.isSubtotal ? 2 : 3, fontWeight: row.isSubtotal ? 700 : 400 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <span>{row.name}</span>
                                                {row.isSubtotal && (
                                                    <Chip
                                                        icon={<Functions sx={{ fontSize: '11px !important' }} />}
                                                        label="computed" size="small" color="primary" variant="outlined"
                                                        sx={{ height: 18, fontSize: '0.65rem', cursor: 'default' }}
                                                    />
                                                )}
                                                {row.isAuto && !row.isSubtotal && (
                                                    <Tooltip title={`Auto-calculated from ${row.sourceLabel}`} arrow>
                                                        <Chip
                                                            icon={<AutoAwesome sx={{ fontSize: '11px !important' }} />}
                                                            label="auto" size="small" color="secondary" variant="outlined"
                                                            sx={{ height: 18, fontSize: '0.65rem', cursor: row.sourceLink ? 'pointer' : 'default' }}
                                                            onClick={() => row.sourceLink && router.get(row.sourceLink)}
                                                        />
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </TableCell>

                                        {dates.map((d, c) => {
                                            const selected = isSelected(r, c);
                                            const isActiveCell = active && active.r === r && active.c === c;
                                            const isEditingCell = editing && editing.r === r && editing.c === c;
                                            const val = row.entries[d];

                                            return (
                                                <TableCell
                                                    key={d}
                                                    align="right"
                                                    onMouseDown={(e) => onCellMouseDown(r, c, e)}
                                                    onMouseEnter={() => onCellMouseEnter(r, c)}
                                                    onDoubleClick={() => editableRow && onCellDoubleClick(r, c)}
                                                    sx={{
                                                        p: 0.5, minWidth: 110, cursor: 'pointer', userSelect: 'none',
                                                        bgcolor: selected ? 'action.selected' : 'transparent',
                                                        outline: isActiveCell ? '2px solid' : 'none',
                                                        outlineColor: 'primary.main',
                                                        outlineOffset: '-2px',
                                                        color: row.isSubtotal && isNeg(val) ? 'error.main' : (row.isAuto ? 'secondary.dark' : 'inherit'),
                                                        fontStyle: row.isAuto && !row.isSubtotal ? 'italic' : 'normal',
                                                        fontWeight: row.isSubtotal ? 600 : 400,
                                                    }}
                                                >
                                                    {isEditingCell ? (
                                                        <input
                                                            ref={editInputRef}
                                                            value={editing.value}
                                                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                                            onKeyDown={onInputKeyDown}
                                                            onBlur={onInputBlur}
                                                            style={{
                                                                width: '100%', textAlign: 'right', border: 'none', outline: 'none',
                                                                background: 'transparent', font: 'inherit', color: 'inherit',
                                                            }}
                                                        />
                                                    ) : (
                                                        <Box sx={{ px: 1, py: 0.5 }}>
                                                            {val != null && val !== 0 ? peso(val) : (
                                                                <Typography component="span" variant="caption" color="text.disabled">—</Typography>
                                                            )}
                                                        </Box>
                                                    )}
                                                </TableCell>
                                            );
                                        })}

                                        <TableCell
                                            align="right"
                                            sx={{
                                                fontWeight: row.isSubtotal ? 700 : 600,
                                                bgcolor: row.isSubtotal ? 'primary.50' : 'grey.50',
                                                color: row.isSubtotal && isNeg(total) ? 'error.main' : 'inherit',
                                            }}
                                        >
                                            {total !== 0 ? peso(total) : '—'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {cat.total !== null && cat.total !== undefined && (
                                <TableRow sx={{ bgcolor: cat.is_calculated ? 'primary.main' : 'primary.50' }}>
                                    <TableCell sx={{ fontWeight: 700, pl: 2, color: cat.is_calculated ? '#fff' : 'inherit' }}>
                                        {cat.is_calculated ? cat.name : `Total ${cat.name}`}
                                    </TableCell>
                                    {dates.map((d) => (
                                        <TableCell
                                            key={d}
                                            align="right"
                                            sx={{
                                                fontWeight: 700,
                                                color: cat.is_calculated
                                                    ? (isNeg(cat.date_totals?.[d]) ? '#ffcdd2' : '#fff')
                                                    : (isNeg(cat.date_totals?.[d]) ? 'error.main' : 'inherit'),
                                            }}
                                        >
                                            {cat.date_totals?.[d] != null && cat.date_totals[d] !== 0 ? peso(cat.date_totals[d]) : '—'}
                                        </TableCell>
                                    ))}
                                    <TableCell
                                        align="right"
                                        sx={{
                                            fontWeight: 700,
                                            color: cat.is_calculated ? (isNeg(cat.total) ? '#ffcdd2' : '#fff') : (isNeg(cat.total) ? 'error.main' : 'inherit'),
                                        }}
                                    >
                                        {peso(cat.total)}
                                    </TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
