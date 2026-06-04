import { BattleScreen } from '@/components/battle/BattleScreen'
import characters from '@/data/characters.json'
import type { Combatant } from '@/types/battle'

export default function BattlePage() {
  return <BattleScreen initialCombatants={characters as Combatant[]} />
}
