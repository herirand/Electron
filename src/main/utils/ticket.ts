export function generateTicket(
  _saleId: number | bigint,
  items: unknown[],
  total: number,
  amountReceived?: number,
  change?: number,
  remise: number = 0,
  // NOUVEAU : mention « À CRÉDIT » sur le ticket des ventes à crédit
  isCredit: boolean = false
): string {
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

  ticket += '╠══════════════════════════════╣\n'
  ticket += `║ TOTAL               ${String(total).padStart(8)} Ar║\n`

  if (remise > 0) {
    ticket += `║ Remise              ${String('-' + remise).padStart(8)} Ar║\n`
    const aPayer = total - remise
    ticket += `║ A payer             ${String(aPayer).padStart(8)} Ar║\n`
  }

  // NOUVEAU : ticket de vente à crédit — le montant reste dû
  if (isCredit) {
    ticket += '║        À CRÉDIT              ║\n'
    ticket += `║ Reste a payer      ${String(total).padStart(8)} Ar║\n`
  }

  if (amountReceived != null && !isNaN(amountReceived)) {
    ticket += `║ Recu               ${String(amountReceived).padStart(8)} Ar║\n`
    if (change != null && !isNaN(change)) {
      ticket += `║ Monnaie            ${String(change).padStart(8)} Ar║\n`
    }
  }

  ticket += '║                              ║\n'
  ticket += '║     Merci de votre visite     ║\n'
  ticket += '╚══════════════════════════════╝\n'

  return ticket
}
