import React, { FormEvent, useState } from 'react'
import { Song } from '../types';

interface SongEditModalProps {
    song: Song,
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => (data: Song) => void
}

function SongEditModal({ song, isOpen, onClose, onSubmit }) {
    const [id, setId] = useState(song.id)
    const [title, setTitle] = useState(song.title)
    const [arranger, setArranger] = useState(song.arranger)
    const [key, setKey] = useState(song.key)

    if (!isOpen) { return null; }

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const song: Song = {
            "id": this.id,
            "title": this.title,
            "arranger": this.arranger,
            "key": this.key,
            "durationSec": null,
        }
        onSubmit(song);
        onClose();
    }

    return (
        <div className="modal-overlay">
            <div className='modal-content'>
                <h2>Song Details</h2>
                <form onSubmit={handleSubmit}>
                    <input type="hidden" id='songId' value={id}/>
                    <div>
                        <label htmlFor='title'>Title:</label>
                        <input type="text" id='title' value={title} onChange={(e) => setTitle(e.target.value)} required/>
                    </div>
                    <div>
                        <label htmlFor='arranger'>Arranger:</label>
                        <input type="text" id='arranger' value={arranger} onChange={(e) => setArranger(e.target.value)}/>
                    </div>
                    <div>
                        <label htmlFor='key'>ID:</label>
                        <input type="text" id='key' value={key} onChange={(e) => setKey(e.target.value)}/>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default SongEditModal;