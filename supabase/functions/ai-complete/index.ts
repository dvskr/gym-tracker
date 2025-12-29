import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Get environment variables
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 2. Authenticate user using Service Role client
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    // Verify the JWT token using service role client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser()
    
    if (authError || !user) {
      console.error('JWT verification failed:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token',
          details: authError?.message || 'No user found'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Rate limiting (check user's daily usage)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier, ai_requests_today, ai_requests_today_date')
      .eq('id', user.id)
      .single()

    const today = new Date().toISOString().split('T')[0]
    let requestsToday = profile?.ai_requests_today || 0
    
    // Reset counter if new day
    if (profile?.ai_requests_today_date !== today) {
      requestsToday = 0
    }

    const dailyLimit = profile?.subscription_tier === 'premium' ? 100 : 10
    
    if (requestsToday >= dailyLimit) {
      return new Response(
        JSON.stringify({ 
          error: 'rate_limit_exceeded',
          message: `Daily limit reached (${requestsToday}/${dailyLimit})`,
          used: requestsToday,
          limit: dailyLimit,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Parse request body
    const { messages, options = {} } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if streaming is requested
    const streaming = options.stream === true

    // 5. Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: Math.min(options.maxTokens || 500, 1000),
        stream: streaming,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}))
      console.error('OpenAI API error:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        error: errorData,
      })
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API error',
          details: errorData.error?.message || 'Unknown error',
          status: openaiResponse.status,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update usage counter (same for streaming and non-streaming)
    await supabaseAdmin
      .from('profiles')
      .update({ 
        ai_requests_today: requestsToday + 1,
        ai_requests_today_date: today,
      })
      .eq('id', user.id)

    // Handle streaming response
    if (streaming) {
      return new Response(openaiResponse.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Usage-Updated': 'true',
          'X-Requests-Used': String(requestsToday + 1),
          'X-Requests-Limit': String(dailyLimit),
        },
      })
    }

    // Non-streaming response
    const data = await openaiResponse.json()

    // 7. Return response
    return new Response(
      JSON.stringify({
        content: data.choices[0]?.message?.content || '',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        limits: {
          used: requestsToday + 1,
          limit: dailyLimit,
          remaining: dailyLimit - requestsToday - 1,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
