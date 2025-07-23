// Script to fix tour package categorization issues
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Define more accurate domestic keywords (Indian destinations)
const DOMESTIC_KEYWORDS = [
  // Indian states and Union Territories  
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat',
  'haryana', 'himachal pradesh', 'himachal', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh',
  'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan',
  'sikkim', 'tamil nadu', 'tamilnadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  
  // Union Territories
  'andaman and nicobar', 'andaman', 'nicobar', 'chandigarh', 'dadra and nagar haveli', 
  'daman and diu', 'delhi', 'jammu and kashmir', 'jammu', 'kashmir', 'ladakh', 'leh', 'lakshadweep', 
  'puducherry', 'pondicherry',
  
  // Major Indian cities
  'mumbai', 'bangalore', 'bengaluru', 'hyderabad', 'ahmedabad', 'chennai', 'kolkata', 'pune',
  'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam',
  'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut',
  'rajkot', 'kalyan', 'dombivali', 'vasai', 'virar', 'varanasi', 'srinagar', 'aurangabad',
  'dhanbad', 'amritsar', 'navi mumbai', 'allahabad', 'prayagraj', 'ranchi', 'howrah', 
  'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota',
  'guwahati', 'solapur', 'hubballi', 'tiruchirappalli', 'bareilly', 'mysuru', 'mysore', 'tiruppur',
  'gurgaon', 'gurugram', 'aligarh', 'jalandhar', 'bhubaneswar', 'salem', 'warangal', 'guntur',
  'kochi', 'cochin', 'ernakulam', 'bhavnagar', 'dehradun', 'durgapur', 'asansol', 'rourkela',
  'tirupati', 'tirumala',
  
  // Popular Indian tourist destinations
  'manali', 'shimla', 'darjeeling', 'ooty', 'ootacamund', 'kodaikanal', 'munnar', 'alleppey',
  'alappuzha', 'kumarakom', 'rishikesh', 'haridwar', 'pushkar', 'udaipur', 'jaisalmer',
  'bikaner', 'ranthambore', 'jim corbett', 'corbett', 'nainital', 'mussoorie', 'dharamshala',
  'mcleodganj', 'kasol', 'spiti', 'leh', 'khardung la', 'nubra', 'pangong', 'tso moriri',
  'port blair', 'havelock', 'neil island', 'radhanagar', 'cellular jail', 'ross island',
  'gokarna', 'hampi', 'coorg', 'kodagu', 'chikmagalur', 'wayanad', 'thekkady', 'periyar',
  'fort kochi', 'trivandrum', 'thiruvananthapuram', 'varkala', 'kovalam', 'mahabalipuram', 
  'mamallapuram', 'kanyakumari', 'rameswaram', 'rameshwaram', 'thanjavur', 'araku', 'puri', 
  'konark', 'chilika', 'jagannath', 'gangtok', 'pelling', 'yuksom', 'lachung', 'lachen', 
  'nathu la', 'tsomgo', 'changu', 'shillong', 'cherrapunji', 'mawlynnong', 'dawki', 'kaziranga', 
  'majuli', 'tezpur', 'dibrugarh', 'jorhat', 'sivasagar', 'haflong', 'diphu', 'kohima', 
  'dimapur', 'imphal', 'loktak', 'keibul lamjao', 'moreh', 'ukhrul', 'agartala', 'mount abu', 
  'dilwara', 'nakki lake', 'guru shikhar', 'achalgarh', 'dalhousie', 'khajjiar', 'chamba', 
  'bir', 'billing', 'tirthan', 'jibhi', 'shoja', 'kullu', 'solang', 'rohtang', 'keylong',
  'kaza', 'chandratal', 'baralacha', 'sarchu', 'magnetic hill', 'hemis', 'thiksey', 'shey',
  'alchi', 'lamayuru', 'mulbekh', 'kargil', 'drass', 'sonamarg', 'gulmarg', 'pahalgam',
  'betaab valley', 'aru valley', 'baisaran', 'chandanwari', 'amarnath', 'vaishno devi',
  'patnitop', 'bhaderwah', 'kishtwar', 'doda', 'ramban', 'banihal', 'qazigund', 'anantnag',
  'kokernag', 'verinag', 'achabal', 'martand', 'awantipora', 'pampore', 'chashmashahi',
  'nishat', 'shalimar', 'dal lake', 'nagin lake', 'wular lake', 'manasbal', 'gangbal',
  'vishansar', 'krishansar', 'tarsar', 'marsar', 'tulian lake', 'sheshnag', 'panchtarni',
  
  // Religious/pilgrimage sites
  'chardham', 'badrinath', 'kedarnath', 'gangotri', 'yamunotri', 'do dham', 'ek dham',
  'golden triangle', 'vrindavan', 'mathura', 'ayodhya', 'kashi', 'dwarka', 'somnath',
  'shirdi', 'ajanta', 'ellora', 'khajuraho', 'sanchi', 'bodh gaya', 'nalanda',
  
  // General India identifiers
  'india', 'indian', 'bharat', 'hindustan', 'south india', 'north india', 'east india', 'west india'
];

// Define international keywords - more specific
const INTERNATIONAL_KEYWORDS = [
  // Countries (excluding India)
  'nepal', 'bhutan', 'bangladesh', 'pakistan', 'afghanistan', 'china', 'myanmar', 'sri lanka', 'srilanka',
  'maldives', 'thailand', 'vietnam', 'singapore', 'malaysia', 'indonesia', 'philippines', 'japan',
  'south korea', 'taiwan', 'hong kong', 'macau', 'cambodia', 'laos', 'brunei', 'mongolia',
  'dubai', 'uae', 'united arab emirates', 'emirates', 'qatar', 'kuwait', 'bahrain', 'oman',
  'saudi arabia', 'iran', 'iraq', 'turkey', 'georgia', 'armenia', 'azerbaijan', 'kazakhstan',
  'uzbekistan', 'kyrgyzstan', 'tajikistan', 'turkmenistan', 'afghanistan', 'russia',
  'egypt', 'morocco', 'tunisia', 'algeria', 'libya', 'sudan', 'ethiopia', 'kenya', 'tanzania',
  'south africa', 'madagascar', 'mauritius', 'seychelles', 'zimbabwe', 'botswana', 'namibia',
  'france', 'germany', 'italy', 'spain', 'portugal', 'uk', 'united kingdom', 'britain', 'england',
  'scotland', 'wales', 'ireland', 'netherlands', 'belgium', 'austria', 'switzerland', 'denmark',
  'sweden', 'norway', 'finland', 'iceland', 'poland', 'czech republic', 'hungary', 'romania',
  'bulgaria', 'greece', 'croatia', 'serbia', 'bosnia', 'montenegro', 'albania', 'macedonia',
  'slovenia', 'slovakia', 'lithuania', 'latvia', 'estonia', 'ukraine', 'belarus', 'moldova',
  'usa', 'united states', 'america', 'canada', 'mexico', 'brazil', 'argentina', 'chile',
  'peru', 'colombia', 'venezuela', 'ecuador', 'bolivia', 'uruguay', 'paraguay', 'guyana',
  'australia', 'new zealand', 'fiji', 'papua new guinea', 'vanuatu', 'samoa', 'tonga',
  
  // Major international cities
  'kathmandu', 'pokhara', 'lumbini', 'chitwan', 'thimphu', 'paro', 'punakha', 'dhaka', 'chittagong',
  'bangkok', 'phuket', 'pattaya', 'chiang mai', 'chiang rai', 'krabi', 'koh samui', 'ayutthaya',
  'hanoi', 'ho chi minh', 'da nang', 'hoi an', 'halong bay', 'phu quoc', 'nha trang', 'hue',
  'singapore', 'sentosa', 'marina bay', 'kuala lumpur', 'penang', 'langkawi', 'malacca', 'johor bahru',
  'jakarta', 'bali', 'ubud', 'kuta', 'sanur', 'nusa dua', 'lombok', 'yogyakarta', 'bandung',
  'manila', 'cebu', 'boracay', 'palawan', 'baguio', 'davao', 'tokyo', 'osaka', 'kyoto', 'hiroshima',
  'seoul', 'busan', 'jeju', 'taipei', 'kaohsiung', 'hong kong', 'victoria peak', 'macau',
  'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'xian', 'guilin', 'lhasa', 'tibet',
  'dubai', 'abu dhabi', 'sharjah', 'doha', 'kuwait city', 'muscat', 'riyadh', 'jeddah', 'mecca',
  'istanbul', 'ankara', 'antalya', 'cappadocia', 'pamukkale', 'bodrum', 'cairo', 'alexandria',
  'luxor', 'aswan', 'hurghada', 'sharm el sheikh', 'casablanca', 'marrakech', 'fez', 'rabat',
  'london', 'manchester', 'edinburgh', 'paris', 'lyon', 'nice', 'rome', 'milan', 'venice',
  'florence', 'madrid', 'barcelona', 'seville', 'berlin', 'munich', 'amsterdam', 'vienna',
  'zurich', 'geneva', 'brussels', 'copenhagen', 'stockholm', 'oslo', 'helsinki', 'reykjavik',
  'new york', 'los angeles', 'san francisco', 'chicago', 'las vegas', 'miami', 'toronto',
  'vancouver', 'montreal', 'sydney', 'melbourne', 'brisbane', 'auckland', 'wellington',
  'moscow', 'st petersburg', 'almaty', 'tashkent', 'baku', 'tbilisi', 'yerevan', 'tehran',
  'colombo', 'kandy', 'galle', 'sigiriya', 'nuwara eliya', 'male', 'hulhule'
];

// Function to categorize with better logic
function smartCategorize(tourPackage) {
  const locationLabel = tourPackage.location?.label?.toLowerCase() || '';
  const tourPackageName = tourPackage.tourPackageName?.toLowerCase() || '';
  const allText = `${locationLabel} ${tourPackageName}`.toLowerCase();
  
  console.log(`🔍 Analyzing: "${tourPackage.tourPackageName}" (Location: ${tourPackage.location?.label})`);
  
  // Check location first (most reliable indicator)
  const locationDomestic = DOMESTIC_KEYWORDS.some(keyword => 
    locationLabel.includes(keyword)
  );
  const locationInternational = INTERNATIONAL_KEYWORDS.some(keyword => 
    locationLabel.includes(keyword)
  );
  
  // If location clearly indicates category, use that
  if (locationDomestic && !locationInternational) {
    console.log(`   ✅ DOMESTIC (location "${locationLabel}" is clearly domestic)`);
    return 'Domestic';
  }
  if (locationInternational && !locationDomestic) {
    console.log(`   ✅ INTERNATIONAL (location "${locationLabel}" is clearly international)`);
    return 'International';
  }
  
  // Check package name for additional clues
  const nameDomestic = DOMESTIC_KEYWORDS.some(keyword => 
    tourPackageName.includes(keyword)
  );
  const nameInternational = INTERNATIONAL_KEYWORDS.some(keyword => 
    tourPackageName.includes(keyword)
  );
  
  if (nameDomestic && !nameInternational) {
    console.log(`   ✅ DOMESTIC (package name indicates domestic)`);
    return 'Domestic';
  }
  if (nameInternational && !nameDomestic) {
    console.log(`   ✅ INTERNATIONAL (package name indicates international)`);
    return 'International';
  }
  
  // Special cases for commonly confused locations
  if (locationLabel.includes('kashmir') || locationLabel.includes('ladakh') || 
      tourPackageName.includes('kashmir') || tourPackageName.includes('ladakh')) {
    console.log(`   ✅ DOMESTIC (Kashmir/Ladakh is part of India)`);
    return 'Domestic';
  }
  
  if (locationLabel.includes('chardham') || tourPackageName.includes('chardham') ||
      tourPackageName.includes('do dham') || tourPackageName.includes('ek dham')) {
    console.log(`   ✅ DOMESTIC (Chardham is in India)`);
    return 'Domestic';
  }
  
  // Default to current value if unclear
  console.log(`   ⚠️  KEEPING CURRENT: ${tourPackage.tourCategory} (unclear indicators)`);
  return tourPackage.tourCategory || 'Domestic';
}

async function fixTourCategories() {
  console.log('🔧 Starting Tour Package Category Fixes...');
  console.log('   This script will review and fix incorrectly categorized packages.\n');

  try {
    // Fetch all tour packages
    const tourPackages = await prisma.tourPackage.findMany({
      include: {
        location: {
          select: {
            id: true,
            label: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📦 Found ${tourPackages.length} tour packages to review\n`);
    
    let domesticCount = 0;
    let internationalCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    
    for (let i = 0; i < tourPackages.length; i++) {
      const tourPackage = tourPackages[i];
      console.log(`\n📋 [${i + 1}/${tourPackages.length}] Processing:`);
      
      const currentCategory = tourPackage.tourCategory;
      const newCategory = smartCategorize(tourPackage);
      
      // Count for final statistics
      if (newCategory === 'Domestic') {
        domesticCount++;
      } else {
        internationalCount++;
      }
      
      // Update if category changed
      if (currentCategory !== newCategory) {
        try {
          await prisma.tourPackage.update({
            where: { id: tourPackage.id },
            data: { tourCategory: newCategory }
          });
          
          console.log(`   💾 UPDATED: ${currentCategory} → ${newCategory}`);
          updatedCount++;
        } catch (error) {
          console.error(`   ❌ ERROR updating package: ${error.message}`);
        }
      } else {
        unchangedCount++;
      }
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL CATEGORY DISTRIBUTION');
    console.log('='.repeat(60));
    console.log(`🏠 Domestic packages:     ${domesticCount.toString().padStart(4)} (${((domesticCount / tourPackages.length) * 100).toFixed(1)}%)`);
    console.log(`🌍 International packages: ${internationalCount.toString().padStart(4)} (${((internationalCount / tourPackages.length) * 100).toFixed(1)}%)`);
    console.log('─'.repeat(40));
    console.log(`✨ Packages updated:      ${updatedCount.toString().padStart(4)}`);
    console.log(`⏭️  Packages unchanged:    ${unchangedCount.toString().padStart(4)}`);
    console.log('─'.repeat(40));
    console.log(`📝 Total packages:        ${tourPackages.length.toString().padStart(4)}`);
    console.log('='.repeat(60));
    
    if (updatedCount > 0) {
      console.log(`🎉 Successfully fixed ${updatedCount} tour package categories!`);
    } else {
      console.log('ℹ️  All packages were already correctly categorized.');
    }
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR during fix:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the fix
fixTourCategories().catch(console.error);
