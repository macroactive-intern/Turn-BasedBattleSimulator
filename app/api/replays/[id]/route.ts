import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const REPLAYS_DIR = join(process.cwd(), 'data', 'replays')

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const raw = await readFile(join(REPLAYS_DIR, `${params.id}.json`), 'utf-8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Replay not found' }, { status: 404 })
  }
}
