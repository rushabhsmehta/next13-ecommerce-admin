const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const htmlContent = `
<html><body><!--StartFragment--><p><br></p><table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; background-color: #f9f9f9;">
    <caption style="margin-bottom: 10px; font-size: 18px; font-weight: bold; color: #333;">Pricing Details</caption>
    <thead>
        <tr style="background: linear-gradient(to right, #FF0000, #FFA500); color: white; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">
            <th style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd;">Criteria</th>
            <th style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd;">Price</th>
        </tr>
    </thead>
    <tbody>
        <tr style="background-color: #f2f2f2;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Per Couple Cost</strong></td>
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">₹ </td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Per Person Cost (On Twin Sharing)</strong></td>
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">₹ </td>
        </tr>
        <tr style="background-color: #f2f2f2;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Single Person in Room</strong></td>
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">₹ </td>
        </tr>
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Third Person in Same Room</strong></td>
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
        <tr style="background-color: #f9f9f9;">
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;"><strong>Child below 5 years</strong></td>
            <td style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">₹ </td>
        </tr>
    </tbody>
</table>
<p><br></p>
<p></p><!--EndFragment-->
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