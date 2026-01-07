import { ClerkProvider } from '@clerk/react-router';
import { dark } from '@clerk/themes';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from "react-router";
import CreateSong from './components/CreateSong';
import MainLayout from './components/MainLayout';
import ProtectedContent from './components/ProtectedContent';
import { SongList } from './components/SongList';
import ViewSong from './components/ViewSong';
import DialogsProvider from './hooks/useDialogs/DialogsProvider';
import NotificationsProvider from './hooks/useNotifications/NotificationsProvider';
import './index.css';
import reportWebVitals from './reportWebVitals';
import AppTheme from './theme/AppTheme';
import Welcome from './Welcome';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DialogsProvider><NotificationsProvider><AppTheme>
      <BrowserRouter>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={{theme: dark}}>
          <Routes>
            <Route path="/" element={<MainLayout/>}>
              <Route index element={<Welcome/>}/>
              <Route path="songs" element={<ProtectedContent/>}>
                <Route index element={<SongList/>}/>
                <Route path="new" element={<CreateSong/>}/>
                <Route path=":songId" element={<ViewSong/>}/>
                <Route path=":songId/part/:part" element={<ViewSong/>}/>
                <Route path=":songId/mix/:mixName" element={<ViewSong/>}/>
              </Route>
            </Route>
          </Routes>
        </ClerkProvider>
      </BrowserRouter>
    </AppTheme></NotificationsProvider></DialogsProvider>
  </React.StrictMode>
);

reportWebVitals();
