import { createClient } from '@/lib/supabase/route'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json()
    const { posture_type, confidence, user_email } = body

    // Validate required fields
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

    // Create Supabase client
    const supabase = await createClient()
    
    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    
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
    const { data, error } = await supabase
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

    // Success response
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

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'online',
    message: 'Posture API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: 'Send posture data',
      GET: 'Health check'
    }
  })
}