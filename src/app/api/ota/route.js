import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
)

export async function GET() {
  return NextResponse.json({ 
    status: 'online (via db)', 
    mode: 'broker',
    device_id: 'pi-posture-001' 
  })
}

export async function POST(req) {
  try {
    const { action } = await req.json() 
    const commandType = action === 'update' ? 'UPDATE' : 'RESTART'
    
    console.log(`[OTA] Queuing command: ${commandType} for pi-posture-001`)

    const { data, error } = await supabase
      .from('device_commands')
      .insert([
        { 
          device_id: 'pi-posture-001', 
          command: commandType,
          status: 'PENDING'
        }
      ])
      .select()

    if (error) {
      console.error('Supabase Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Command ${commandType} queued successfully. Pi will execute shortly.` 
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    )
  }
}