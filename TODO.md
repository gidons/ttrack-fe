Functionality
=============
Overall
-------
- Implement login and identity
- Create main menu

Songs Page
------------
- Add edit/delete buttons in song row
- Double-click to edit?
- Add create form

Song Page
---------
- Add all keys to dropdown (or break down to multiple fields, see below)
- If a track is locked by a task, show it as "processing" or something and block actions.
- Upload-part:
    + Allow uploading multiple parts from same dialog
    - Show errors on submit
    - After close, refresh track list
- Create-mix:
    - Allow creating multiple mixes from same dialog
    - Show errors before on submit
    - After close, refresh track list
- Add upload-all-parts (ZIP? multi-channel WAV/MP3?)
- Add download-all-as-zip for mixes
- Add download-all-as-zip for parts

Mix Packages
------------
?

Appearance
==========
- Add header/footer
- Add themes?
- Break key down to A-G dropdown, #/b/m checkboxes
- Instead of a separate EditSong page, show the edit form in-place in the ViewSong page.

Testing
=======
- Tests!

Refactors
=========
- Genericize SongForm (for TrackForm, MixForm, ?)
- Genericize SongView