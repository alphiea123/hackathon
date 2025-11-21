require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Determine which API provider to use (defaults to 'huggingface' if HF key is present, else 'google')
const USE_HUGGINGFACE = !!process.env.HUGGINGFACE_API_KEY;
const USE_GOOGLE = !!process.env.GEMINI_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    }
});

// Initialize Gemini
let genAI;
try {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️  GEMINI_API_KEY not found in environment variables');
    } else {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
} catch (error) {
    console.error('Error initializing Gemini:', error);
}

// Speech-to-Text function - uses Hugging Face (Google Cloud removed)
async function transcribeAudio(filePath, mimeType) {
    if (!process.env.HUGGINGFACE_API_KEY) {
        throw new Error('Hugging Face API key not configured. Please add HUGGINGFACE_API_KEY to your .env file for audio transcription. Alternatively, you can paste the transcript directly.');
    }
    
    return await transcribeWithHuggingFace(filePath, mimeType);
}

// Transcribe using Hugging Face Inference API (Whisper model)
async function transcribeWithHuggingFace(filePath, mimeType) {
    if (!process.env.HUGGINGFACE_API_KEY) {
        throw new Error('Hugging Face API key not configured');
    }

    try {
        // Read audio file as buffer
        const audioBuffer = fs.readFileSync(filePath);
        
        // Use OpenAI Whisper model via Hugging Face
        // You can also use: "facebook/wav2vec2-base-960h" or other ASR models
        const model = process.env.HF_ASR_MODEL || "openai/whisper-large-v2";
        
        const response = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                },
                body: audioBuffer
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            // If model is loading, wait and retry
            if (response.status === 503) {
                const retryAfter = response.headers.get('retry-after') || 10;
                console.log(`Model is loading, waiting ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return transcribeWithHuggingFace(filePath, mimeType); // Retry once
            }
            throw new Error(`Hugging Face API error: ${errorText}`);
        }

        const data = await response.json();
        
        // Handle different response formats
        if (typeof data === 'string') {
            return data;
        } else if (data.text) {
            return data.text;
        } else if (Array.isArray(data) && data[0] && data[0].text) {
            return data[0].text;
        } else if (data.chunks && Array.isArray(data.chunks)) {
            // Some models return chunks
            return data.chunks.map(chunk => chunk.text || chunk).join(' ');
        } else {
            throw new Error('Unexpected response format from Hugging Face: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Hugging Face transcription error:', error);
        throw error;
    }
}


// Generate summary and slides - supports both Hugging Face and Google Gemini
async function generateSummaryAndSlides(transcript) {
    // Try Hugging Face first if API key is available
    if (process.env.HUGGINGFACE_API_KEY) {
        try {
            return await generateWithHuggingFace(transcript);
        } catch (error) {
            console.warn('Hugging Face generation failed, trying Google...', error.message);
            // Fall back to Google if available
            if (genAI) {
                return await generateWithGoogle(transcript);
            }
            throw error;
        }
    }
    
    // Use Google if Hugging Face is not available
    if (genAI) {
        return await generateWithGoogle(transcript);
    }
    
    throw new Error('No AI API configured. Please add HUGGINGFACE_API_KEY or GEMINI_API_KEY to your .env file');
}

// Generate summary and slides using Hugging Face Inference API
async function generateWithHuggingFace(transcript) {
    if (!process.env.HUGGINGFACE_API_KEY) {
        throw new Error('Hugging Face API key not configured');
    }

    // Use a text generation model - you can change this to other models
    // Options: "mistralai/Mistral-7B-Instruct-v0.2", "meta-llama/Llama-2-7b-chat-hf", "google/flan-t5-xxl"
    const model = process.env.HF_SUMMARY_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";
    
    const prompt = `You are an expert meeting summarizer. Analyze the following meeting transcript and create:

1. A concise summary (2-3 paragraphs) that captures the main points, decisions, and action items.

2. A structured slide presentation with 5-8 slides. Each slide should have:
   - A clear, descriptive title
   - 3-5 bullet points with key information

Format your response as JSON with this exact structure:
{
  "summary": "Your concise summary here...",
  "slides": [
    {
      "title": "Slide Title",
      "points": ["Point 1", "Point 2", "Point 3"]
    }
  ]
}

Meeting Transcript:
${transcript}

Respond ONLY with valid JSON, no additional text or markdown formatting.`;

    try {
        const response = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 2000,
                        temperature: 0.7,
                        return_full_text: false
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Hugging Face API error: ${errorText}`);
        }

        const data = await response.json();
        
        // Extract text from response
        let text = '';
        if (Array.isArray(data) && data[0] && data[0].generated_text) {
            text = data[0].generated_text;
        } else if (data.generated_text) {
            text = data.generated_text;
        } else if (typeof data === 'string') {
            text = data;
        } else {
            throw new Error('Unexpected response format from Hugging Face');
        }
        
        // Clean up the response (remove markdown code blocks if present)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '');
        }
        
        // Try to extract JSON if it's embedded in text
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonText = jsonMatch[0];
        }
        
        const parsed = JSON.parse(jsonText);
        
        // Validate structure
        if (!parsed.summary || !parsed.slides || !Array.isArray(parsed.slides)) {
            throw new Error('Invalid response format from Hugging Face');
        }
        
        return parsed;
    } catch (error) {
        console.error('Hugging Face API error:', error);
        if (error.message.includes('JSON')) {
            throw new Error('Failed to parse AI response. Please try again.');
        }
        throw new Error(`AI generation failed: ${error.message}`);
    }
}

// Generate summary and slides using Google Gemini
async function generateWithGoogle(transcript) {
    if (!genAI) {
        throw new Error('Gemini API not initialized. Please check your GEMINI_API_KEY in .env');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `You are an expert meeting summarizer. Analyze the following meeting transcript and create:

1. A concise summary (2-3 paragraphs) that captures the main points, decisions, and action items.

2. A structured slide presentation with 5-8 slides. Each slide should have:
   - A clear, descriptive title
   - 3-5 bullet points with key information

Format your response as JSON with this exact structure:
{
  "summary": "Your concise summary here...",
  "slides": [
    {
      "title": "Slide Title",
      "points": ["Point 1", "Point 2", "Point 3"]
    }
  ]
}

Meeting Transcript:
${transcript}

Respond ONLY with valid JSON, no additional text or markdown formatting.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean up the response (remove markdown code blocks if present)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '');
        }
        
        const parsed = JSON.parse(jsonText);
        
        // Validate structure
        if (!parsed.summary || !parsed.slides || !Array.isArray(parsed.slides)) {
            throw new Error('Invalid response format from Gemini');
        }
        
        return parsed;
    } catch (error) {
        console.error('Gemini API error:', error);
        if (error.message.includes('JSON')) {
            throw new Error('Failed to parse AI response. Please try again.');
        }
        throw new Error(`AI generation failed: ${error.message}`);
    }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Meeting Summarizer API is running' });
});

// Transcribe audio endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }

    try {
        const filePath = req.file.path;
        const mimeType = req.file.mimetype;
        
        const transcript = await transcribeAudio(filePath, mimeType);
        
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        
        res.json({ transcript });
    } catch (error) {
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        console.error('Transcription error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to transcribe audio file',
            hint: 'Make sure HUGGINGFACE_API_KEY is set in your .env file for audio transcription, or paste the transcript directly'
        });
    }
});

// Summarize transcript endpoint
app.post('/api/summarize', async (req, res) => {
    const { transcript } = req.body;

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
        return res.status(400).json({ error: 'Transcript is required' });
    }

    if (transcript.length < 50) {
        return res.status(400).json({ error: 'Transcript is too short. Please provide at least 50 characters.' });
    }

    try {
        const result = await generateSummaryAndSlides(transcript);
        res.json(result);
    } catch (error) {
        console.error('Summarization error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to generate summary',
            hint: 'Make sure HUGGINGFACE_API_KEY or GEMINI_API_KEY is set in your .env file'
        });
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        error: error.message || 'Internal server error' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Meeting Summarizer server running on http://localhost:${PORT}`);
    console.log(`📝 API Configuration:`);
    
    // Check for API keys
    if (process.env.HUGGINGFACE_API_KEY) {
        console.log(`✅ Using Hugging Face API for summarization and transcription`);
        if (process.env.HF_SUMMARY_MODEL) {
            console.log(`   Summary Model: ${process.env.HF_SUMMARY_MODEL}`);
        }
        if (process.env.HF_ASR_MODEL) {
            console.log(`   ASR Model: ${process.env.HF_ASR_MODEL}`);
        }
    } else if (process.env.GEMINI_API_KEY) {
        console.log(`✅ Using Google Gemini API for summarization`);
    } else {
        console.warn('⚠️  Warning: No summarization API key found (HUGGINGFACE_API_KEY or GEMINI_API_KEY)');
    }
    
    if (process.env.HUGGINGFACE_API_KEY) {
        console.log(`✅ Using Hugging Face API for transcription`);
    } else {
        console.warn('⚠️  Warning: HUGGINGFACE_API_KEY not found - audio transcription will not work. Users can still paste transcripts directly.');
    }
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

