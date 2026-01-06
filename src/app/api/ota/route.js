import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function getLatestVersionFromGitHub() {
  try {
    const response = await fetch(
      'https://api.github.com/repos/vuhamthieu/smart-posture-assistant/commits?per_page=1',
      { headers: { 'User-Agent': 'posture-bot' } }
    )
    if (!response.ok) return null
    const data = await response.json()
    return data[0]?.sha?.slice(0, 7) || null
  } catch (error) {
    console.error('GitHub API Error:', error)
    return null
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const deviceId = searchParams.get('deviceId')
  const checkVersion = searchParams.get('checkVersion') === '1'

  if (!deviceId) {
    return NextResponse.json({ error: 'Thiếu Device ID' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  try {
    const { data: device } = await supabase
      .from('device_configs')
      .select('device_id, current_version')
      .eq('device_id', deviceId)
      .eq('user_id', user.id)
      .single()

    if (!device) {
      return NextResponse.json({ error: 'Thiết bị không tồn tại hoặc không thuộc về bạn' }, { status: 404 })
    }

    if (checkVersion) {
      const latestVersion = await getLatestVersionFromGitHub()
      const currentVersion = device.current_version || 'unknown'
      const hasUpdate = latestVersion && currentVersion !== 'unknown' && latestVersion !== currentVersion

      return NextResponse.json({ 
        device_id: deviceId,
        current_version: currentVersion,
        latest_version: latestVersion || 'unknown',
        has_update: hasUpdate || false
      })
    }

    const { data: pendingCommands } = await supabase
      .from('device_commands')
      .select('*')
      .eq('device_id', deviceId)
      .in('status', ['PENDING', 'EXECUTING'])
      .order('created_at', { ascending: false })

    return NextResponse.json({ 
      status: 'online', 
      mode: 'broker',
      device_id: deviceId,
      current_version: device.current_version || 'unknown',
      pending_commands: pendingCommands || []
    })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, deviceId } = body

    if (!deviceId || !action) {
      return NextResponse.json({ error: 'Thiếu thông tin (action hoặc deviceId)' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: device } = await supabase
      .from('device_configs')
      .select('device_id')
      .eq('device_id', deviceId)
      .eq('user_id', user.id)
      .single()

    if (!device) {
      return NextResponse.json({ error: 'Bạn không có quyền điều khiển thiết bị này' }, { status: 403 })
    }
    
    const commandToSend = action; 

    console.log(`[OTA] Queuing command: ${commandToSend} for ${deviceId}`)

    const { data, error } = await supabase
      .from('device_commands')
      .insert([
        { 
          device_id: deviceId,  
          command: commandToSend,
          status: 'PENDING',
          payload: { triggered_by: user.email }
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Đã gửi lệnh ${commandToSend} thành công.`,
      command_id: data.id
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    )
  }
}