# Meeting Summarizer with Slides

A hackathon-ready web application that converts meeting transcripts or audio into concise summaries and beautiful HTML presentation slides using Google Gemini 3 Pro.

## Features

- 🎤 **Audio Upload**: Upload audio files (MP3, WAV, M4A) for automatic transcription
- 📝 **Text Input**: Paste or type meeting transcripts directly
- 🤖 **AI-Powered**: Uses Gemini 3 Pro for intelligent summarization
- 📊 **Auto-Slides**: Automatically generates presentation-ready HTML slides
- ✏️ **Edit Slides**: Edit slide titles and bullet points before exporting
- 📥 **Export Options**: Export presentations as HTML or PDF
- 🌙 **Dark Theme**: Beautiful, modern dark interface

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up API Keys

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Then edit `.env` and add your API keys:

#### Option 1: Hugging Face API (Recommended for Hackathon)

**Hugging Face API Key (Works for both summarization and transcription)**
1. Go to [Hugging Face](https://huggingface.co/)
2. Sign up or log in
3. Go to your [Settings > Access Tokens](https://huggingface.co/settings/tokens)
4. Create a new token with "Read" permissions
5. Copy the token and paste it in `.env`:
   ```
   HUGGINGFACE_API_KEY=your_huggingface_token_here
   ```

**Optional: Custom Models (Advanced)**
You can specify custom models in `.env`:
```
HF_SUMMARY_MODEL=mistralai/Mistral-7B-Instruct-v0.2
HF_ASR_MODEL=openai/whisper-large-v2
```

#### Option 2: Google Gemini API (For Summarization)

**Gemini API Key**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in `.env`:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

**Note:** 
- For audio transcription, you'll need `HUGGINGFACE_API_KEY` (Google Cloud Speech-to-Text is not included)
- You can use Hugging Face for both features, or Gemini for summarization + Hugging Face for transcription

### 3. Run the Application

```bash
npm start
```

The app will be available at `http://localhost:3000`

## Deployment

### Deploy to Cloudflare Pages (Recommended) ⭐

**Perfect for hackathons - Free, fast, and easy!**

See [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md) for detailed instructions.

Quick steps:
1. Push your code to GitHub
2. Connect to Cloudflare Pages
3. Set build output to `public`
4. Add environment variables (`GEMINI_API_KEY` and/or `HUGGINGFACE_API_KEY`)
5. Deploy!

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Add environment variables in Vercel dashboard:
   - Go to your project settings
   - Add `GEMINI_API_KEY` and/or `HUGGINGFACE_API_KEY`

### Deploy to Railway

1. Connect your GitHub repository to Railway
2. Railway will auto-detect Node.js
3. Add environment variables in Railway dashboard:
   - `GEMINI_API_KEY`
   - `HUGGINGFACE_API_KEY` (for audio transcription)

### Deploy to Render

1. Create a new Web Service
2. Connect your repository
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables in Render dashboard

## Project Structure

```
hackathon/
├── public/
│   ├── index.html          # Main UI
│   ├── styles.css          # Dark theme styling
│   └── script.js          # Frontend logic
├── server.js               # Express backend
├── .env                    # API keys (not in git)
├── .env.example            # Template for API keys
├── package.json            # Dependencies
└── README.md               # This file
```

## How It Works

1. **Input**: User uploads audio file or pastes transcript
2. **Transcription**: If audio, Google Speech-to-Text converts to text
3. **Processing**: Gemini 3 Pro analyzes transcript and generates:
   - Concise summary
   - Key points and main ideas
   - Slide-ready bullet points
4. **Output**: Beautiful HTML presentation with navigation

## API Endpoints

- `POST /api/transcribe` - Transcribe audio file to text
- `POST /api/summarize` - Generate summary and slides from transcript

## Troubleshooting

**"API key not found" error:**
- Make sure `.env` file exists in the root directory
- Check that API keys are correctly formatted (no extra spaces)
- Restart the server after adding API keys

**Audio transcription not working:**
- Verify Google Cloud Speech-to-Text API is enabled
- Check API key permissions
- Ensure audio file format is supported (MP3, WAV, M4A)

**Gemini API errors:**
- Verify API key is valid and has quota remaining
- Check that you're using the correct model name

## License

MIT

