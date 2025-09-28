import React from 'react';
import './App.css';
import { SongList } from './components/SongList';
import { Song } from './types';

const SONGS: Song[] = [
  {
    id: '1',
    title: 'Stay Awake',
    arranger: 'Gidon',
    key: 'Bb',
    durationSec: 103,
    sheetMusicFile: null,
    partFiles: {}
  },
  {
    id: '2',
    title: 'Chocolate Sundae',
    arranger: 'A. Kopser',
    key: 'A',
    durationSec: 180,
    sheetMusicFile: null,
    partFiles: {}
  }
]

function App(): JSX.Element {
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
      </header>
      <SongList songs={SONGS} />
    </div>
  );
}

export default App;
