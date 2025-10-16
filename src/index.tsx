import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Routes, Route } from "react-router";
import CreateSong from './components/CreateSong';
import EditSong from './components/EditSong';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/songs" element={<App/>}/>
        <Route path="/songs/new" element={<CreateSong/>}/>
        <Route path="/songs/:songId" element={<EditSong/>}/>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
