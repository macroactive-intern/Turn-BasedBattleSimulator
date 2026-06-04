import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const REPLAYS_DIR = join(process.cwd(), 'data', 'replays')

// Only allow alphanumerics, hyphens, and underscores.
// The .json extension is appended server-side — never taken from user input.
function isSafeFilename(name: string): boolean {
  return /^[\w-]+$/.test(name)
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!isSafeFilename(id)) {
    return NextResponse.json({ error: 'Invalid replay id' }, { status: 400 })
  }

  try {
    const raw = await readFile(join(REPLAYS_DIR, `${id}.json`), 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Replay not found' }, { status: 404 })
  }
}
