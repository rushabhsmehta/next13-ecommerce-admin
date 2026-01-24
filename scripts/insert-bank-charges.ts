import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BankCharge {
    valueDate: string;
    referenceNo: string;
    description: string;
    amount: number;
}

// Bank charges data from the image
const bankCharges: BankCharge[] = [
    { valueDate: '2026-01-22', referenceNo: 'SCREF01273229433', description: 'NS_M_PPOS_Jan26_0007A0272930_3035385A - POS Charges', amount: 200.00 },
    { valueDate: '2026-01-22', referenceNo: 'SCREF01273229433', description: 'POS GST', amount: 36.00 },
    { valueDate: '2026-01-22', referenceNo: 'SCREF01273229432', description: 'NS_LU_PPOS_Dec25_0007A0272930_3035385A - POS Charges', amount: 499.00 },
    { valueDate: '2026-01-22', referenceNo: 'SCREF01273229432', description: 'POS GST', amount: 89.82 },
    { valueDate: '2026-01-22', referenceNo: 'SCREF01273180599', description: 'NS_SMS Pay_GPOS_Dec25_7A0272930_3089460A - SMS Charges', amount: 50.00 },
    { valueDate: '2026-01-22', referenceNo: 'SCREF01273180599', description: 'POS GST', amount: 9.00 },
    { valueDate: '2026-01-22', referenceNo: 'SCREF01273180597', description: 'NS_SC_GPOS_Dec25_0007A0272930_3089460A - POS Charges', amount: 99.00 },
    { valueDate: '2026-01-22', referenceNo: 'SCREF01273180597', description: 'POS GST', amount: 17.82 },
    { valueDate: '2026-01-21', referenceNo: 'ORMB205579494092', description: 'IMPS PAYMENT CHRGS for 19-Jan-2026', amount: 5.00 },
    { valueDate: '2026-01-21', referenceNo: 'ORMB205579494092', description: 'GST', amount: 0.90 },
    { valueDate: '2026-01-19', referenceNo: 'ORMB205019440076', description: 'IMPS PAYMENT CHRGS for 17-Jan-2026', amount: 7.00 },
    { valueDate: '2026-01-19', referenceNo: 'ORMB205019440076', description: 'GST', amount: 1.26 },
];

async function main() {
    try {
        // Find Yes Bank account
        console.log('Looking for Yes Bank account...');
        const bankAccounts = await prisma.bankAccount.findMany({
            where: {
                OR: [
                    { bankName: { contains: 'Yes' } },
                    { accountName: { contains: 'Yes' } }
                ]
            }
        });

        console.log('Found bank accounts:', bankAccounts.map(b => ({ id: b.id, name: b.accountName, bank: b.bankName })));

        if (bankAccounts.length === 0) {
            console.log('\nNo Yes Bank account found. Let me list all bank accounts:');
            const allBankAccounts = await prisma.bankAccount.findMany();
            console.log('All bank accounts:', allBankAccounts.map(b => ({ id: b.id, name: b.accountName, bank: b.bankName })));
            return;
        }

        const yesBankAccount = bankAccounts[0];
        console.log(`\nUsing bank account: ${yesBankAccount.accountName} (${yesBankAccount.bankName})`);

        // Find Bank Charges category
        console.log('\nLooking for Bank Charges category...');
        const expenseCategories = await prisma.expenseCategory.findMany({
            where: {
                name: { contains: 'Bank' }
            }
        });

        console.log('Found expense categories:', expenseCategories.map(c => ({ id: c.id, name: c.name })));

        if (expenseCategories.length === 0) {
            console.log('\nNo Bank Charges category found. Let me list all expense categories:');
            const allCategories = await prisma.expenseCategory.findMany();
            console.log('All expense categories:', allCategories.map(c => ({ id: c.id, name: c.name })));
            return;
        }

        const bankChargesCategory = expenseCategories[0];
        console.log(`\nUsing expense category: ${bankChargesCategory.name}`);

        // Insert bank charges
        console.log('\n--- Inserting Bank Charges ---\n');

        for (const charge of bankCharges) {
            const expense = await prisma.expenseDetail.create({
                data: {
                    expenseDate: new Date(charge.valueDate),
                    amount: charge.amount,
                    description: `${charge.description} (Ref: ${charge.referenceNo})`,
                    bankAccountId: yesBankAccount.id,
                    expenseCategoryId: bankChargesCategory.id,
                    isAccrued: false,
                    paidDate: new Date(charge.valueDate),
                }
            });

            // Update bank account balance
            await prisma.bankAccount.update({
                where: { id: yesBankAccount.id },
                data: {
                    currentBalance: {
                        decrement: charge.amount
                    }
                }
            });

            console.log(`✅ Created expense: ${charge.description} - ₹${charge.amount} on ${charge.valueDate}`);
        }

        console.log('\n--- All bank charges inserted successfully! ---');
        console.log(`Total entries: ${bankCharges.length}`);
        console.log(`Total amount: ₹${bankCharges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
