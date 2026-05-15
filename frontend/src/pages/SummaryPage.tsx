import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Summary } from '../types'

export function SummaryPage() {
  const { id } = useParams()
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    api.get<Summary>(`/api/sessions/${id}/summary`).then(setSummary)
  }, [id])

  const top = useMemo(() => [...(summary?.rows || [])].sort((a, b) => b.profit_fantics - a.profit_fantics).slice(0, 3), [summary])

  if (!summary) return <p>Загрузка...</p>

  return (
    <section className="card">
      <h1>Итоги: {summary.session_name}</h1>
      <div className="row wrap podium">
        {top.map((player, i) => (
          <div key={player.player_id} className="podium-item">
            <span>{['🥇', '🥈', '🥉'][i]}</span>
            <strong>{player.player_name}</strong>
          </div>
        ))}
      </div>
      <table>
        <thead>
          <tr>
            <th>Игрок</th>
            <th>Закупы</th>
            <th>Фишки</th>
            <th>Остаток</th>
            <th>Фантики</th>
          </tr>
        </thead>
        <tbody>
          {summary.rows.map((row) => (
            <tr key={row.player_id}>
              <td>{row.player_name}</td>
              <td>{row.buyins_count}</td>
              <td>{row.total_buyin_chips}</td>
              <td>{row.chips_remaining}</td>
              <td className={row.profit_fantics >= 0 ? 'profit up' : 'profit down'}>{row.profit_fantics}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
