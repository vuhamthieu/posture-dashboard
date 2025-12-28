import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { posture_type, confidence, user_email } = body

    if (!posture_type || confidence === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: posture_type, confidence' },
        { status: 400 }
      )
    }

    if (!user_email) {
      return NextResponse.json(
        { error: 'Missing user_email' },
        { status: 400 }
      )
    }

    // Create admin client with SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Find user by email using admin client
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (userError) {
      console.error('Auth error:', userError)
      return NextResponse.json(
        { error: 'Failed to authenticate' },
        { status: 500 }
      )
    }

    const user = users.find(u => u.email === user_email)
    
    if (!user) {
      return NextResponse.json(
        { error: `User not found: ${user_email}` },
        { status: 404 }
      )
    }

    // Insert posture record
    const { data, error } = await supabaseAdmin
      .from('posture_records')
      .insert({
        user_id: user.id,
        posture_type: posture_type.toLowerCase(),
        confidence: parseFloat(confidence),
        keypoints: {}
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save posture record', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Posture record saved',
      data: {
        id: data.id,
        posture_type: data.posture_type,
        confidence: data.confidence,
        created_at: data.created_at
      }
    }, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    message: 'Posture API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
}