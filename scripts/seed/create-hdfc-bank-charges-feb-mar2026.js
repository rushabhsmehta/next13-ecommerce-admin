const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const uuidv4 = () => crypto.randomUUID()

const prisma = new PrismaClient()

// HDFC Bank account ID: 0a1cd9a4-72d0-4de6-9d37-6b7eb930d7a8
// BANK CHARGES category ID: 4d023548-70c4-48a7-85d7-74d10309bac4
const HDFC_BANK_ID = '0a1cd9a4-72d0-4de6-9d37-6b7eb930d7a8'
const BANK_CHARGES_CATEGORY_ID = '4d023548-70c4-48a7-85d7-74d10309bac4'

const entries = [
  { date: new Date('2026-02-23T00:00:00.000Z'), description: 'ACH DEBIT RETURN CHARGES 100226-EPR2605309 EPR2605309248683', amount: 413.00 },
  { date: new Date('2026-02-24T00:00:00.000Z'), description: 'IMPS P2P 604560850988#14/02/2026-EPR2605514246092',           amount: 5.90   },
  { date: new Date('2026-02-25T00:00:00.000Z'), description: 'DC INTL POS TXN MARKUP+ST 140226-EPR2605615850268',           amount: 28.54  },
  { date: new Date('2026-02-25T00:00:00.000Z'), description: 'IMPS P2P 604825335229#17/02/2026-EPR2605616181412',           amount: 5.90   },
  { date: new Date('2026-03-01T00:00:00.000Z'), description: 'DC INTL POS TXN MARKUP+ST 220226-EPR2606022 EPR2606022232854', amount: 750.04 },
]

async function main() {
  let totalAmount = 0

  for (const entry of entries) {
    const expense = await prisma.expenseDetail.create({
      data: {
        id: uuidv4(),
        expenseDate: entry.date,
        amount: entry.amount,
        description: entry.description,
        expenseCategoryId: BANK_CHARGES_CATEGORY_ID,
        bankAccountId: HDFC_BANK_ID,
        isAccrued: false,
        paidDate: entry.date,
        netPayable: entry.amount,
      }
    })
    totalAmount += entry.amount
    console.log(`Created: ${entry.date.toDateString()} | ${entry.description} — ₹${entry.amount}`)
  }

  await prisma.bankAccount.update({
    where: { id: HDFC_BANK_ID },
    data: { currentBalance: { decrement: totalAmount } }
  })

  console.log(`\nTotal entries created: ${entries.length}`)
  console.log(`Total deducted from HDFC Bank: ₹${totalAmount.toFixed(2)}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
