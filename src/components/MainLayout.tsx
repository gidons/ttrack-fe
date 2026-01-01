import React from "react";
import { Protect, SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { Box, Container, Stack, Typography } from "@mui/material";
import { Outlet } from "react-router";

export default function MainLayout() {
    return (
        <Container sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack sx={{ flex: 1, my: 2 }} spacing={2}>
            <Stack
                direction={'row'}
                sx={{ padding: 1, justifyContent: 'space-between', width: '100%' }}>
                <Typography variant='h4'>TTrack Manager</Typography>
                <SignedOut><SignInButton/></SignedOut>
                <SignedIn><UserButton showName={true} appearance={{theme: dark}}/></SignedIn>
            </Stack>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Outlet/>
            </Box>
        </Stack>
        </Container>
    )
}