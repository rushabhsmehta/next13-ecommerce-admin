const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const uuidv4 = () => crypto.randomUUID()

const prisma = new PrismaClient()

const entries = [
  { ref: 'SCREF01276107792', description: 'NS_M_PPOS_Feb26_0007A0272930_3035385A', amount: 200.00 },
  { ref: 'SCREF01276107792', description: 'POS GST',                                 amount: 36.00  },
  { ref: 'SCREF01276107791', description: 'POS GST',                                 amount: 89.82  },
  { ref: 'SCREF01276107791', description: 'NS_LU_PPOS_Jan26_0007A0272930_3035385A', amount: 499.00 },
  { ref: 'SCREF01276063581', description: 'NS_SC_GPOS_Jan26_0007A0272930_3089460A', amount: 99.00  },
  { ref: 'SCREF01276063581', description: 'POS GST',                                 amount: 17.82  },
  { ref: 'SCREF01276063579', description: 'POS GST',                                 amount: 89.82  },
  { ref: 'SCREF01276063579', description: 'NS_LU_GPOS_Jan26_0007A0272930_3089460A', amount: 499.00 },
  { ref: 'SCREF01276063578', description: 'POS GST',                                 amount: 9.00   },
  { ref: 'SCREF01276063578', description: 'NS_SMS Pay_GPOS_Jan26_7A0272930_3089460A', amount: 50.00 },
]

const EXPENSE_DATE = new Date('2026-02-19T00:00:00.000Z')

async function main() {
  // Find Yes Bank account
  const allBanks = await prisma.bankAccount.findMany({ select: { id: true, accountName: true, bankName: true } })
  console.log('Available bank accounts:')
  console.table(allBanks)

  const yesBank = allBanks.find(b =>
    (b.bankName && b.bankName.toLowerCase().includes('yes')) ||
    (b.accountName && b.accountName.toLowerCase().includes('yes'))
  )
  if (!yesBank) {
    console.error('Yes Bank account not found.')
    process.exit(1)
  }
  console.log(`Using bank account: ${yesBank.accountName} (${yesBank.bankName}) — ID: ${yesBank.id}`)

  // Find Bank Charges category
  const allCategories = await prisma.expenseCategory.findMany({ select: { id: true, name: true } })
  console.log('Available expense categories:')
  console.table(allCategories)

  const bankChargesCategory = allCategories.find(c =>
    c.name && c.name.toLowerCase().includes('bank charge')
  )
  if (!bankChargesCategory) {
    console.error('Bank Charges category not found.')
    process.exit(1)
  }
  console.log(`Using expense category: ${bankChargesCategory.name} — ID: ${bankChargesCategory.id}`)

  let totalAmount = 0
  const created = []

  for (const entry of entries) {
    const expense = await prisma.expenseDetail.create({
      data: {
        id: uuidv4(),
        expenseDate: EXPENSE_DATE,
        amount: entry.amount,
        description: `${entry.ref} - ${entry.description}`,
        expenseCategoryId: bankChargesCategory.id,
        bankAccountId: yesBank.id,
        isAccrued: false,
        paidDate: EXPENSE_DATE,
        netPayable: entry.amount,
      }
    })
    totalAmount += entry.amount
    created.push({ id: expense.id, description: expense.description, amount: entry.amount })
    console.log(`Created: ${expense.description} — ₹${entry.amount}`)
  }

  // Update bank account balance
  await prisma.bankAccount.update({
    where: { id: yesBank.id },
    data: { currentBalance: { decrement: totalAmount } }
  })

  console.log(`\nTotal bank charges created: ${created.length}`)
  console.log(`Total amount deducted from Yes Bank: ₹${totalAmount.toFixed(2)}`)
  console.log(`New balance will reflect ₹${totalAmount.toFixed(2)} reduction`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
