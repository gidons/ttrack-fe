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

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <DialogsProvider><NotificationsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/songs" element={<App/>}/>
          <Route path="/songs/new" element={<CreateSong/>}/>
          <Route path="/songs/:songId" element={<ViewSong/>}/>
          <Route path="/songs/:songId/edit" element={<EditSong/>}/>
        </Routes>
      </BrowserRouter>
    </NotificationsProvider></DialogsProvider>
  </React.StrictMode>
);

reportWebVitals();
