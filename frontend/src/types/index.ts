export interface Session {
  id: number
  title: string
  created_by: number
  status: 'active' | 'finished'
  started_at: string
  finished_at?: string
}

export interface Player {
  id: number
  session_id: number
  telegram_id: number
  username: string
  name: string
}

export interface Buyin {
  id: number
  session_id: number
  player_id: number
  amount: number
  note: string
  created_at: string
}

export interface SummaryRow {
  player_id: number
  player_name: string
  username: string
  buyins_count: number
  total_buyin_chips: number
  chips_remaining: number
  profit_chips: number
  profit_fantics: number
  approved_by?: string
}

export interface Summary {
  session_id: number
  session_name: string
  rows: SummaryRow[]
}
