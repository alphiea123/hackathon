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

  const hfData = await hfResponse.json();
  
  let hfText = '';
  if (Array.isArray(hfData) && hfData[0] && hfData[0].generated_text) {
    hfText = hfData[0].generated_text;
  } else if (hfData.generated_text) {
    hfText = hfData.generated_text;
  } else if (typeof hfData === 'string') {
    hfText = hfData;
  } else {
    throw new Error('Unexpected response format from Hugging Face');
  }
  
  let hfJsonText = hfText.trim();
  if (hfJsonText.startsWith('```json')) {
    hfJsonText = hfJsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (hfJsonText.startsWith('```')) {
    hfJsonText = hfJsonText.replace(/```\n?/g, '');
  }
  
  const jsonMatch = hfJsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    hfJsonText = jsonMatch[0];
  }
  
  const hfParsed = JSON.parse(hfJsonText);
  
  if (!hfParsed.summary || !hfParsed.slides || !Array.isArray(hfParsed.slides)) {
    throw new Error('Invalid response format from Hugging Face');
  }
  
  return hfParsed;
}

// Generate with Google Gemini
async function generateWithGoogle(transcript, apiKey) {
  const apiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
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
    const apiError = await apiResponse.text();
    throw new Error(`Gemini API error: ${apiError}`);
  }

  const geminiData = await apiResponse.json();
  
  if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
    throw new Error('Invalid response from Gemini API');
  }
  
  const geminiText = geminiData.candidates[0].content.parts[0].text;
  
  let geminiJsonText = geminiText.trim();
  if (geminiJsonText.startsWith('```json')) {
    geminiJsonText = geminiJsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (geminiJsonText.startsWith('```')) {
    geminiJsonText = geminiJsonText.replace(/```\n?/g, '');
  }
  
  const geminiParsed = JSON.parse(geminiJsonText);
  
  if (!geminiParsed.summary || !geminiParsed.slides || !Array.isArray(geminiParsed.slides)) {
    throw new Error('Invalid response format from Gemini');
  }
  
  return geminiParsed;
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
    const transcribeError = await transcribeResponse.text();
    throw new Error(`Hugging Face API error: ${transcribeError}`);
  }

  const transcribeData = await transcribeResponse.json();
  
  if (typeof transcribeData === 'string') {
    return transcribeData;
  } else if (transcribeData.text) {
    return transcribeData.text;
  } else if (Array.isArray(transcribeData) && transcribeData[0] && transcribeData[0].text) {
    return transcribeData[0].text;
  } else if (transcribeData.chunks && Array.isArray(transcribeData.chunks)) {
    return transcribeData.chunks.map(chunk => chunk.text || chunk).join(' ');
  } else {
    throw new Error('Unexpected response format from Hugging Face: ' + JSON.stringify(transcribeData));
  }
}