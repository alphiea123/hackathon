# Deploy to Cloudflare Pages

This guide shows you how to deploy the Meeting Summarizer to Cloudflare Pages from GitHub.

## Prerequisites

- GitHub account
- Cloudflare account (free)
- Google Gemini API key (or Hugging Face API key)

## Step 1: Push to GitHub

1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/meeting-summarizer.git
   git push -u origin main
   ```

## Step 2: Deploy to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** in the sidebar
3. Click **Create a project**
4. Select **Connect to Git**
5. Choose your GitHub repository
6. Configure build settings:
   - **Framework preset**: None (or Static)
   - **Build command**: (leave empty)
   - **Build output directory**: `public`
   - **Root directory**: `/` (root)

7. Click **Save and Deploy**

## Step 3: Add Environment Variables

1. In your Cloudflare Pages project, go to **Settings** > **Environment Variables**
2. Add the following variables:

   **Required (choose one):**
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - OR `HUGGINGFACE_API_KEY` - Your Hugging Face API token

   **Optional:**
   - `HF_SUMMARY_MODEL` - Custom Hugging Face model for summarization (default: `mistralai/Mistral-7B-Instruct-v0.2`)
   - `HF_ASR_MODEL` - Custom Hugging Face model for transcription (default: `openai/whisper-large-v2`)

3. Make sure to add them to **Production** environment
4. Click **Save**

## Step 4: Update Build Settings (Important!)

Since we're using Cloudflare Functions, you need to ensure the build output is correct:

1. Go to **Settings** > **Builds & deployments**
2. Set:
   - **Build output directory**: `public`
   - **Root directory**: `/` (root of your repo)

The `functions/` directory will be automatically detected by Cloudflare Pages.

## Step 5: Redeploy

After adding environment variables, you need to redeploy:

1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Retry deployment**

Or push a new commit to trigger automatic deployment.

## How It Works

- **Static files** (HTML, CSS, JS) are served from the `public/` directory
- **API routes** (`/api/*`) are handled by Cloudflare Functions in `functions/[[path]].js`
- **Environment variables** are securely stored in Cloudflare and accessible in functions

## Custom Domain (Optional)

1. Go to **Custom domains** in your Pages project
2. Click **Set up a custom domain**
3. Follow the instructions to add your domain

## Troubleshooting

### "Function not found" errors
- Make sure `functions/[[path]].js` exists in your repository
- Check that the file is committed to Git
- Verify the build output directory is set to `public`

### API errors
- Verify environment variables are set correctly
- Check that they're added to the **Production** environment
- Look at the deployment logs for detailed error messages

### Audio transcription not working
- Make sure `HUGGINGFACE_API_KEY` is set
- The model might be loading (wait 10-30 seconds and try again)
- Check the browser console and network tab for errors

## Local Development

To test locally with Cloudflare Pages:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Run locally
wrangler pages dev public --functions functions
```

## Continuous Deployment

Cloudflare Pages automatically deploys on every push to your main branch. You can:
- View deployments in the **Deployments** tab
- Roll back to previous deployments
- Preview deployments before going live

## Cost

Cloudflare Pages is **free** for:
- Unlimited requests
- 500 builds per month
- Custom domains
- DDoS protection

Perfect for hackathons! 🚀

