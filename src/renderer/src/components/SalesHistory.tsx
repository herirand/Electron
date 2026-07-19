import { useState, useEffect } from 'react'

const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre'
]

const DAYS_FR = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const count = new Date(year, month + 1, 0).getDate()
  for (let i = 1; i <= count; i++) {
    days.push(new Date(year, month, i))
  }
  return days
}

function getFirstDayOfWeek(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

interface MonthSummary {
  days: Journalier[]
  total: number
  benefice: number
  jour_ventes: number
}

export default function SalesHistory() {
  const [monthData, setMonthData] = useState<MonthSummary | null>(null)
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(() => toKey(new Date()))
  const [daySales, setDaySales] = useState<Sale[]>([])
  const [dayDate, setDayDate] = useState<string | null>(() => toKey(new Date()))
  const [ticketContent, setTicketContent] = useState<string | null>(null)
  const [ticketSaleId, setTicketSaleId] = useState<number | null>(null)

  const monthKey = `${currentMonth.year}-${currentMonth.month}`

  useEffect(() => {
    window.api.getJournalierByMonth(currentMonth.year, currentMonth.month).then((data) => {
      setMonthData(data)
      setLoadedMonth(monthKey)
    })
  }, [currentMonth.year, currentMonth.month, monthKey])

  useEffect(() => {
    if (!selectedDate) return
    window.api.getSalesByDate(selectedDate).then((data) => {
      setDaySales(data)
      setDayDate(selectedDate)
    })
  }, [selectedDate])

  const loading = loadedMonth !== monthKey
  const dayLoading = selectedDate !== null && dayDate !== selectedDate

  const daysByDate = new Map((monthData?.days ?? []).map((j) => [j.date, j]))

  const monthDays = getDaysInMonth(currentMonth.year, currentMonth.month)
  const startOffset = getFirstDayOfWeek(currentMonth.year, currentMonth.month)

  const prevMonth = (): void => {
    setCurrentMonth((prev) => {
      const m = prev.month - 1
      if (m < 0) return { year: prev.year - 1, month: 11 }
      return { year: prev.year, month: m }
    })
  }

  const nextMonth = (): void => {
    setCurrentMonth((prev) => {
      const m = prev.month + 1
      if (m > 11) return { year: prev.year + 1, month: 0 }
      return { year: prev.year, month: m }
    })
  }

  const loadTicket = (saleId: number): void => {
    setTicketSaleId(saleId)
    window.api.getTicketContent(saleId).then(setTicketContent)
  }

  const closeTicket = (): void => {
    setTicketContent(null)
    setTicketSaleId(null)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>

  return (
    <div>
      <div className="admin-header">
        <h2>Historique des ventes</h2>
      </div>

      <div className="sales-calendar-layout">
        <div className="sales-calendar-panel">
          <div className="calendar-nav">
            <button className="calendar-nav-btn" onClick={prevMonth}>
              ‹
            </button>
            <span className="calendar-nav-title">
              {MONTHS_FR[currentMonth.month]} {currentMonth.year}
            </span>
            <button className="calendar-nav-btn" onClick={nextMonth}>
              ›
            </button>
          </div>

          <div className="calendar-grid">
            {DAYS_FR.map((d) => (
              <div key={d} className="calendar-day-header">
                {d}
              </div>
            ))}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty" />
            ))}
            {monthDays.map((d) => {
              const key = toKey(d)
              const j = daysByDate.get(key)
              const isSelected = key === selectedDate
              const hasSales = !!j
              return (
                <button
                  key={key}
                  className={`calendar-day${isSelected ? ' selected' : ''}${hasSales ? ' has-sales' : ''}`}
                  onClick={() => setSelectedDate(key)}
                >
                  <span className="calendar-day-num">{d.getDate()}</span>
                  {hasSales && (
                    <span className="calendar-day-total">
                      {j!.total_ventes.toLocaleString()}
                      <br />
                      <span style={{ fontSize: '0.75em', color: 'var(--text-secondary)' }}>
                        +{j!.benefice.toLocaleString()} B
                      </span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="calendar-month-summary">
            <div>
              Total du mois :{' '}
              <strong style={{ color: 'var(--accent, #f5b731)' }}>
                {monthData ? monthData.total.toLocaleString() : 0} Ar
              </strong>
            </div>
            <div>
              Bénéfice du mois :{' '}
              <strong style={{ color: '#4caf50' }}>
                {monthData ? monthData.benefice.toLocaleString() : 0} Ar
              </strong>
            </div>
          </div>
        </div>

        <div className="sales-day-panel">
          {selectedDate ? (
            <>
              <div className="day-panel-header">
                <h3>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </h3>
                {(() => {
                  const j = daysByDate.get(selectedDate)
                  return j ? (
                    <div style={{ textAlign: 'right' }}>
                      <span className="day-panel-total">{j.total_ventes.toLocaleString()} Ar</span>
                      <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                        Bénéfice : {j.benefice.toLocaleString()} Ar
                      </div>
                    </div>
                  ) : null
                })()}
              </div>

              {dayLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Chargement...
                </div>
              ) : daySales.length === 0 ? (
                <div className="day-panel-empty">Aucune vente ce jour</div>
              ) : (
                <div className="sales-list">
                  {daySales.map((sale) => (
                    <div key={sale.id} className="sale-card">
                      <div className="sale-header">
                        <span>Vente #{sale.id}</span>
                        <span>{new Date(sale.created_at).toLocaleTimeString('fr-FR')}</span>
                        <span>Caissier : {sale.cashier}</span>
                      </div>
                      <div className="sale-total">{sale.total.toLocaleString()} Ar</div>
                      <div className="sale-items">
                        {Array.isArray(sale.items) &&
                          sale.items.filter(Boolean).map((item, i) => (
                            <span key={i}>
                              {item.name} × {item.quantity} ({item.unit_price.toLocaleString()} Ar)
                              {i < sale.items.length - 1 ? ' | ' : ''}
                            </span>
                          ))}
                      </div>
                      <button className="btn-ticket" onClick={() => loadTicket(sale.id)}>
                        Voir le ticket
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="day-panel-empty">Sélectionnez un jour pour voir les ventes</div>
          )}
        </div>
      </div>

      {ticketContent !== null && (
        <div className="modal-overlay" onClick={closeTicket}>
          <div className="modal ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Ticket #{ticketSaleId}</h3>
              <div className="ticket-modal-actions">
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (ticketSaleId !== null) {
                      window.api.exportTicket(ticketSaleId).then((res) => {
                        if (res.success) closeTicket()
                      })
                    }
                  }}
                >
                  Exporter
                </button>
                <button className="btn-secondary" onClick={closeTicket}>
                  Fermer
                </button>
              </div>
            </div>
            <pre className="ticket-content">{ticketContent}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
