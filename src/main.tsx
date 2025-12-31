import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route } from "react-router";
import CreateSong from './components/CreateSong';
import EditSong from './components/EditSong';
import NotificationsProvider from './hooks/useNotifications/NotificationsProvider';
import ViewSong from './components/ViewSong';
import DialogsProvider from './hooks/useDialogs/DialogsProvider';
import AppTheme from './theme/AppTheme';
import Welcome from './Welcome';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DialogsProvider><NotificationsProvider><AppTheme>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome/>}/>
          <Route path="/songs" element={<App/>}/>
          <Route path="/songs/new" element={<CreateSong/>}/>
          <Route path="/songs/:songId" element={<ViewSong/>}/>
          <Route path="/songs/:songId/edit" element={<EditSong/>}/>
          <Route path="/songs/:songId/part/:part" element={<ViewSong/>}/>
          <Route path="/songs/:songId/mix/:mixName" element={<ViewSong/>}/>
        </Routes>
      </BrowserRouter>
    </AppTheme></NotificationsProvider></DialogsProvider>
  </React.StrictMode>
);

reportWebVitals();
