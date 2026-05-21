import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, name } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Missing email', message: 'Email is required.' },
        { status: 400 },
      )
    }

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email', message: 'Please enter a valid email address.' },
        {
          status: 400,
        },
      )
    }

    const payload = await getPayload({ config: configPromise })

    // Check for duplicate
    const existing = await payload.find({
      collection: 'waitlist',
      where: { email: { equals: email } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      return NextResponse.json(
        { error: 'Duplicate email', message: 'This email is already on the waitlist.' },
        { status: 409 },
      )
    }

    // Create waitlist entry
    await payload.create({
      collection: 'waitlist',
      data: {
        email,
        name: name && typeof name === 'string' ? name.trim() : undefined,
      },
    })

    return NextResponse.json({ success: true, message: 'Check your email' }, { status: 201 })
  } catch (error: unknown) {
    console.error('[Waitlist API Error]:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: 'Server error', message }, { status: 500 })
  }
}
