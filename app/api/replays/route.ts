import { NextResponse } from 'next/server'
import { mkdir, readdir, writeFile } from 'fs/promises'
import { join } from 'path'

const REPLAYS_DIR = join(process.cwd(), 'data', 'replays')

export async function GET() {
  try {
    const entries = await readdir(REPLAYS_DIR)
    const filenames = entries.filter((f) => f.endsWith('.json'))
    return NextResponse.json({ filenames })
  } catch {
    return NextResponse.json({ filenames: [] })
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('id' in body) ||
    !('createdAt' in body) ||
    !('steps' in body) ||
    !('finalState' in body)
  ) {
    return NextResponse.json({ error: 'Missing required replay fields' }, { status: 400 })
  }

  try {
    await mkdir(REPLAYS_DIR, { recursive: true })
    const filename = `${Date.now()}.json`
    await writeFile(join(REPLAYS_DIR, filename), JSON.stringify(body, null, 2), 'utf-8')
    return NextResponse.json({ success: true, filename })
  } catch {
    return NextResponse.json({ error: 'Failed to save replay' }, { status: 500 })
  }
}
