import { NextResponse } from 'next/server'
import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const REPLAYS_DIR = join(process.cwd(), 'data', 'replays')

export async function GET() {
  try {
    const files = await readdir(REPLAYS_DIR)
    const replays = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map(async (f) => {
          const raw = await readFile(join(REPLAYS_DIR, f), 'utf-8')
          return JSON.parse(raw)
        })
    )
    return NextResponse.json(replays)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const replay = await request.json()
    if (!replay?.id) {
      return NextResponse.json({ error: 'Invalid replay data' }, { status: 400 })
    }
    await mkdir(REPLAYS_DIR, { recursive: true })
    await writeFile(
      join(REPLAYS_DIR, `${replay.id}.json`),
      JSON.stringify(replay, null, 2),
      'utf-8'
    )
    return NextResponse.json({ success: true, id: replay.id })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save replay' }, { status: 500 })
  }
}
