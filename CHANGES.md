# Changes for Cloudflare Deployment

## Summary

The codebase has been updated to:
1. ✅ Keep Google Gemini Pro API support
2. ✅ Remove Google Cloud Speech-to-Text dependencies
3. ✅ Add Cloudflare Pages deployment support
4. ✅ Simplify setup (no Google Cloud keys needed)

## What Changed

### Removed
- ❌ Google Cloud Speech-to-Text API (`@google-cloud/speech` package)
- ❌ `GOOGLE_CLOUD_API_KEY` requirement
- ❌ Google Cloud service account setup

### Kept
- ✅ Google Gemini Pro API (`@google/generative-ai` package)
- ✅ `GEMINI_API_KEY` support
- ✅ Hugging Face API support (for transcription)

### Added
- ✅ Cloudflare Pages Functions (`functions/[[path]].js`)
- ✅ Cloudflare configuration files (`wrangler.toml`, `.cloudflarerc`)
- ✅ Cloudflare deployment guide (`CLOUDFLARE_DEPLOY.md`)

## API Key Requirements

### Minimum Setup (Gemini Only)
```env
GEMINI_API_KEY=your_gemini_key_here
```
- ✅ Works for summarization
- ⚠️ Audio transcription requires Hugging Face key

### Full Setup (Gemini + Audio)
```env
GEMINI_API_KEY=your_gemini_key_here
HUGGINGFACE_API_KEY=your_hf_token_here
```
- ✅ Works for summarization (Gemini)
- ✅ Works for audio transcription (Hugging Face)

### Alternative (Hugging Face Only)
```env
HUGGINGFACE_API_KEY=your_hf_token_here
```
- ✅ Works for both summarization and transcription

## Deployment

### Local Development
```bash
npm install
npm start
```
Uses Express server (`server.js`)

### Cloudflare Pages
1. Push to GitHub
2. Connect to Cloudflare Pages
3. Set build output: `public`
4. Add environment variables
5. Deploy!

See `CLOUDFLARE_DEPLOY.md` for detailed instructions.

## File Structure

```
hackathon/
├── public/              # Static files (HTML, CSS, JS)
├── functions/           # Cloudflare Pages Functions
│   └── [[path]].js     # API routes handler
├── server.js           # Express server (local dev)
├── wrangler.toml       # Cloudflare config
├── .cloudflarerc       # Cloudflare project config
└── CLOUDFLARE_DEPLOY.md # Deployment guide
```

## How It Works

### Local Development
- Express server handles all routes
- Uses `server.js` for API endpoints
- File uploads work normally

### Cloudflare Pages
- Static files served from `public/`
- API routes handled by `functions/[[path]].js`
- Uses Cloudflare's edge network
- Environment variables from Cloudflare dashboard

## Benefits

1. **Simpler Setup**: No Google Cloud Console needed
2. **Free Hosting**: Cloudflare Pages is free
3. **Fast**: Edge network for global performance
4. **Easy Deployment**: Connect GitHub, deploy automatically
5. **Flexible**: Choose Gemini, Hugging Face, or both

## Migration Notes

If you had Google Cloud keys before:
- Remove `GOOGLE_CLOUD_API_KEY` from `.env`
- Add `HUGGINGFACE_API_KEY` if you need audio transcription
- Keep `GEMINI_API_KEY` for summarization

The app will work the same way, just with different APIs!

