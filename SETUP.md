# Quick Setup Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Get Your API Keys

**Choose ONE option:**

#### Option A: Hugging Face (EASIEST - Recommended for Hackathon) ⭐
1. Visit: https://huggingface.co/
2. Sign up or log in
3. Go to: https://huggingface.co/settings/tokens
4. Click "New token"
5. Name it and select "Read" permissions
6. Copy the token

**OR**

#### Option B: Google Gemini API (For Summarization)
1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key

**Note:** For audio transcription, you'll need Hugging Face API key (Google Cloud Speech-to-Text is not included in this setup).

### Step 3: Create .env File

Create a file named `.env` in the root directory:

**If using Hugging Face (Recommended):**
```env
HUGGINGFACE_API_KEY=paste_your_huggingface_token_here
PORT=3000
```

**If using Google Gemini:**
```env
GEMINI_API_KEY=paste_your_gemini_key_here
PORT=3000
```

**Mixed setup (Gemini + Hugging Face):**
```env
GEMINI_API_KEY=paste_your_gemini_key_here
HUGGINGFACE_API_KEY=paste_your_huggingface_token_here
PORT=3000
```

### Step 4: Run the App

```bash
npm start
```

Open your browser to: **http://localhost:3000**

## 📝 How to Use

1. **Option A - Transcript**: Paste your meeting transcript and click "Generate Summary & Slides"
2. **Option B - Audio**: Upload an audio file (MP3, WAV, M4A) and click "Transcribe & Generate"

The app will:
- Transcribe audio (if uploaded)
- Generate a concise summary
- Create presentation slides automatically
- Display results in a beautiful dark interface

## 🎯 For Hackathon Demo

**What to show:**
- Upload a sample meeting audio or paste a transcript
- Show the AI-generated summary
- Display the auto-generated slides
- Navigate through slides in the modal view

**Key Points:**
- Uses Gemini 3 Pro for intelligent summarization
- Automatically creates presentation-ready content
- Dark, modern UI
- Works with both audio and text input

## ⚠️ Troubleshooting

**"API key not found" error:**
- Make sure `.env` file exists in root directory
- Check that keys don't have extra spaces
- Restart server after adding keys

**Audio not working:**
- If using Hugging Face: Model might be loading (wait 10-30 seconds and try again)
- If using Google: Verify Speech-to-Text API is enabled
- Check API key has proper permissions
- Try a different audio format (MP3 works best)

**Summarization errors:**
- If using Hugging Face: Model might be loading (wait and retry)
- If using Google: Verify API key is valid and has quota remaining
- Try a shorter transcript first
- Check server logs for detailed error messages

## 🚢 Deployment

See README.md for full deployment instructions to Vercel, Railway, or Render.

