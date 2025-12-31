'use client';
import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Breadcrumbs, { breadcrumbsClasses } from '@mui/material/Breadcrumbs';
import Container, { ContainerProps } from '@mui/material/Container';
import MuiLink from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import { Link } from 'react-router';
import { dark } from '@clerk/themes';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

const PageContentHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
}));

const PageHeaderBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: 'center',
  },
}));

const PageHeaderToolbar = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  gap: theme.spacing(1),
  // Ensure the toolbar is always on the right side, even after wrapping
  marginLeft: 'auto',
}));

export interface Breadcrumb {
  title: string;
  path?: string;
}
export interface PageContainerProps extends ContainerProps {
  children?: React.ReactNode;
  title?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export default function PageContainer(props: PageContainerProps) {
  const { children, breadcrumbs, title, actions = null } = props;
  // const [ userPrincipal, setUserPrincipal ] = React.useState<UserPrincipal | null>(null);

  interface UserPrincipal {
    userDetails: string
  }
/*
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/.auth/me');
        if (!res.ok) return;
        const data = await res.json();
        console.log(`Auth data: ${JSON.stringify(data)}`)
        const principal = data.clientPrincipal
        setUserPrincipal(principal)
      } catch (err) {
        console.log(`Error while getting auth data: ${err}`)
        void err;
      }
    })();
  }, [setUserPrincipal]);
*/
  return (
    <Container sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Stack sx={{ flex: 1, my: 2 }} spacing={2}>
        <Stack>
          <Stack
            direction={'row'}
            sx={{ padding: 1, justifyContent: 'space-between', width: '100%' }}>
            <PageHeaderBreadcrumbs
              aria-label="breadcrumb"
              separator={<NavigateNextRoundedIcon fontSize="small" />}
            >
              {breadcrumbs
                ? breadcrumbs.map((breadcrumb, index) => {
                    return breadcrumb.path ? (
                      <MuiLink
                        key={index}
                        component={Link}
                        underline="hover"
                        color="inherit"
                        to={breadcrumb.path}
                      >
                        {breadcrumb.title}
                      </MuiLink>
                    ) : (
                      <Typography
                        key={index}
                        sx={{ color: 'text.primary', fontWeight: 600 }}
                      >
                        {breadcrumb.title}
                      </Typography>
                    );
                  })
                : null}
            </PageHeaderBreadcrumbs>
            <SignedOut><SignInButton/></SignedOut>
            <SignedIn><UserButton showName={true} appearance={{theme: dark}}/></SignedIn>
          </Stack>
          <PageContentHeader>
            {title ? <Typography variant="h4">{title}</Typography> : null}
            <PageHeaderToolbar>{actions}</PageHeaderToolbar>
          </PageContentHeader>
        </Stack>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      </Stack>
    </Container>
  );
}
