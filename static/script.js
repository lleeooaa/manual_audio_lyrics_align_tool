// Get references to DOM elements
const audioPlayer = document.getElementById('audioPlayer');
const fullLyricsDiv = document.getElementById('fullLyrics');
const selectedLyricsTextarea = document.getElementById('selectedLyrics');
const saveAndNextButton = document.getElementById('saveAndNextButton');
const insertMusicButton = document.getElementById('insertMusicButton');
const fileList = document.getElementById('fileList');
const errorDiv = document.getElementById('error');

// Initialize variables
let currentFileIndex = 0;
let files = [];
let currentFullLyrics = '';
let selectionStart = null;
let selectionEnd = null;
let songSelections = {};  // Store selections for each song (potential issue as it consumes memory)

// Function to display error messages
function showError(message) {
    errorDiv.textContent = message;
    console.error(message);
}

// Function to clear error messages
function clearError() {
    errorDiv.textContent = '';
}

// Fetch audio files from the server
fetch('/audio_files')
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showError(data.error);
        } else {
            files = data;
            console.log(`Loaded ${files.length} audio files`);
            updateFileList();
            loadCurrentFile();
        }
    })
    .catch(error => {
        console.error('Error loading audio files:', error);
        showError('Error loading audio files. Please check the server.');
    });

// Function to update the file list in the UI
function updateFileList() {
    // Generate HTML for file list
    fileList.innerHTML = files.map((file, index) => 
        `<div data-index="${index}" class="${index === currentFileIndex ? 'current' : ''}">${file}</div>`
    ).join('');

    // Add click event listeners to file list items
    fileList.querySelectorAll('div').forEach(div => {
        div.addEventListener('click', () => {
            currentFileIndex = parseInt(div.dataset.index);
            loadCurrentFile();
            updateFileList();
        });
    });
}

// Function to load the current file
function loadCurrentFile() {
    clearError();
    const currentFile = files[currentFileIndex];
    console.log(`Loading file: ${currentFile}`);
    
    // Set audio player source
    audioPlayer.src = `/audio/${encodeURIComponent(currentFile)}`;
    audioPlayer.onerror = () => {
        showError(`Error loading audio file: ${currentFile}`);
    };
    
    // Extract song name and load lyrics
    const songName = currentFile.split('_')[0];
    const lyricsFile = songName + '.txt';
    console.log(`Loading lyrics file: ${lyricsFile}`);
    loadFullLyrics(lyricsFile, songName);
    
    // Reset selection
    selectedLyricsTextarea.value = '';
    selectionStart = null;
    selectionEnd = null;
}

// Function to load full lyrics
function loadFullLyrics(lyricsFile, songName) {
    fetch(`/lyrics/${encodeURIComponent(lyricsFile)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(lyrics => {
            currentFullLyrics = lyrics;
            displayFullLyrics(songName);
        })
        .catch(error => {
            console.error('Error loading lyrics:', error);
            showError(`Error loading lyrics for ${lyricsFile}: ${error.message}`);
        });
}

// Function to display full lyrics and handle selections
function displayFullLyrics(songName) {
    // Create spans for each character in the lyrics
    fullLyricsDiv.innerHTML = currentFullLyrics.split('').map((char, index) => 
        `<span data-index="${index}">${char}</span>`
    ).join('');

    // Highlight previously aligned sections
    if (songSelections[songName]) {
        songSelections[songName].forEach(selection => {
            for (let i = selection.start; i <= selection.end; i++) {
                const span = fullLyricsDiv.querySelector(`span[data-index="${i}"]`);
                if (span) span.classList.add('aligned');
            }
        });
    }

    // Add event listeners for character selection
    fullLyricsDiv.querySelectorAll('span').forEach(span => {
        span.addEventListener('mousedown', (e) => {
            selectionStart = parseInt(span.dataset.index);
            selectionEnd = selectionStart;
            updateSelection();
        });

        span.addEventListener('mouseover', (e) => {
            if (e.buttons === 1 && selectionStart !== null) {
                selectionEnd = parseInt(span.dataset.index);
                updateSelection();
            }
        });
    });

    // Handle mouseup event to update selected lyrics
    document.addEventListener('mouseup', () => {
        if (selectionStart !== null && selectionEnd !== null) {
            updateSelectedLyrics();
        }
    });
}

// Function to update the visual selection in the full lyrics
function updateSelection() {
    fullLyricsDiv.querySelectorAll('span').forEach(span => {
        const index = parseInt(span.dataset.index);
        if (selectionStart !== null && selectionEnd !== null) {
            const start = Math.min(selectionStart, selectionEnd);
            const end = Math.max(selectionStart, selectionEnd);
            if (index >= start && index <= end) {
                span.classList.add('selected');
            } else {
                span.classList.remove('selected');
            }
        }
    });
}

// Function to update the selected lyrics textarea
function updateSelectedLyrics() {
    if (selectionStart !== null && selectionEnd !== null) {
        const start = Math.min(selectionStart, selectionEnd);
        const end = Math.max(selectionStart, selectionEnd);
        selectedLyricsTextarea.value = currentFullLyrics.substring(start, end + 1);
    }
}

// Function to save alignment and move to next file
function saveAndNext() {
    clearError();
    const currentFile = files[currentFileIndex];
    const songName = currentFile.split('_')[0];
    const selectedLyrics = selectedLyricsTextarea.value;
    const data = {
        filename: currentFile,
        lyrics: selectedLyrics
    };
    
    // Send alignment data to server
    fetch('/save_alignment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        console.log('Alignment saved successfully');
        
        // Store selection for the current song
        if (!songSelections[songName]) {
            songSelections[songName] = [];
        }
        
        songSelections[songName].push({
            start: selectionStart,
            end: selectionEnd,
            lyrics: selectedLyrics
        });
        
        // Update visual alignment in full lyrics
        if (selectionStart !== null && selectionEnd !== null) {
            const start = Math.min(selectionStart, selectionEnd);
            const end = Math.max(selectionStart, selectionEnd);
            for (let i = start; i <= end; i++) {
                const span = fullLyricsDiv.querySelector(`span[data-index="${i}"]`);
                if (span) span.classList.add('aligned');
            }
        }
        
        // Move to next file
        currentFileIndex = (currentFileIndex + 1) % files.length;
        loadCurrentFile();
        updateFileList();
    })
    .catch((error) => {
        console.error('Error saving alignment:', error);
        showError(`Error saving alignment: ${error.message}. Please try again.`);
    });
}

// Event listener for manual input in selected lyrics textarea
selectedLyricsTextarea.addEventListener('input', () => {
    const selectedText = selectedLyricsTextarea.value;
    let startIndex = currentFullLyrics.indexOf(selectedText);

    if (startIndex !== -1) {
        selectionStart = startIndex;
        selectionEnd = startIndex + selectedText.length - 1;
        updateSelection();
    } else {
        fullLyricsDiv.querySelectorAll('span').forEach(span => {
            span.classList.remove('selected');
        });
    }
});

// Event listener for save and next button
saveAndNextButton.addEventListener('click', saveAndNext);

// Event listener for Ctrl+S shortcut
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveAndNext();
    }
});

// Event listener for insert music button
insertMusicButton.addEventListener('click', () => {
    const musicSymbol = '【音楽】';
    const cursorPos = selectedLyricsTextarea.selectionStart;
    const textBefore = selectedLyricsTextarea.value.substring(0, cursorPos);
    const textAfter = selectedLyricsTextarea.value.substring(cursorPos);
    selectedLyricsTextarea.value = textBefore + musicSymbol + textAfter;
    
    // Move cursor after inserted symbol
    selectedLyricsTextarea.selectionStart = selectedLyricsTextarea.selectionEnd = cursorPos + musicSymbol.length;
    
    // Trigger input event to update selection
    selectedLyricsTextarea.dispatchEvent(new Event('input'));
    
    // Focus on textarea
    selectedLyricsTextarea.focus();
});
