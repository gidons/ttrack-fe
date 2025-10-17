import React from 'react';
import './App.css';
import { SongList } from './components/SongList';

function App(): JSX.Element {
  return (
    <div className="App">
      <SongList/>
    </div>
  );
}

export default App;
