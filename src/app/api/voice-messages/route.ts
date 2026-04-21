import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET  /api/voice-messages?athlete_id=X  — list messages for a coach↔athlete pair
 * POST /api/voice-messages               — upload audio blob + create DB record
 * PATCH /api/voice-messages              — mark message as listened
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const athleteId = req.nextUrl.searchParams.get('athlete_id')
    if (!athleteId) return NextResponse.json({ error: 'athlete_id required' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('voice_messages')
      .select('*')
      .or(`coach_id.eq.${user.id},athlete_id.eq.${user.id}`)
      .or(`athlete_id.eq.${athleteId},coach_id.eq.${athleteId}`)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Generate signed URLs for each message
    const messages = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data ?? []).map(async (msg: any) => {
        const { data: signedUrl } = await supabase.storage
          .from('voice-messages')
          .createSignedUrl(msg.storage_path, 3600) // 1hr expiry
        return { ...msg, url: signedUrl?.signedUrl ?? null }
      })
    )

    return NextResponse.json({ messages })
  } catch (err) {
    console.error('Voice messages GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const form = await req.formData()
    const audio      = form.get('audio') as File | null
    const athleteId  = form.get('athlete_id') as string | null
    const durationStr = form.get('duration_secs') as string | null

    if (!audio || !athleteId) {
      return NextResponse.json({ error: 'audio and athlete_id required' }, { status: 400 })
    }

    // Enforce 60-second limit
    const duration = durationStr ? parseInt(durationStr) : null
    if (duration && duration > 65) {
      return NextResponse.json({ error: 'Voice messages are limited to 60 seconds' }, { status: 400 })
    }

    // Upload to Supabase Storage: voice-messages/{coach_id}/{timestamp}.webm
    const ext = audio.type.includes('mp4') ? 'mp4' : audio.type.includes('ogg') ? 'ogg' : 'webm'
    const storagePath = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('voice-messages')
      .upload(storagePath, audio, {
        contentType: audio.type,
        upsert: false,
      })

    if (uploadErr) {
      console.error('Storage upload error:', uploadErr)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Create DB record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: dbErr } = await (supabase as any)
      .from('voice_messages')
      .insert({
        coach_id:    user.id,
        athlete_id:  athleteId,
        storage_path: storagePath,
        duration_secs: duration,
      })
      .select()
      .single()

    if (dbErr) {
      // Clean up orphaned storage object
      await supabase.storage.from('voice-messages').remove([storagePath])
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    return NextResponse.json({ message: data })
  } catch (err) {
    console.error('Voice messages POST error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { message_id } = await req.json()
    if (!message_id) return NextResponse.json({ error: 'message_id required' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('voice_messages')
      .update({ listened_at: new Date().toISOString() })
      .eq('id', message_id)
      .eq('athlete_id', user.id) // only the athlete can mark listened

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Voice messages PATCH error:', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
