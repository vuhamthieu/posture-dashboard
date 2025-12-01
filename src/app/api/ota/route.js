import { NextResponse } from 'next/server'

const PI_IP = process.env.PI_TAILSCALE_IP || '100.122.235.16'
const PI_PORT = process.env.PI_API_PORT || '8080'
const UPDATE_SECRET = process.env.UPDATE_SECRET || 'posture_secret_2024'

export async function GET() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(`http://${PI_IP}:${PI_PORT}/health`, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Pi returned error', status: response.status },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
    
  } catch (error) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Pi connection timeout', offline: true },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { error: 'Cannot reach Pi', details: error.message, offline: true },
      { status: 503 }
    )
  }
}

export async function POST() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) 
    
    const response = await fetch(`http://${PI_IP}:${PI_PORT}/update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPDATE_SECRET}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }
    
    return NextResponse.json(data)
    
  } catch (error) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Update timeout (>30s)', hint: 'Update may still be in progress' },
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { error: 'Update request failed', details: error.message },
      { status: 500 }
    )
  }
}