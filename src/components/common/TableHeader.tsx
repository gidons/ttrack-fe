import { styled } from "@mui/material";

export const TableHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
}));

export const TableToolbar = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(1),
    // Ensure the toolbar is always on the right side, even after wrapping
    marginLeft: 'auto',
}));

