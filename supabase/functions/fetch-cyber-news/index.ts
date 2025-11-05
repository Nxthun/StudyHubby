// supabase/functions/fetch-cyber-news/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// This securely gets the key you will save in the Supabase dashboard
const GEMINI_API_KEY = Deno.env.get('AIzaSyD30TR47W9XVbmSlwMGK4g1mi5D1mRfXg8')
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`

// All the prompt logic now lives on the server, not in your HTML
const cyberSystemPrompt = `You are a professional cybersecurity research assistant.
1.  Find one significant and reputable cybersecurity news article, report, or analysis published within the last two weeks of the current date. Prioritize sources from major technology news outlets (e.g., Wired, ZDNet, TechCrunch, Ars Technica), established cybersecurity research firms (e.g., Mandiant, CrowdStrike, Palo Alto Networks), or academic institutions.
2.  Provide a concise summary highlighting 2-3 key points.
3.  Provide the direct URL to the article.
4.  Your response MUST be plain text, suitable for a .txt file.
5.  Format the response exactly as follows:
Summary:
- [Key point 1]
- [Key point 2]
- [Key point 3 (if applicable)]

Source URL:
[Direct URL to the article]`

const cyberUserQuery = "Find a single, reputable cybersecurity news article from within the last 14 days and summarize it.";

serve(async (req) => {
  // This handles the CORS preflight request from your GitHub Pages site
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // This is the payload to send to Gemini
    const geminiPayload = {
      contents: [{ parts: [{ text: cyberUserQuery }] }],
      tools: [{ "google_search": {} }], 
      systemInstruction: {
        parts: [{ text: cyberSystemPrompt }]
      },
    }

    // Call the Gemini API from the server
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Gemini API Error: ${response.status} ${errorBody}`)
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      const errorReason = result.candidates?.[0]?.finishReason || "No content returned";
      throw new Error(`API returned no text. Reason: ${errorReason}`);
    }

    // Return the generated text to your website
    return new Response(
      JSON.stringify({ text: text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Return any errors to your website
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
