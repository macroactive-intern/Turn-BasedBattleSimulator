import type { Ability, Combatant, StatusEffectType } from '@/types/battle'

// ─── PokéAPI response shapes (minimal) ───────────────────────────────────────

interface PokeApiStat {
  base_stat: number
  stat: { name: string }
}

interface PokeApiMove {
  move: { name: string; url: string }
}

interface PokeApiType {
  type: { name: string }
}

interface PokeApiPokemon {
  id: number
  name: string
  stats: PokeApiStat[]
  moves: PokeApiMove[]
  types: PokeApiType[]
}

// ─── Stat helpers ─────────────────────────────────────────────────────────────

function getStat(stats: PokeApiStat[], name: string): number {
  return stats.find((s) => s.stat.name === name)?.base_stat ?? 0
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
}

// ─── Type → ability effect mapping ───────────────────────────────────────────

const TYPE_EFFECT: Partial<Record<string, StatusEffectType>> = {
  poison:  'poison',
  fire:    'burn',
  ice:     'stun',
  grass:   'regen',
  steel:   'shield',
  psychic: 'stun',
}

// ─── Ability builder ──────────────────────────────────────────────────────────

// Generates 4 abilities from the Pokémon's types and move list.
// Move names from the API become ability names; damage and costs
// are derived from the Pokémon's own stats so stronger Pokémon feel stronger.
function buildAbilities(
  moves: PokeApiMove[],
  types: PokeApiType[],
  attack: number,
  spAtk: number,
  spDef: number,
): Ability[] {
  const primaryType  = types[0]?.type.name ?? ''
  const typeEffect   = TYPE_EFFECT[primaryType]

  // Pick up to 3 moves from the API (first 3 for variety), plus one type-flavoured move
  const pickedMoves = moves.slice(0, 3).map((m, i): Ability => ({
    id:          m.move.name,
    name:        capitalize(m.move.name),
    description: `${capitalize(primaryType)}-type attack.`,
    damage:      Math.max(5, Math.round(attack * 0.6) + i * 3),
    mpCost:      i === 0 ? 0 : Math.max(4, Math.round(spAtk * 0.15)),
    cooldown:    i,
  }))

  // Signature ability: uses the Pokémon's type and may apply a status effect
  const signature: Ability = {
    id:          `${primaryType}-technique`,
    name:        `${capitalize(primaryType)} Technique`,
    description: typeEffect
      ? `Applies ${typeEffect} to the target.`
      : `A powerful ${capitalize(primaryType)}-type special move.`,
    damage:      typeEffect ? Math.max(4, Math.round(attack * 0.4)) : Math.max(8, Math.round(attack * 0.8)),
    mpCost:      Math.max(6, Math.round(spDef * 0.2)),
    cooldown:    3,
    effect:      typeEffect,
  }

  return [...pickedMoves, signature].slice(0, 4)
}

// ─── Public loader ────────────────────────────────────────────────────────────

export class PokemonLoadError extends Error {}

export async function loadPokemonEnemy(nameOrId: string | number): Promise<Combatant> {
  const key = String(nameOrId).toLowerCase()
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`)

  if (!res.ok) {
    throw new PokemonLoadError(
      `Could not load Pokémon "${nameOrId}" (HTTP ${res.status})`
    )
  }

  const data = await res.json() as PokeApiPokemon

  const hp      = getStat(data.stats, 'hp')
  const attack  = getStat(data.stats, 'attack')
  const defense = getStat(data.stats, 'defense')
  const speed   = getStat(data.stats, 'speed')
  const spAtk   = getStat(data.stats, 'special-attack')
  const spDef   = getStat(data.stats, 'special-defense')

  // special-attack → scales MP pool; special-defense → scales max MP
  const maxMp = Math.max(20, Math.round(spDef * 0.8))
  const mp    = maxMp

  const abilities = buildAbilities(data.moves, data.types, attack, spAtk, spDef)

  return {
    name:            capitalize(data.name),
    hp:              Math.max(1, hp),
    maxHp:           Math.max(1, hp),
    mp,
    maxMp,
    attack:          Math.max(1, attack),
    defense:         Math.max(0, defense),
    speed:           Math.max(1, speed),
    abilities,
    statusEffects:   [],
    abilityCooldowns: {},
  }
}
