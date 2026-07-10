import { useState, useEffect } from 'react'

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.getSales().then((data) => {
      setSales(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>

  const totalAll = sales.reduce((sum, s) => sum + s.total, 0)

  return (
    <div>
      <div className="admin-header">
        <h2>📊 Historique des ventes</h2>
        <div style={{ fontSize: 18 }}>
          Total général :{' '}
          <strong style={{ color: 'var(--accent)' }}>{totalAll.toLocaleString()} Ar</strong>
        </div>
      </div>

      <div className="sales-list">
        {sales.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
            Aucune vente enregistrée
          </div>
        )}

        {sales.map((sale) => (
          <div key={sale.id} className="sale-card">
            <div className="sale-header">
              <span>Vente #{sale.id}</span>
              <span>{new Date(sale.created_at).toLocaleString('fr-FR')}</span>
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
          </div>
        ))}
      </div>
    </div>
  )
}
