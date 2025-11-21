# Hugging Face API Setup Guide

This guide shows you how to use Hugging Face APIs instead of Google APIs for the Meeting Summarizer.

## Why Hugging Face?

- ✅ **Single API Key**: One key works for both transcription and summarization
- ✅ **Free Tier**: Generous free tier for hackathons
- ✅ **Open Source Models**: Access to state-of-the-art open source models
- ✅ **Easy Setup**: No complex cloud console setup needed

## Quick Setup

### 1. Get Your Hugging Face API Token

1. Visit [Hugging Face](https://huggingface.co/)
2. Sign up for a free account (or log in)
3. Go to [Settings > Access Tokens](https://huggingface.co/settings/tokens)
4. Click "New token"
5. Name it (e.g., "Meeting Summarizer")
6. Select "Read" permissions
7. Click "Generate token"
8. **Copy the token immediately** (you won't see it again!)

### 2. Add to Your .env File

Create or edit your `.env` file in the project root:

```env
# Hugging Face API (works for both summarization and transcription)
HUGGINGFACE_API_KEY=your_token_here

# Optional: Customize models (defaults work great)
# HF_SUMMARY_MODEL=mistralai/Mistral-7B-Instruct-v0.2
# HF_ASR_MODEL=openai/whisper-large-v2

# Server Configuration
PORT=3000
```

### 3. Run the App

```bash
npm install
npm start
```

That's it! The app will automatically use Hugging Face APIs.

## Available Models

### For Summarization (HF_SUMMARY_MODEL)

Popular options:
- `mistralai/Mistral-7B-Instruct-v0.2` (default) - Fast and accurate
- `meta-llama/Llama-2-7b-chat-hf` - Great for structured output
- `google/flan-t5-xxl` - Good for summarization tasks
- `facebook/bart-large-cnn` - Specialized for summarization

### For Audio Transcription (HF_ASR_MODEL)

Popular options:
- `openai/whisper-large-v2` (default) - Best accuracy
- `openai/whisper-base` - Faster, good accuracy
- `facebook/wav2vec2-base-960h` - Fast transcription
- `jonatasgrosman/wav2vec2-large-xlsr-53-english` - English-focused

## How It Works

The app automatically:
1. **Detects your API keys** - If `HUGGINGFACE_API_KEY` is present, it uses Hugging Face
2. **Falls back gracefully** - If Hugging Face fails, it tries Google APIs (if configured)
3. **Supports mixing** - You can use Hugging Face for one feature and Google for another

## Example .env Configurations

### Full Hugging Face Setup (Recommended)
```env
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
PORT=3000
```

### Mixed Setup (Hugging Face + Google)
```env
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
GEMINI_API_KEY=your_gemini_key
PORT=3000
```

### Custom Models
```env
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
HF_SUMMARY_MODEL=meta-llama/Llama-2-7b-chat-hf
HF_ASR_MODEL=openai/whisper-base
PORT=3000
```

## Troubleshooting

### "Model is loading" Error

Some models need to be loaded on first use. The app will automatically wait and retry. If it persists:
- Try a different model (e.g., `whisper-base` instead of `whisper-large-v2`)
- Wait a minute and try again

### Rate Limits

Hugging Face free tier has rate limits. If you hit them:
- Wait a few minutes between requests
- Consider upgrading to a paid plan for hackathons
- Use Google APIs as a fallback

### Model Not Found

Make sure the model name is correct. Check available models at:
- [Hugging Face Models](https://huggingface.co/models)

## API Costs

- **Free Tier**: 1,000 requests/month
- **Pro Tier**: $9/month for 10,000 requests
- **Enterprise**: Custom pricing

For hackathons, the free tier is usually sufficient!

## Need Help?

- [Hugging Face Documentation](https://huggingface.co/docs/api-inference)
- [Hugging Face Community](https://huggingface.co/community)
- Check server logs for detailed error messages

