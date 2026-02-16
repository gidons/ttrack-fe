import { ClerkProvider } from '@clerk/react-router';
import { dark } from '@clerk/themes';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from "react-router";
import Welcome from './Welcome';
import MainLayout from './components/MainLayout';
import { SongList } from './components/SongList';
import ProtectedContent from './components/common/ProtectedContent';
import CreateSong from './components/song/CreateSong';
import SongPage from './components/song/SongPage';
import ViewOrEditSong from './components/song/ViewOrEditSong';
import ViewSongSheet from './components/song/ViewSongSheet';
import DialogsProvider from './hooks/useDialogs/DialogsProvider';
import NotificationsProvider from './hooks/useNotifications/NotificationsProvider';
import './index.css';
import reportWebVitals from './reportWebVitals';
import AppTheme from './theme/AppTheme';
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
                <Route path="new" element={<CreateSong/>}/>
                <Route path=":songId" element={<SongPage />}>
                  <Route index element={<ViewOrEditSong/>}/>
                  <Route path="edit" element={<ViewOrEditSong isEditingSong={true}/>}/>
                  <Route path="data/notation" element={<ViewSongSheet/>}/>
                  <Route path="data/measures" element={<EditMeasures/>}/>
                  <Route path="data/bookmarks" element={<EditBookmarks/>}/>
                  {/* <Route path="data/lyrics" element={<ViewSong/>}/> */}
                  <Route path="part/:part/play" element={<ViewOrEditSong/>}/>
                  <Route path="mix/:mixName/play" element={<ViewOrEditSong/>}/>
                </Route>
              </Route>
            </Route>
          </Routes>
        </ClerkProvider>
      </BrowserRouter>
    </AppTheme></NotificationsProvider></DialogsProvider>
  </React.StrictMode>
);

reportWebVitals();
