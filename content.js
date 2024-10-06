// content.js

// Set your ElevenLabs API key
const ELEVENLABS_API_KEY = ''; // Replace with your ElevenLabs API key

// Create the overlay
const overlay = document.createElement('div');
overlay.id = 'ibm-granite-overlay';

// Create the "Ask IBM Granite" button
const askButton = document.createElement('button');
askButton.id = 'ask-button';
askButton.innerText = 'Tell as a story';

// Append the button to the overlay
overlay.appendChild(askButton);

// Variables to store selected text and range
let selectedText = '';
let selectedRange = null;

// Function to handle text selection
document.addEventListener('mouseup', (event) => {
  console.log('mouseup event: ', event);
  const selection = window.getSelection();
  const text = selection.toString().trim();
  if (text !== '') {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Set the position of the overlay
    overlay.style.top = `${window.scrollY + rect.top - 50}px`; // Adjust as needed
    overlay.style.left = `${window.scrollX + rect.left + rect.width / 2 - 70}px`; // Adjust to center the overlay

    selectedText = text;
    selectedRange = range;

    // Remove existing overlay if any
    const existingOverlay = document.getElementById('ibm-granite-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Append the overlay to the document body
    document.body.appendChild(overlay);
  } else {
    // Remove overlay if no text is selected
    const existingOverlay = document.getElementById('ibm-granite-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
  }
});

// Delay function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('audioDatabase', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore('audios', { keyPath: 'id' });
    };
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Function to save audio blob to IndexedDB
function saveAudioToIndexedDB(db, id, blob) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['audios'], 'readwrite');
    const store = transaction.objectStore('audios');
    const request = store.put({ id: id, audio: blob });
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Function to get audio blob from IndexedDB
function getAudioFromIndexedDB(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['audios'], 'readonly');
    const store = transaction.objectStore('audios');
    const request = store.get(id);
    request.onsuccess = (event) => {
      if (request.result) {
        resolve(request.result.audio);
      } else {
        reject('Audio not found in IndexedDB');
      }
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Handle click on "Ask IBM Granite" button using event delegation
document.body.addEventListener('click', async (event) => {
  if (selectedText.length > 200) {
    console.log('Tell as a story clicked');
    console.log('selectedText: ', selectedText);
    event.stopPropagation();

    // Disable the button
    askButton.disabled = true;
    askButton.innerText = 'Loading...';

    try {
      // Delay before sending the request (if needed)
      await delay(3000);

      // Send the selected text to the ElevenLabs API
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/9BWtsMINqrJLrRacOk9x', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: selectedText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          },
          previous_request_ids: []
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      // Get the audio data as a blob
      const audioBlob = await response.blob();

      // Open IndexedDB
      const db = await openDatabase();
      const audioId = 'audio_' + Date.now(); // Generate a unique ID for the audio

      // Save audio blob to IndexedDB
      await saveAudioToIndexedDB(db, audioId, audioBlob);

      // Retrieve audio blob from IndexedDB
      const retrievedAudioBlob = await getAudioFromIndexedDB(db, audioId);

      // Create an object URL for the audio and play it
      const audioURL = URL.createObjectURL(retrievedAudioBlob);
      const audio = new Audio(audioURL);
      audio.play();

      // Re-enable the button
      askButton.disabled = false;
      askButton.innerText = 'Tell as a story';
    } catch (error) {
      console.error('Error:', error);
      askButton.disabled = false;
      askButton.innerText = 'Tell as a story';
      alert('An error occurred while fetching the audio.');
    }
  }
});

// Remove overlay when clicking elsewhere
document.addEventListener('mousedown', (event) => {
  const overlayElement = document.getElementById('ibm-granite-overlay');
  if (overlayElement && !overlayElement.contains(event.target)) {
    overlayElement.remove();
    window.getSelection().removeAllRanges();
  }
});