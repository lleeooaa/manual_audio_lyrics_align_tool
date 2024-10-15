from flask import Flask, send_file, request, jsonify, abort
import os
import sys
import traceback
from urllib.parse import unquote
import re

# Initialize Flask application
app = Flask(__name__)

# Update these paths to your actual folder locations
AUDIO_FOLDER = ''
LYRICS_FOLDER = ''
ALIGNMENT_FOLDER = ''

# Function to print error messages to stderr
def print_error(message):
    print(f"ERROR: {message}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)

# Route for the main page
@app.route('/')
def index():
    try:
        return send_file('alignment_tool.html')
    except Exception as e:
        print_error(f"Error serving index page: {str(e)}")
        return jsonify({"error": "Unable to serve index page"}), 500

# Function for natural sorting of filenames
def natural_sort_key(s):
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', s)]

# Route to get the list of audio files
@app.route('/audio_files')
def get_audio_files():
    try:
        print(f"Searching for audio files in: {AUDIO_FOLDER}")
        if not os.path.exists(AUDIO_FOLDER):
            raise FileNotFoundError(f"Audio folder not found: {AUDIO_FOLDER}")
        
        files = [f for f in os.listdir(AUDIO_FOLDER) if f.endswith('.mp3')]
        files.sort(key=natural_sort_key)  # Sort files using natural sort to prevent lexicographical order
        print(f"Found {len(files)} audio files")
        return jsonify(files)
    except Exception as e:
        print_error(f"Error getting audio files: {str(e)}")
        return jsonify({"error": f"Unable to retrieve audio files: {str(e)}"}), 500

# Route to serve audio files
@app.route('/audio/<path:filename>')
def get_audio(filename):
    try:
        filename = unquote(filename)
        file_path = os.path.join(AUDIO_FOLDER, filename)
        print(f"Attempting to serve audio file: {file_path}")
        if os.path.exists(file_path):
            return send_file(file_path, mimetype='audio/mpeg')
        else:
            print_error(f"Audio file not found: {file_path}")
            abort(404, description="Audio file not found")
    except Exception as e:
        print_error(f"Error serving audio file {filename}: {str(e)}")
        return jsonify({"error": f"Unable to serve audio file: {str(e)}"}), 500

# Route to get lyrics for a song
@app.route('/lyrics/<path:filename>')
def get_lyrics(filename):
    try:
        filename = unquote(filename)
        lyrics_file = os.path.join(LYRICS_FOLDER, filename)
        print(f"Attempting to read lyrics file: {lyrics_file}")
        if os.path.exists(lyrics_file):
            with open(lyrics_file, 'r', encoding='utf-8') as f:
                lyrics = f.read()
            print(f"Successfully read lyrics file: {lyrics_file}")
            return lyrics
        else:
            print_error(f"Lyrics file not found: {lyrics_file}")
            abort(404, description="Lyrics file not found")
    except Exception as e:
        print_error(f"Error getting lyrics for {filename}: {str(e)}")
        return jsonify({"error": f"Unable to retrieve lyrics: {str(e)}"}), 500

# Route to save alignment data
@app.route('/save_alignment', methods=['POST'])
def save_alignment():
    try:
        data = request.json
        filename = data['filename']
        lyrics = data['lyrics']
        alignment_file = os.path.join(ALIGNMENT_FOLDER, f"{os.path.splitext(filename)[0]}_alignment.txt")
        print(f"Attempting to save alignment to: {alignment_file}")
        with open(alignment_file, 'w', encoding='utf-8') as f:
            f.write(lyrics)
        print(f"Successfully saved alignment to: {alignment_file}")
        return jsonify({"status": "success"})
    except Exception as e:
        print_error(f"Error saving alignment: {str(e)}")
        return jsonify({"error": f"Unable to save alignment: {str(e)}"}), 500

# Main entry point of the application
if __name__ == '__main__':
    print("Starting Flask application...")
    print(f"Audio folder: {AUDIO_FOLDER}")
    print(f"Lyrics folder: {LYRICS_FOLDER}")
    print(f"Alignment folder: {ALIGNMENT_FOLDER}")
    app.run(debug=True)