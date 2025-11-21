// Cloudflare Pages Function - handles all API routes
// This file makes the app work on Cloudflare Pages

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Handle static files (served by Cloudflare Pages automatically)
  if (url.pathname.startsWith('/api/')) {
    return handleAPIRequest(request, env, url);
  }
  
  // For non-API routes, let Cloudflare Pages handle it
  return context.next();
}

async function handleAPIRequest(request, env, url) {
  const path = url.pathname;
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Health check
    if (path === '/api/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok', message: 'Meeting Summarizer API is running' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Summarize endpoint
    if (path === '/api/summarize' && request.method === 'POST') {
      const { transcript } = await request.json();
      
      if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Transcript is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (transcript.length < 50) {
        return new Response(
          JSON.stringify({ error: 'Transcript is too short. Please provide at least 50 characters.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Use Gemini or Hugging Face
      const result = await generateSummaryAndSlides(transcript, env);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Transcribe endpoint (requires file upload - handled differently on Cloudflare)
    if (path === '/api/transcribe' && request.method === 'POST') {
      const formData = await request.formData();
      const audioFile = formData.get('audio');
      
      if (!audioFile) {
        return new Response(
          JSON.stringify({ error: 'No audio file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!env.HUGGINGFACE_API_KEY) {
        return new Response(
          JSON.stringify({ 
            error: 'Hugging Face API key not configured',
            hint: 'Please add HUGGINGFACE_API_KEY to your Cloudflare environment variables, or paste the transcript directly'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Convert file to array buffer for Cloudflare
      const arrayBuffer = await audioFile.arrayBuffer();
      
      const transcript = await transcribeWithHuggingFace(arrayBuffer, audioFile.type, env.HUGGINGFACE_API_KEY, env.HF_ASR_MODEL);
      
      return new Response(
        JSON.stringify({ transcript }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Generate summary and slides
async function generateSummaryAndSlides(transcript, env) {
  // Try Hugging Face first if available
  if (env.HUGGINGFACE_API_KEY) {
    try {
      return await generateWithHuggingFace(transcript, env.HUGGINGFACE_API_KEY, env.HF_SUMMARY_MODEL);
    } catch (error) {
      console.warn('Hugging Face generation failed, trying Gemini...', error.message);
      if (env.GEMINI_API_KEY) {
        return await generateWithGoogle(transcript, env.GEMINI_API_KEY);
      }
      throw error;
    }
  }
  
  // Use Gemini if available
  if (env.GEMINI_API_KEY) {
    return await generateWithGoogle(transcript, env.GEMINI_API_KEY);
  }
  
  throw new Error('No AI API configured. Please add HUGGINGFACE_API_KEY or GEMINI_API_KEY');
}

// Generate with Hugging Face
async function generateWithHuggingFace(transcript, apiKey, model = 'mistralai/Mistral-7B-Instruct-v0.2') {
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

  const hfResponse = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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

  if (!hfResponse.ok) {
    const errorText = await hfResponse.text();
    throw new Error(`Hugging Face API error: ${errorText}`);
  }

  const data = await hfResponse.json();
  
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
  
  let jsonText = text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/g, '');
  }
  
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }
  
  const parsed = JSON.parse(jsonText);
  
  if (!parsed.summary || !parsed.slides || !Array.isArray(parsed.slides)) {
    throw new Error('Invalid response format from Hugging Face');
  }
  
  return parsed;
}

// Generate with Google Gemini
async function generateWithGoogle(transcript, apiKey) {
  // Use fetch to call Gemini API directly (Cloudflare-compatible)
  const apiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert meeting summarizer. Analyze the following meeting transcript and create:

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

Respond ONLY with valid JSON, no additional text or markdown formatting.`
          }]
        }]
      })
    }
  );

  if (!apiResponse.ok) {
    const error = await apiResponse.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await apiResponse.json();
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Invalid response from Gemini API');
  }
  
  const text = data.candidates[0].content.parts[0].text;
  
  let jsonText = text.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\n?/g, '');
  }
  
  const parsed = JSON.parse(jsonText);
  
  if (!parsed.summary || !parsed.slides || !Array.isArray(parsed.slides)) {
    throw new Error('Invalid response format from Gemini');
  }
  
  return parsed;
}

// Transcribe with Hugging Face
async function transcribeWithHuggingFace(audioArrayBuffer, mimeType, apiKey, modelOverride) {
  const model = modelOverride || 'openai/whisper-large-v2';
  
  const transcribeResponse = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: audioArrayBuffer
    }
  );

  if (!transcribeResponse.ok) {
    if (transcribeResponse.status === 503) {
      const retryAfter = transcribeResponse.headers.get('retry-after') || 10;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return transcribeWithHuggingFace(audioArrayBuffer, mimeType, apiKey, modelOverride);
    }
    const errorText = await transcribeResponse.text();
    throw new Error(`Hugging Face API error: ${errorText}`);
  }

  const data = await transcribeResponse.json();
  
  if (typeof data === 'string') {
    return data;
  } else if (data.text) {
    return data.text;
  } else if (Array.isArray(data) && data[0] && data[0].text) {
    return data[0].text;
  } else if (data.chunks && Array.isArray(data.chunks)) {
    return data.chunks.map(chunk => chunk.text || chunk).join(' ');
  } else {
    throw new Error('Unexpected response format from Hugging Face: ' + JSON.stringify(data));
  }
}