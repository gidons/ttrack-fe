import { Alert, Box, CircularProgress } from "@mui/material";
import React from "react";

export interface LoadingComponentProps {
    loadData: () => Promise<void>
    children: JSX.Element
    isLoading: boolean
    setIsLoading: (isLoading: boolean) => void
}

export default function LoadingComponent({loadData, children, isLoading, setIsLoading}: LoadingComponentProps) {
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
        if (isLoading) {
            console.log(`LoadingComponent.loading`)
            // TODO: sus
            setError(null)
            loadData()
                .catch(loadError => { setError(loadError) })
                .finally(() => setIsLoading(false))

        }
    }, [isLoading, setIsLoading, setError])

    return (
        isLoading ? 
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    m: 1,
                }}
                >
                <CircularProgress />
            </Box>
        : error ? 
            <Box sx={{ flexGrow: 1 }}>
                <Alert severity="error">{error.message}</Alert>
            </Box>
        : <>{children}</>
    )
}