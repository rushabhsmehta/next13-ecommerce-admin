const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const htmlContent = 
`<html>
<body>
<table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; height: 266px;">
    <caption style="margin-bottom: 10px; font-size: 18px; font-weight: bold; color: #333;">Pricing Details</caption>
    <thead>
        <tr>
            <th style="width: 50%; background: linear-gradient(to right, #FF0000, #FFA500); color: white; text-transform: uppercase; font-size: 14px; letter-spacing: 1px; padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd;">Criteria</th>
            <th style="width: 50%; background: linear-gradient(to right, #FF0000, #FFA500); color: white; text-transform: uppercase; font-size: 14px; letter-spacing: 1px; padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd;">Price</th>
        </tr>
    </thead>
    <tbody>
        <tr style="background-color: #f2f2f2;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Per Person Cost (For 2 Persons Travelling Together)</strong></td>
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">₹ </td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Per Person Cost (For 4 Persons Travelling Together)</strong></td>
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">₹ </td>
        </tr>
        <tr style="background-color: #f2f2f2;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Per Person Cost (For 6 Persons Travelling Together)</strong></td>
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">₹ </td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Per Person With Extra Bed/Mattress</strong></td>
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">₹ </td>
        </tr>
        <tr style="background-color: #f2f2f2;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Child with Mattress (5 to 11)</strong></td>
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">₹ </td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Child without Mattress (5 to 11)</strong></td>
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">₹ </td>
        </tr>
         <tr style="background-color: #f2f2f2;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Child below 5 years</strong></td>
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">₹ Complimentary With Parents Sharing Bed</td>
        </tr>
    </tbody>
</table>
</body>
</html>
`;

async function updateTotalPrice() {
  try {
    // Retrieve all TourPackages
    const tourPackages = await prisma.tourPackage.findMany();

    // Loop through each package and update totalPrice
    for (const pkg of tourPackages) {
      await prisma.tourPackage.update({
        where: { id: pkg.id },
        data: { totalPrice: htmlContent },
      });
    }
    console.log('TotalPrice updated successfully.');
  } catch (error) {
    console.error('Error updating totalPrice:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTotalPrice();