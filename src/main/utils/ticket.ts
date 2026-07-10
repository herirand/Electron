export function generateTicket(_saleId: number | bigint, items: unknown[], total: number): string {
  const now = new Date()
  const date = now.toLocaleDateString('fr-FR')
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  let ticket = ''
  ticket += '╔══════════════════════════════╗\n'
  ticket += '║        Bazar Soa             ║\n'
  ticket += '║    Ticket de caisse          ║\n'
  ticket += `║    ${date} à ${time}           ║\n`
  ticket += '╠══════════════════════════════╣\n'

  for (const item of items) {
    const itemAny = item as { productName: string; quantity: number; totalPrice: number }
    const name = itemAny.productName.padEnd(12)
    const qty = String(itemAny.quantity).padStart(2)
    const price = String(itemAny.totalPrice).padStart(8)
    ticket += `║ ${name} x${qty}  ${price} Ar║\n`
  }

  ticket += `║ TOTAL               ${String(total).padStart(8)} Ar║\n`
  ticket += '║                              ║\n'
  ticket += '║     Merci de votre visite     ║\n'
  ticket += '╚══════════════════════════════╝\n'

  return ticket
}
