import { ClerkProvider } from '@clerk/react-router';
import { dark } from '@clerk/themes';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from "react-router";
import MainLayout from './components/MainLayout';
import ProtectedContent from './components/common/ProtectedContent';
import { SongList } from './components/SongList';
import ViewSong from './components/ViewSong';
import DialogsProvider from './hooks/useDialogs/DialogsProvider';
import NotificationsProvider from './hooks/useNotifications/NotificationsProvider';
import './index.css';
import reportWebVitals from './reportWebVitals';
import AppTheme from './theme/AppTheme';
import Welcome from './Welcome';
import ViewSongSheet from './components/ViewSongSheet';
import EditBookmarks from './components/timeddata/EditBookmarks';
import EditMeasures from './components/timeddata/EditMeasures';

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
                <Route path=":songId" element={<ViewSong/>}/>
                <Route path=":songId/edit" element={<ViewSong/>}/>
                <Route path=":songId/data/notation" element={<ViewSongSheet/>}/>
                <Route path=":songId/data/measures" element={<EditMeasures/>}/>
                <Route path=":songId/data/bookmarks" element={<EditBookmarks/>}/>
                <Route path=":songId/data/lyrics" element={<ViewSong/>}/>
                <Route path=":songId/part/:part/play" element={<ViewSong/>}/>
                <Route path=":songId/mix/:mixName/play" element={<ViewSong/>}/>
              </Route>
            </Route>
          </Routes>
        </ClerkProvider>
      </BrowserRouter>
    </AppTheme></NotificationsProvider></DialogsProvider>
  </React.StrictMode>
);

reportWebVitals();
