import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com'

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Get environment variables
    const RAPID_API_KEY = Deno.env.get('RAPID_API_KEY')!
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    // 2. Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Parse request
    const { action, params = {} } = await req.json()

    // 4. Build RapidAPI URL based on action
    let endpoint = ''
    
    switch (action) {
      case 'list':
        // Get all exercises with pagination
        const limit = params.limit || 20
        const offset = params.offset || 0
        endpoint = `/exercises?limit=${limit}&offset=${offset}`
        break
        
      case 'search':
        // Search by name
        if (!params.name) {
          return new Response(
            JSON.stringify({ error: 'Search name required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        endpoint = `/exercises/name/${encodeURIComponent(params.name)}`
        break
        
      case 'byBodyPart':
        // Get exercises by body part
        if (!params.bodyPart) {
          return new Response(
            JSON.stringify({ error: 'Body part required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        endpoint = `/exercises/bodyPart/${encodeURIComponent(params.bodyPart)}`
        break
        
      case 'byTarget':
        // Get exercises by target muscle
        if (!params.target) {
          return new Response(
            JSON.stringify({ error: 'Target muscle required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        endpoint = `/exercises/target/${encodeURIComponent(params.target)}`
        break
        
      case 'byEquipment':
        // Get exercises by equipment
        if (!params.equipment) {
          return new Response(
            JSON.stringify({ error: 'Equipment required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        endpoint = `/exercises/equipment/${encodeURIComponent(params.equipment)}`
        break
        
      case 'byId':
        // Get single exercise by ID
        if (!params.id) {
          return new Response(
            JSON.stringify({ error: 'Exercise ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        endpoint = `/exercises/exercise/${params.id}`
        break
        
      case 'bodyPartList':
        // Get list of body parts
        endpoint = '/exercises/bodyPartList'
        break
        
      case 'targetList':
        // Get list of target muscles
        endpoint = '/exercises/targetList'
        break
        
      case 'equipmentList':
        // Get list of equipment
        endpoint = '/exercises/equipmentList'
        break
        
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 5. Call RapidAPI
    const rapidResponse = await fetch(`https://${RAPIDAPI_HOST}${endpoint}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    })

    if (!rapidResponse.ok) {
      console.error('RapidAPI error:', rapidResponse.status)
      return new Response(
        JSON.stringify({ error: 'Exercise API error' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await rapidResponse.json()

    // 6. Return response
    return new Response(
      JSON.stringify({ data }),
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