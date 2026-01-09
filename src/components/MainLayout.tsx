import React from "react";
import { SignedIn, SignedOut, SignInButton, useAuth, UserButton } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { Box, Container, Stack, Typography } from "@mui/material";
import { Outlet } from "react-router";
import TTrackIcon from "./TTrackIcon";
import './MainLayout.css';
import { AuthContext } from "../backend/AuthContext";

export default function MainLayout() {
    const { getToken, userId } = useAuth()

    return (
        <AuthContext.Provider value={{getToken: getToken, userId: userId}}>
            <Container sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Stack sx={{ flex: 1, my: 2 }} spacing={2}>
                    <Stack
                        direction={'row'}
                        sx={{ padding: 1, justifyContent: 'space-between', width: '100%' }}>
                        <Stack direction={'row'} spacing={2}>
                            <TTrackIcon width={36} height={36} viewBox="0 0 18 18"/>
                            <Typography variant='h4'>TTrack Manager</Typography>
                        </Stack>
                        <SignedOut><SignInButton/></SignedOut>
                        <SignedIn><UserButton showName={true} appearance={{theme: dark}}/></SignedIn>
                    </Stack>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Outlet/>
                    </Box>
                </Stack>
            </Container>
        </AuthContext.Provider>
    )
}