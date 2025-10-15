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
  },
  {
    id: '2',
    title: 'Chocolate Sundae',
    arranger: 'A. Kopser',
    key: 'A',
    durationSec: 180,
  }
]

function App(): JSX.Element {
  return (
    <div className="App">
      <SongList/>
    </div>
  );
}

export default App;
