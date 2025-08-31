const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Common seasonal period templates
const seasonalTemplates = {
  // For beach destinations like Goa, Kerala, etc.
  BEACH_DESTINATION: [
    {
      seasonType: 'PEAK_SEASON',
      name: 'Winter Peak Season',
      startMonth: 12,
      startDay: 1,
      endMonth: 2,
      endDay: 28,
      description: 'Perfect weather for beach holidays, highest demand and pricing'
    },
    {
      seasonType: 'SHOULDER_SEASON',
      name: 'Pleasant Season',
      startMonth: 3,
      startDay: 1,
      endMonth: 5,
      endDay: 31,
      description: 'Good weather with moderate demand and pricing'
    },
    {
      seasonType: 'OFF_SEASON',
      name: 'Monsoon Off Season',
      startMonth: 6,
      startDay: 1,
      endMonth: 11,
      endDay: 30,
      description: 'Monsoon and hot weather, lowest prices'
    }
  ],
  
  // For hill stations like Himachal, Uttarakhand, etc.
  HILL_STATION: [
    {
      seasonType: 'PEAK_SEASON',
      name: 'Summer Peak Season',
      startMonth: 4,
      startDay: 1,
      endMonth: 6,
      endDay: 30,
      description: 'Pleasant weather, escape from heat, highest demand'
    },
    {
      seasonType: 'SHOULDER_SEASON',
      name: 'Winter Pleasant Season',
      startMonth: 10,
      startDay: 1,
      endMonth: 3,
      endDay: 31,
      description: 'Cool weather, moderate demand, some snow in higher regions'
    },
    {
      seasonType: 'OFF_SEASON',
      name: 'Monsoon Off Season',
      startMonth: 7,
      startDay: 1,
      endMonth: 9,
      endDay: 30,
      description: 'Monsoon season with limited accessibility'
    }
  ],
  
  // For desert destinations like Rajasthan
  DESERT_DESTINATION: [
    {
      seasonType: 'PEAK_SEASON',
      name: 'Winter Peak Season',
      startMonth: 11,
      startDay: 1,
      endMonth: 2,
      endDay: 28,
      description: 'Pleasant weather, ideal for desert tourism'
    },
    {
      seasonType: 'SHOULDER_SEASON',
      name: 'Spring/Autumn Season',
      startMonth: 3,
      startDay: 1,
      endMonth: 4,
      endDay: 30,
      description: 'Moderately warm weather, good for sightseeing'
    },
    {
      seasonType: 'OFF_SEASON',
      name: 'Summer Off Season',
      startMonth: 5,
      startDay: 1,
      endMonth: 10,
      endDay: 31,
      description: 'Very hot weather, minimal tourism'
    }
  ],
  
  // For cultural cities and metropolitan areas
  CULTURAL_CITY: [
    {
      seasonType: 'PEAK_SEASON',
      name: 'Winter Peak Season',
      startMonth: 10,
      startDay: 1,
      endMonth: 3,
      endDay: 31,
      description: 'Pleasant weather for sightseeing and cultural activities'
    },
    {
      seasonType: 'SHOULDER_SEASON',
      name: 'Spring/Summer Season',
      startMonth: 4,
      startDay: 1,
      endMonth: 6,
      endDay: 30,
      description: 'Warm weather, moderate demand'
    },
    {
      seasonType: 'OFF_SEASON',
      name: 'Monsoon Off Season',
      startMonth: 7,
      startDay: 1,
      endMonth: 9,
      endDay: 30,
      description: 'Monsoon season, reduced outdoor activities'
    }
  ]
}

// Location mappings to templates
const locationTemplateMap = {
  // Beach destinations
  'Goa': 'BEACH_DESTINATION',
  'Kerala': 'BEACH_DESTINATION',
  'Andaman': 'BEACH_DESTINATION',
  'Lakshadweep': 'BEACH_DESTINATION',
  'Mumbai': 'BEACH_DESTINATION',
  'Chennai': 'BEACH_DESTINATION',
  'Puri': 'BEACH_DESTINATION',
  'Pondicherry': 'BEACH_DESTINATION',
  'Daman': 'BEACH_DESTINATION',
  'Diu': 'BEACH_DESTINATION',
  
  // Hill stations
  'Himachal Pradesh': 'HILL_STATION',
  'Manali': 'HILL_STATION',
  'Shimla': 'HILL_STATION',
  'Dharamshala': 'HILL_STATION',
  'Kullu': 'HILL_STATION',
  'Uttarakhand': 'HILL_STATION',
  'Nainital': 'HILL_STATION',
  'Mussoorie': 'HILL_STATION',
  'Rishikesh': 'HILL_STATION',
  'Haridwar': 'HILL_STATION',
  'Darjeeling': 'HILL_STATION',
  'Sikkim': 'HILL_STATION',
  'Gangtok': 'HILL_STATION',
  'Ooty': 'HILL_STATION',
  'Kodaikanal': 'HILL_STATION',
  'Munnar': 'HILL_STATION',
  'Coorg': 'HILL_STATION',
  'Leh Ladakh': 'HILL_STATION',
  'Kashmir': 'HILL_STATION',
  'Srinagar': 'HILL_STATION',
  'Gulmarg': 'HILL_STATION',
  'Pahalgam': 'HILL_STATION',
  
  // Desert destinations
  'Rajasthan': 'DESERT_DESTINATION',
  'Jaisalmer': 'DESERT_DESTINATION',
  'Jodhpur': 'DESERT_DESTINATION',
  'Bikaner': 'DESERT_DESTINATION',
  'Pushkar': 'DESERT_DESTINATION',
  'Mount Abu': 'HILL_STATION', // Exception - hill station in Rajasthan
  
  // Cultural cities
  'Delhi': 'CULTURAL_CITY',
  'Agra': 'CULTURAL_CITY',
  'Jaipur': 'CULTURAL_CITY',
  'Udaipur': 'CULTURAL_CITY',
  'Varanasi': 'CULTURAL_CITY',
  'Kolkata': 'CULTURAL_CITY',
  'Hyderabad': 'CULTURAL_CITY',
  'Bangalore': 'CULTURAL_CITY',
  'Pune': 'CULTURAL_CITY',
  'Ahmedabad': 'CULTURAL_CITY',
  'Lucknow': 'CULTURAL_CITY',
  'Bhopal': 'CULTURAL_CITY',
  'Indore': 'CULTURAL_CITY',
  'Mysore': 'CULTURAL_CITY',
  'Amritsar': 'CULTURAL_CITY',
  'Chandigarh': 'CULTURAL_CITY',
  'Kochi': 'CULTURAL_CITY',
  'Thiruvananthapuram': 'CULTURAL_CITY',
  'Bhubaneswar': 'CULTURAL_CITY',
  'Patna': 'CULTURAL_CITY',
  'Raipur': 'CULTURAL_CITY',
  'Nashik': 'CULTURAL_CITY',
  'Aurangabad': 'CULTURAL_CITY',
  'Gwalior': 'CULTURAL_CITY',
  'Ujjain': 'CULTURAL_CITY',
  'Madurai': 'CULTURAL_CITY',
  'Trichy': 'CULTURAL_CITY',
  'Coimbatore': 'CULTURAL_CITY',
  'Salem': 'CULTURAL_CITY',
  'Erode': 'CULTURAL_CITY',
  'Tirupati': 'CULTURAL_CITY',
  'Vijayawada': 'CULTURAL_CITY',
  'Visakhapatnam': 'CULTURAL_CITY',
  'Guntur': 'CULTURAL_CITY',
  'Nellore': 'CULTURAL_CITY',
  'Kurnool': 'CULTURAL_CITY',
  'Rajahmundry': 'CULTURAL_CITY',
  'Kakinada': 'CULTURAL_CITY',
  'Eluru': 'CULTURAL_CITY',
  'Ongole': 'CULTURAL_CITY',
  'Nandyal': 'CULTURAL_CITY',
  'Machilipatnam': 'CULTURAL_CITY',
  'Adoni': 'CULTURAL_CITY',
  'Tenali': 'CULTURAL_CITY',
  'Proddatur': 'CULTURAL_CITY',
  'Chittoor': 'CULTURAL_CITY',
  'Hindupur': 'CULTURAL_CITY',
  'Bhimavaram': 'CULTURAL_CITY',
  'Madanapalle': 'CULTURAL_CITY',
  'Guntakal': 'CULTURAL_CITY',
  'Dharmavaram': 'CULTURAL_CITY',
  'Gudivada': 'CULTURAL_CITY',
  'Narasaraopet': 'CULTURAL_CITY',
  'Kadapa': 'CULTURAL_CITY',
  'Tadipatri': 'CULTURAL_CITY',
  'Mangalagiri': 'CULTURAL_CITY',
  'Chirala': 'CULTURAL_CITY',
  'Uravakonda': 'CULTURAL_CITY',
  'Sullurpeta': 'CULTURAL_CITY',
  'Gudur': 'CULTURAL_CITY',
  'Nagari': 'CULTURAL_CITY',
  'Puttur': 'CULTURAL_CITY',
  'Rayachoti': 'CULTURAL_CITY',
  'Srikalahasti': 'CULTURAL_CITY',
  'Bapatla': 'CULTURAL_CITY',
  'Palacole': 'CULTURAL_CITY',
  'Kavali': 'CULTURAL_CITY',
  'Tadepalligudem': 'CULTURAL_CITY',
  'Amaravathi': 'CULTURAL_CITY',
  'Bhadrachalam': 'CULTURAL_CITY',
  'Jammalamadugu': 'CULTURAL_CITY',
  'Ponnur': 'CULTURAL_CITY',
  'Kandukur': 'CULTURAL_CITY',
  'Repalle': 'CULTURAL_CITY',
  'Vinukonda': 'CULTURAL_CITY',
  'Jaggaiahpet': 'CULTURAL_CITY',
  'Rajam': 'CULTURAL_CITY',
  'Salur': 'CULTURAL_CITY',
  'Sattenapalle': 'CULTURAL_CITY',
  'Wanaparthy': 'CULTURAL_CITY',
  'Yerraguntla': 'CULTURAL_CITY',
  'Bobbili': 'CULTURAL_CITY',
  'Narasapuram': 'CULTURAL_CITY',
  'Kovvur': 'CULTURAL_CITY',
  'Tiruvuru': 'CULTURAL_CITY',
  'Uravakonda': 'CULTURAL_CITY',
  'Venkatagiri': 'CULTURAL_CITY',
  'Piduguralla': 'CULTURAL_CITY',
  'Banaganapalle': 'CULTURAL_CITY',
  'Markapur': 'CULTURAL_CITY',
  'Parvathipuram': 'CULTURAL_CITY',
  'Macherla': 'CULTURAL_CITY',
  'Gooty': 'CULTURAL_CITY',
  'Chilakaluripet': 'CULTURAL_CITY',
  'Yemmiganur': 'CULTURAL_CITY',
  'Kadiri': 'CULTURAL_CITY',
  'Bethamcherla': 'CULTURAL_CITY',
  'Rajampet': 'CULTURAL_CITY',
  'Srikakulam': 'CULTURAL_CITY',
  'Penukonda': 'CULTURAL_CITY',
  'Punganur': 'CULTURAL_CITY',
  'Nidadavole': 'CULTURAL_CITY',
  'Ichchapuram': 'CULTURAL_CITY',
  'Palasa': 'CULTURAL_CITY',
  'Kondapalle': 'CULTURAL_CITY',
  'Rameswaram': 'CULTURAL_CITY',
  'Thanjavur': 'CULTURAL_CITY',
  'Kumbakonam': 'CULTURAL_CITY',
  'Mayiladuthurai': 'CULTURAL_CITY',
  'Chidambaram': 'CULTURAL_CITY',
  'Cuddalore': 'CULTURAL_CITY',
  'Villupuram': 'CULTURAL_CITY',
  'Tindivanam': 'CULTURAL_CITY',
  'Gingee': 'CULTURAL_CITY',
  'Sirkazhi': 'CULTURAL_CITY',
  'Vridhachalam': 'CULTURAL_CITY',
  'Panruti': 'CULTURAL_CITY',
  'Neyveli': 'CULTURAL_CITY',
  'Tittakudi': 'CULTURAL_CITY',
  'Parangipettai': 'CULTURAL_CITY',
  'Bhuvanagiri': 'CULTURAL_CITY',
  'Chengalpattu': 'CULTURAL_CITY',
  'Tambaram': 'CULTURAL_CITY',
  'Pallavaram': 'CULTURAL_CITY',
  'Chromepet': 'CULTURAL_CITY',
  'Madambakkam': 'CULTURAL_CITY',
  'Selaiyur': 'CULTURAL_CITY',
  'Urapakkam': 'CULTURAL_CITY',
  'Guduvanchery': 'CULTURAL_CITY',
  'Maraimalai Nagar': 'CULTURAL_CITY',
  'Thiruporur': 'CULTURAL_CITY',
  'Madurantakam': 'CULTURAL_CITY',
  'Uthiramerur': 'CULTURAL_CITY',
  'Kancheepuram': 'CULTURAL_CITY',
  'Sriperumbudur': 'CULTURAL_CITY',
  'Arakkonam': 'CULTURAL_CITY',
  'Ranipet': 'CULTURAL_CITY',
  'Arcot': 'CULTURAL_CITY',
  'Sholinghur': 'CULTURAL_CITY',
  'Walajapet': 'CULTURAL_CITY',
  'Kaveripakkam': 'CULTURAL_CITY',
  'Vellore': 'CULTURAL_CITY',
  'Katpadi': 'CULTURAL_CITY',
  'Gudiyatham': 'CULTURAL_CITY',
  'Vaniyambadi': 'CULTURAL_CITY',
  'Ambur': 'CULTURAL_CITY',
  'Tirupattur': 'CULTURAL_CITY',
  'Hosur': 'CULTURAL_CITY',
  'Krishnagiri': 'CULTURAL_CITY',
  'Dharmapuri': 'CULTURAL_CITY',
  'Harur': 'CULTURAL_CITY',
  'Palakkodu': 'CULTURAL_CITY',
  'Pennagaram': 'CULTURAL_CITY',
  'Pochampalli': 'CULTURAL_CITY',
  'Uthangarai': 'CULTURAL_CITY',
  'Bargur': 'CULTURAL_CITY',
  'Shoolagiri': 'CULTURAL_CITY',
  'Kelamangalam': 'CULTURAL_CITY',
  'Bhopal': 'CULTURAL_CITY',
  'Indore': 'CULTURAL_CITY',
  'Gwalior': 'CULTURAL_CITY',
  'Jabalpur': 'CULTURAL_CITY',
  'Ujjain': 'CULTURAL_CITY',
  'Sagar': 'CULTURAL_CITY',
  'Dewas': 'CULTURAL_CITY',
  'Satna': 'CULTURAL_CITY',
  'Ratlam': 'CULTURAL_CITY',
  'Rewa': 'CULTURAL_CITY',
  'Murwara': 'CULTURAL_CITY',
  'Singrauli': 'CULTURAL_CITY',
  'Burhanpur': 'CULTURAL_CITY',
  'Khandwa': 'CULTURAL_CITY',
  'Morena': 'CULTURAL_CITY',
  'Bhind': 'CULTURAL_CITY',
  'Chhindwara': 'CULTURAL_CITY',
  'Guna': 'CULTURAL_CITY',
  'Shivpuri': 'CULTURAL_CITY',
  'Vidisha': 'CULTURAL_CITY',
  'Chhatarpur': 'CULTURAL_CITY',
  'Damoh': 'CULTURAL_CITY',
  'Mandsaur': 'CULTURAL_CITY',
  'Khargone': 'CULTURAL_CITY',
  'Neemuch': 'CULTURAL_CITY',
  'Pithampur': 'CULTURAL_CITY',
  'Narmadapuram': 'CULTURAL_CITY',
  'Itarsi': 'CULTURAL_CITY',
  'Sehore': 'CULTURAL_CITY',
  'Mhow': 'CULTURAL_CITY',
  'Seoni': 'CULTURAL_CITY',
  'Balaghat': 'CULTURAL_CITY',
  'Mandla': 'CULTURAL_CITY',
  'Raisen': 'CULTURAL_CITY',
  'Betul': 'CULTURAL_CITY',
  'Kymore': 'CULTURAL_CITY',
  'Maihar': 'CULTURAL_CITY',
  'Narsinghpur': 'CULTURAL_CITY',
  'Nagda': 'CULTURAL_CITY',
  'Datia': 'CULTURAL_CITY',
  'Nagpur': 'CULTURAL_CITY',
  'Nashik': 'CULTURAL_CITY',
  'Pune': 'CULTURAL_CITY',
  'Thane': 'CULTURAL_CITY',
  'Pimpri-Chinchwad': 'CULTURAL_CITY',
  'Vasai-Virar': 'CULTURAL_CITY',
  'Aurangabad': 'CULTURAL_CITY',
  'Navi Mumbai': 'CULTURAL_CITY',
  'Solapur': 'CULTURAL_CITY',
  'Mira-Bhayandar': 'CULTURAL_CITY',
  'Bhiwandi': 'CULTURAL_CITY',
  'Amravati': 'CULTURAL_CITY',
  'Nanded': 'CULTURAL_CITY',
  'Kolhapur': 'CULTURAL_CITY',
  'Akola': 'CULTURAL_CITY',
  'Latur': 'CULTURAL_CITY',
  'Dhule': 'CULTURAL_CITY',
  'Ahmednagar': 'CULTURAL_CITY',
  'Chandrapur': 'CULTURAL_CITY',
  'Parbhani': 'CULTURAL_CITY',
  'Ichalkaranji': 'CULTURAL_CITY',
  'Jalgaon': 'CULTURAL_CITY',
  'Bhusawal': 'CULTURAL_CITY',
  'Panvel': 'CULTURAL_CITY',
  'Badlapur': 'CULTURAL_CITY',
  'Beed': 'CULTURAL_CITY',
  'Gondia': 'CULTURAL_CITY',
  'Satara': 'CULTURAL_CITY',
  'Barshi': 'CULTURAL_CITY',
  'Yavatmal': 'CULTURAL_CITY',
  'Achalpur': 'CULTURAL_CITY',
  'Osmanabad': 'CULTURAL_CITY',
  'Nandurbar': 'CULTURAL_CITY',
  'Wardha': 'CULTURAL_CITY',
  'Udgir': 'CULTURAL_CITY',
  'Hinganghat': 'CULTURAL_CITY',
  'Vietnam': 'CULTURAL_CITY',
  'Dubai': 'DESERT_DESTINATION',
  'Thailand': 'CULTURAL_CITY',
  'Singapore': 'CULTURAL_CITY',
  'Malaysia': 'CULTURAL_CITY',
  'Indonesia': 'CULTURAL_CITY',
  'Nepal': 'HILL_STATION',
  'Bhutan': 'HILL_STATION',
  'Sri Lanka': 'BEACH_DESTINATION',
  'Maldives': 'BEACH_DESTINATION',
  'Turkey': 'CULTURAL_CITY',
  'Egypt': 'CULTURAL_CITY',
  'Jordan': 'DESERT_DESTINATION',
  'Morocco': 'DESERT_DESTINATION',
  'UAE': 'DESERT_DESTINATION',
  'Qatar': 'DESERT_DESTINATION',
  'Oman': 'DESERT_DESTINATION',
  'Saudi Arabia': 'DESERT_DESTINATION',
  'Iran': 'CULTURAL_CITY',
  'Iraq': 'CULTURAL_CITY',
  'Afghanistan': 'CULTURAL_CITY',
  'Pakistan': 'CULTURAL_CITY',
  'Bangladesh': 'CULTURAL_CITY',
  'Myanmar': 'CULTURAL_CITY',
  'Cambodia': 'CULTURAL_CITY',
  'Laos': 'CULTURAL_CITY',
  'Philippines': 'BEACH_DESTINATION',
  'Japan': 'CULTURAL_CITY',
  'South Korea': 'CULTURAL_CITY',
  'China': 'CULTURAL_CITY',
  'Mongolia': 'CULTURAL_CITY',
  'Russia': 'CULTURAL_CITY',
  'Kazakhstan': 'CULTURAL_CITY',
  'Kyrgyzstan': 'HILL_STATION',
  'Tajikistan': 'HILL_STATION',
  'Uzbekistan': 'CULTURAL_CITY',
  'Turkmenistan': 'DESERT_DESTINATION',
  'Azerbaijan': 'CULTURAL_CITY',
  'Armenia': 'CULTURAL_CITY',
  'Georgia': 'CULTURAL_CITY',
  'Israel': 'CULTURAL_CITY',
  'Palestine': 'CULTURAL_CITY',
  'Lebanon': 'CULTURAL_CITY',
  'Syria': 'CULTURAL_CITY',
  'Cyprus': 'BEACH_DESTINATION',
  'Greece': 'BEACH_DESTINATION',
  'Italy': 'CULTURAL_CITY',
  'Spain': 'CULTURAL_CITY',
  'France': 'CULTURAL_CITY',
  'Portugal': 'CULTURAL_CITY',
  'Germany': 'CULTURAL_CITY',
  'Austria': 'CULTURAL_CITY',
  'Switzerland': 'HILL_STATION',
  'Netherlands': 'CULTURAL_CITY',
  'Belgium': 'CULTURAL_CITY',
  'Luxembourg': 'CULTURAL_CITY',
  'United Kingdom': 'CULTURAL_CITY',
  'Ireland': 'CULTURAL_CITY',
  'Iceland': 'CULTURAL_CITY',
  'Norway': 'CULTURAL_CITY',
  'Sweden': 'CULTURAL_CITY',
  'Finland': 'CULTURAL_CITY',
  'Denmark': 'CULTURAL_CITY',
  'Poland': 'CULTURAL_CITY',
  'Czech Republic': 'CULTURAL_CITY',
  'Slovakia': 'CULTURAL_CITY',
  'Hungary': 'CULTURAL_CITY',
  'Romania': 'CULTURAL_CITY',
  'Bulgaria': 'CULTURAL_CITY',
  'Serbia': 'CULTURAL_CITY',
  'Montenegro': 'CULTURAL_CITY',
  'Bosnia and Herzegovina': 'CULTURAL_CITY',
  'Croatia': 'CULTURAL_CITY',
  'Slovenia': 'CULTURAL_CITY',
  'Albania': 'CULTURAL_CITY',
  'North Macedonia': 'CULTURAL_CITY',
  'Kosovo': 'CULTURAL_CITY',
  'Moldova': 'CULTURAL_CITY',
  'Ukraine': 'CULTURAL_CITY',
  'Belarus': 'CULTURAL_CITY',
  'Lithuania': 'CULTURAL_CITY',
  'Latvia': 'CULTURAL_CITY',
  'Estonia': 'CULTURAL_CITY',
  'Malta': 'BEACH_DESTINATION',
  'San Marino': 'CULTURAL_CITY',
  'Vatican City': 'CULTURAL_CITY',
  'Monaco': 'CULTURAL_CITY',
  'Andorra': 'CULTURAL_CITY',
  'Liechtenstein': 'CULTURAL_CITY',
  'Canada': 'CULTURAL_CITY',
  'United States': 'CULTURAL_CITY',
  'Mexico': 'CULTURAL_CITY',
  'Guatemala': 'CULTURAL_CITY',
  'Belize': 'BEACH_DESTINATION',
  'El Salvador': 'CULTURAL_CITY',
  'Honduras': 'CULTURAL_CITY',
  'Nicaragua': 'CULTURAL_CITY',
  'Costa Rica': 'CULTURAL_CITY',
  'Panama': 'CULTURAL_CITY',
  'Cuba': 'BEACH_DESTINATION',
  'Jamaica': 'BEACH_DESTINATION',
  'Haiti': 'CULTURAL_CITY',
  'Dominican Republic': 'BEACH_DESTINATION',
  'Puerto Rico': 'BEACH_DESTINATION',
  'Trinidad and Tobago': 'BEACH_DESTINATION',
  'Barbados': 'BEACH_DESTINATION',
  'Saint Lucia': 'BEACH_DESTINATION',
  'Grenada': 'BEACH_DESTINATION',
  'Saint Vincent and the Grenadines': 'BEACH_DESTINATION',
  'Antigua and Barbuda': 'BEACH_DESTINATION',
  'Dominica': 'BEACH_DESTINATION',
  'Saint Kitts and Nevis': 'BEACH_DESTINATION',
  'Bahamas': 'BEACH_DESTINATION',
  'Colombia': 'CULTURAL_CITY',
  'Venezuela': 'CULTURAL_CITY',
  'Guyana': 'CULTURAL_CITY',
  'Suriname': 'CULTURAL_CITY',
  'French Guiana': 'CULTURAL_CITY',
  'Brazil': 'CULTURAL_CITY',
  'Ecuador': 'CULTURAL_CITY',
  'Peru': 'CULTURAL_CITY',
  'Bolivia': 'CULTURAL_CITY',
  'Paraguay': 'CULTURAL_CITY',
  'Uruguay': 'CULTURAL_CITY',
  'Argentina': 'CULTURAL_CITY',
  'Chile': 'CULTURAL_CITY',
  'Falkland Islands': 'CULTURAL_CITY',
  'South Georgia and the South Sandwich Islands': 'CULTURAL_CITY',
  'Morocco': 'DESERT_DESTINATION',
  'Algeria': 'DESERT_DESTINATION',
  'Tunisia': 'CULTURAL_CITY',
  'Libya': 'DESERT_DESTINATION',
  'Egypt': 'CULTURAL_CITY',
  'Sudan': 'DESERT_DESTINATION',
  'South Sudan': 'CULTURAL_CITY',
  'Chad': 'DESERT_DESTINATION',
  'Niger': 'DESERT_DESTINATION',
  'Mali': 'DESERT_DESTINATION',
  'Burkina Faso': 'CULTURAL_CITY',
  'Mauritania': 'DESERT_DESTINATION',
  'Senegal': 'CULTURAL_CITY',
  'Gambia': 'CULTURAL_CITY',
  'Guinea-Bissau': 'CULTURAL_CITY',
  'Guinea': 'CULTURAL_CITY',
  'Sierra Leone': 'CULTURAL_CITY',
  'Liberia': 'CULTURAL_CITY',
  'Ivory Coast': 'CULTURAL_CITY',
  'Ghana': 'CULTURAL_CITY',
  'Togo': 'CULTURAL_CITY',
  'Benin': 'CULTURAL_CITY',
  'Nigeria': 'CULTURAL_CITY',
  'Cameroon': 'CULTURAL_CITY',
  'Equatorial Guinea': 'CULTURAL_CITY',
  'Gabon': 'CULTURAL_CITY',
  'Republic of the Congo': 'CULTURAL_CITY',
  'Democratic Republic of the Congo': 'CULTURAL_CITY',
  'Central African Republic': 'CULTURAL_CITY',
  'Ethiopia': 'CULTURAL_CITY',
  'Eritrea': 'CULTURAL_CITY',
  'Djibouti': 'CULTURAL_CITY',
  'Somalia': 'CULTURAL_CITY',
  'Kenya': 'CULTURAL_CITY',
  'Uganda': 'CULTURAL_CITY',
  'Rwanda': 'CULTURAL_CITY',
  'Burundi': 'CULTURAL_CITY',
  'Tanzania': 'CULTURAL_CITY',
  'Malawi': 'CULTURAL_CITY',
  'Zambia': 'CULTURAL_CITY',
  'Angola': 'CULTURAL_CITY',
  'Namibia': 'DESERT_DESTINATION',
  'Botswana': 'DESERT_DESTINATION',
  'Zimbabwe': 'CULTURAL_CITY',
  'Mozambique': 'BEACH_DESTINATION',
  'Madagascar': 'CULTURAL_CITY',
  'Mauritius': 'BEACH_DESTINATION',
  'Comoros': 'BEACH_DESTINATION',
  'Seychelles': 'BEACH_DESTINATION',
  'South Africa': 'CULTURAL_CITY',
  'Lesotho': 'CULTURAL_CITY',
  'Swaziland': 'CULTURAL_CITY',
  'Australia': 'CULTURAL_CITY',
  'New Zealand': 'CULTURAL_CITY',
  'Papua New Guinea': 'CULTURAL_CITY',
  'Fiji': 'BEACH_DESTINATION',
  'Solomon Islands': 'BEACH_DESTINATION',
  'Vanuatu': 'BEACH_DESTINATION',
  'New Caledonia': 'BEACH_DESTINATION',
  'French Polynesia': 'BEACH_DESTINATION',
  'Wallis and Futuna': 'BEACH_DESTINATION',
  'Samoa': 'BEACH_DESTINATION',
  'American Samoa': 'BEACH_DESTINATION',
  'Tonga': 'BEACH_DESTINATION',
  'Niue': 'BEACH_DESTINATION',
  'Cook Islands': 'BEACH_DESTINATION',
  'Kiribati': 'BEACH_DESTINATION',
  'Tuvalu': 'BEACH_DESTINATION',
  'Nauru': 'BEACH_DESTINATION',
  'Marshall Islands': 'BEACH_DESTINATION',
  'Micronesia': 'BEACH_DESTINATION',
  'Palau': 'BEACH_DESTINATION',
  'Northern Mariana Islands': 'BEACH_DESTINATION',
  'Guam': 'BEACH_DESTINATION',
  'Wake Island': 'BEACH_DESTINATION',
  'Midway Atoll': 'BEACH_DESTINATION',
  'Johnston Atoll': 'BEACH_DESTINATION',
  'Palmyra Atoll': 'BEACH_DESTINATION',
  'Kingman Reef': 'BEACH_DESTINATION',
  'Jarvis Island': 'BEACH_DESTINATION',
  'Baker Island': 'BEACH_DESTINATION',
  'Howland Island': 'BEACH_DESTINATION',
  'American Samoa': 'BEACH_DESTINATION',
  'Virgin Islands': 'BEACH_DESTINATION',
  'Puerto Rico': 'BEACH_DESTINATION',
  'Guam': 'BEACH_DESTINATION',
  'Northern Mariana Islands': 'BEACH_DESTINATION',
  'United States Minor Outlying Islands': 'BEACH_DESTINATION'
}

async function seedLocationSeasonalPeriods() {
  try {
    console.log('🌍 Starting location seasonal periods seeding...')
    
    // Get all locations from database
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        label: true
      }
    })
    
    console.log(`📍 Found ${locations.length} locations`)
    
    let seedCount = 0
    
    for (const location of locations) {
      // Check if seasonal periods already exist
      const existingPeriods = await prisma.locationSeasonalPeriod.findMany({
        where: { locationId: location.id }
      })
      
      if (existingPeriods.length > 0) {
        console.log(`⏭️  Skipping ${location.label} - already has ${existingPeriods.length} seasonal periods`)
        continue
      }
      
      // Find matching template
      let templateKey = null
      
      // First try exact match
      if (locationTemplateMap[location.label]) {
        templateKey = locationTemplateMap[location.label]
      } else {
        // Try partial match for compound names
        for (const [pattern, template] of Object.entries(locationTemplateMap)) {
          if (location.label.toLowerCase().includes(pattern.toLowerCase()) || 
              pattern.toLowerCase().includes(location.label.toLowerCase())) {
            templateKey = template
            break
          }
        }
      }
      
      // Default to CULTURAL_CITY if no match found
      if (!templateKey) {
        templateKey = 'CULTURAL_CITY'
      }
      
      const template = seasonalTemplates[templateKey]
      
      if (template) {
        // Create seasonal periods for this location
        for (const period of template) {
          await prisma.locationSeasonalPeriod.create({
            data: {
              locationId: location.id,
              seasonType: period.seasonType,
              name: period.name,
              startMonth: period.startMonth,
              startDay: period.startDay,
              endMonth: period.endMonth,
              endDay: period.endDay,
              description: period.description,
              isActive: true
            }
          })
        }
        
        seedCount++
        console.log(`✅ Created ${template.length} seasonal periods for ${location.label} (${templateKey})`)
      }
    }
    
    console.log(`🎉 Successfully seeded seasonal periods for ${seedCount} locations`)
    
  } catch (error) {
    console.error('❌ Error seeding seasonal periods:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding
if (require.main === module) {
  seedLocationSeasonalPeriods()
    .then(() => {
      console.log('🌟 Seasonal periods seeding completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seasonal periods seeding failed:', error)
      process.exit(1)
    })
}

module.exports = { seedLocationSeasonalPeriods }
