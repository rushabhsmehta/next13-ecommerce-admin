// Script to automatically categorize tour packages as Domestic or International
// This script fetches tour packages from the database and analyzes their locations

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Define domestic locations (Indian states, cities, and regions)
const DOMESTIC_KEYWORDS = [
  // Indian states and Union Territories
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat',
  'haryana', 'himachal pradesh', 'himachal', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh',
  'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan',
  'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  
  // Union Territories
  'andaman and nicobar', 'andaman', 'nicobar', 'chandigarh', 'dadra and nagar haveli', 
  'daman and diu', 'delhi', 'jammu and kashmir', 'jammu', 'kashmir', 'ladakh', 'lakshadweep', 
  'puducherry', 'pondicherry',
  
  // Major Indian cities
  'mumbai', 'bangalore', 'bengaluru', 'hyderabad', 'ahmedabad', 'chennai', 'kolkata', 'pune',
  'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam',
  'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut',
  'rajkot', 'kalyan', 'dombivali', 'vasai', 'virar', 'varanasi', 'srinagar', 'aurangabad',
  'dhanbad', 'amritsar', 'navi mumbai', 'allahabad', 'prayagraj', 'ranchi', 'howrah', 
  'coimbatore', 'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota',
  'guwahati', 'solapur', 'hubballi', 'tiruchirappalli', 'bareilly', 'mysuru', 'tiruppur',
  'gurgaon', 'gurugram', 'aligarh', 'jalandhar', 'bhubaneswar', 'salem', 'warangal', 'guntur',
  'bhiwandi', 'saharanpur', 'gorakhpur', 'bikaner', 'amravati', 'noida', 'jamshedpur',
  'bhilai', 'cuttack', 'firozabad', 'kochi', 'ernakulam', 'bhavnagar', 'dehradun', 'durgapur',
  'asansol', 'rourkela', 'nanded', 'kolhapur', 'ajmer', 'akola', 'gulbarga', 'jamnagar',
  'ujjain', 'loni', 'siliguri', 'jhansi', 'ulhasnagar', 'jammu', 'sangli', 'miraj', 'kupwad',
  'belgaum', 'mangaluru', 'ambattur', 'tirunelveli', 'malegaon', 'gaya', 'jalgaon', 'udaipur',
  'maheshtala', 'davanagere', 'kozhikode', 'kurnool', 'rajpur sonarpur', 'rajahmundry',
  'bokaro', 'south dumdum', 'bellary', 'patiala', 'gopalpur', 'agartala', 'bhagalpur',
  'muzaffarnagar', 'bhatpara', 'panihati', 'latur', 'dhule', 'rohtak', 'korba', 'bhilwara',
  'berhampur', 'muzaffarpur', 'ahmednagar', 'mathura', 'kollam', 'avadi', 'kadapa', 'kamarhati',
  'sambalpur', 'bilaspur', 'shahjahanpur', 'satara', 'bijapur', 'rampur', 'shivamogga',
  'chandrapur', 'junagadh', 'thrissur', 'alwar', 'bardhaman', 'kulti', 'kakinada', 'nizamabad',
  'parbhani', 'tumkur', 'khammam', 'ozhukarai', 'bihar sharif', 'panipat', 'darbhanga',
  'bally', 'aizawl', 'dewas', 'ichalkaranji', 'karnal', 'bathinda', 'jalna', 'eluru', 'kirari',
  'baranagar', 'purnia', 'satna', 'mau', 'sonipat', 'farrukhabad', 'sagar', 'rourkela',
  'durg', 'imphal', 'ratlam', 'hapur', 'arrah', 'anantapur', 'karimnagar', 'etawah',
  'ambernath', 'north dumdum', 'bharatpur', 'begusarai', 'new delhi', 'gandhidham', 'baranagar',
  'tiruvottiyur', 'puducherry', 'sikar', 'thoothukudi', 'rewa', 'mirzapur', 'raichur',
  'pali', 'ramagundam', 'silchar', 'orai', 'nellore', 'hyderabad', 'aurangabad', 'dhanbad',
  'amritsar', 'navi mumbai', 'allahabad', 'ranchi', 'howrah', 'coimbatore', 'jabalpur', 'gwalior',
  
  // Popular tourist destinations in India
  'manali', 'shimla', 'darjeeling', 'ooty', 'ootacamund', 'kodaikanal', 'munnar', 'alleppey',
  'alappuzha', 'kumarakom', 'rishikesh', 'haridwar', 'pushkar', 'udaipur', 'jaisalmer',
  'bikaner', 'ranthambore', 'jim corbett', 'corbett', 'nainital', 'mussoorie', 'dharamshala',
  'mcleodganj', 'kasol', 'spiti', 'leh', 'khardung la', 'nubra', 'pangong', 'tso moriri',
  'port blair', 'havelock', 'neil island', 'radhanagar', 'cellular jail', 'ross island',
  'gokarna', 'hampi', 'coorg', 'kodagu', 'chikmagalur', 'wayanad', 'thekkady', 'periyar',
  'kochi', 'cochin', 'fort kochi', 'trivandrum', 'thiruvananthapuram', 'varkala', 'kovalam',
  'mysore', 'mysuru', 'mahabalipuram', 'mamallapuram', 'kanyakumari', 'rameswaram', 'thanjavur',
  'tirupati', 'tirumala', 'araku', 'puri', 'konark', 'chilika', 'jagannath', 'gangtok',
  'pelling', 'yuksom', 'lachung', 'lachen', 'nathu la', 'tsomgo', 'changu', 'shillong',
  'cherrapunji', 'mawlynnong', 'dawki', 'kaziranga', 'majuli', 'tezpur', 'dibrugarh',
  'jorhat', 'sivasagar', 'haflong', 'diphu', 'kohima', 'dimapur', 'imphal', 'loktak',
  'keibul lamjao', 'moreh', 'ukhrul', 'agartala', 'udaipur tripura', 'kailashahar',
  'dharmanagar', 'ambassa', 'belonia', 'khowai', 'teliamura', 'mount abu', 'dilwara',
  'nakki lake', 'guru shikhar', 'achalgarh', 'dalhousie', 'khajjiar', 'chamba', 'mcleod ganj',
  'bir', 'billing', 'tirthan', 'jibhi', 'shoja', 'kullu', 'solang', 'rohtang', 'keylong',
  'kaza', 'chandratal', 'baralacha', 'sarchu', 'magnetic hill', 'hemis', 'thiksey', 'shey',
  'alchi', 'lamayuru', 'mulbekh', 'kargil', 'drass', 'sonamarg', 'gulmarg', 'pahalgam',
  'betaab valley', 'aru valley', 'baisaran', 'chandanwari', 'amarnath', 'vaishno devi',
  'patnitop', 'bhaderwah', 'kishtwar', 'doda', 'ramban', 'banihal', 'qazigund', 'anantnag',
  'kokernag', 'verinag', 'achabal', 'martand', 'awantipora', 'pampore', 'chashmashahi',
  'nishat', 'shalimar', 'dal lake', 'nagin lake', 'wular lake', 'manasbal', 'gangbal',
  'vishansar', 'krishansar', 'tarsar', 'marsar', 'tulian lake', 'sheshnag', 'panchtarni',
  
  // General India identifiers
  'india', 'indian', 'bharat', 'hindustan'
];

// Define international keywords
const INTERNATIONAL_KEYWORDS = [
  // Countries
  'afghanistan', 'albania', 'algeria', 'andorra', 'angola', 'argentina', 'armenia', 'australia',
  'austria', 'azerbaijan', 'bahamas', 'bahrain', 'bangladesh', 'barbados', 'belarus', 'belgium',
  'belize', 'benin', 'bhutan', 'bolivia', 'bosnia', 'herzegovina', 'botswana', 'brazil', 'brunei',
  'bulgaria', 'burkina faso', 'burundi', 'cambodia', 'cameroon', 'canada', 'cape verde',
  'central african republic', 'chad', 'chile', 'china', 'colombia', 'comoros', 'congo',
  'costa rica', 'croatia', 'cuba', 'cyprus', 'czech republic', 'denmark', 'djibouti', 'dominica',
  'dominican republic', 'ecuador', 'egypt', 'el salvador', 'equatorial guinea', 'eritrea',
  'estonia', 'eswatini', 'ethiopia', 'fiji', 'finland', 'france', 'gabon', 'gambia', 'georgia',
  'germany', 'ghana', 'greece', 'grenada', 'guatemala', 'guinea', 'guyana', 'haiti', 'honduras',
  'hungary', 'iceland', 'indonesia', 'iran', 'iraq', 'ireland', 'israel', 'italy', 'jamaica',
  'japan', 'jordan', 'kazakhstan', 'kenya', 'kiribati', 'north korea', 'south korea', 'kuwait',
  'kyrgyzstan', 'laos', 'latvia', 'lebanon', 'lesotho', 'liberia', 'libya', 'liechtenstein',
  'lithuania', 'luxembourg', 'madagascar', 'malawi', 'malaysia', 'maldives', 'mali', 'malta',
  'marshall islands', 'mauritania', 'mauritius', 'mexico', 'micronesia', 'moldova', 'monaco',
  'mongolia', 'montenegro', 'morocco', 'mozambique', 'myanmar', 'namibia', 'nauru', 'nepal',
  'netherlands', 'new zealand', 'nicaragua', 'niger', 'nigeria', 'north macedonia', 'norway',
  'oman', 'pakistan', 'palau', 'panama', 'papua new guinea', 'paraguay', 'peru', 'philippines',
  'poland', 'portugal', 'qatar', 'romania', 'russia', 'rwanda', 'saint kitts', 'saint lucia',
  'saint vincent', 'samoa', 'san marino', 'sao tome', 'saudi arabia', 'senegal', 'serbia',
  'seychelles', 'sierra leone', 'singapore', 'slovakia', 'slovenia', 'solomon islands', 'somalia',
  'south africa', 'south sudan', 'spain', 'sri lanka', 'sudan', 'suriname', 'sweden', 'switzerland',
  'syria', 'taiwan', 'tajikistan', 'tanzania', 'thailand', 'timor-leste', 'togo', 'tonga',
  'trinidad', 'tobago', 'tunisia', 'turkey', 'turkmenistan', 'tuvalu', 'uganda', 'ukraine',
  'united arab emirates', 'uae', 'emirates', 'united kingdom', 'uk', 'britain', 'england',
  'scotland', 'wales', 'northern ireland', 'united states', 'usa', 'america', 'uruguay',
  'uzbekistan', 'vanuatu', 'vatican', 'venezuela', 'vietnam', 'yemen', 'zambia', 'zimbabwe',
  
  // International cities and destinations
  'dubai', 'abu dhabi', 'sharjah', 'ajman', 'fujairah', 'ras al khaimah', 'umm al quwain',
  'doha', 'riyadh', 'jeddah', 'mecca', 'medina', 'dammam', 'tabuk', 'abha', 'kuwait city',
  'muscat', 'salalah', 'nizwa', 'sur', 'sohar', 'bangkok', 'phuket', 'pattaya', 'chiang mai',
  'chiang rai', 'krabi', 'koh samui', 'koh phi phi', 'ayutthaya', 'sukhothai', 'hua hin',
  'kuala lumpur', 'penang', 'langkawi', 'malacca', 'kota kinabalu', 'kuching', 'johor bahru',
  'singapore', 'sentosa', 'marina bay', 'clarke quay', 'orchard road', 'little india',
  'chinatown', 'bali', 'denpasar', 'ubud', 'sanur', 'nusa dua', 'kuta', 'seminyak', 'canggu',
  'jakarta', 'yogyakarta', 'bandung', 'surabaya', 'medan', 'semarang', 'lombok', 'gili islands',
  'flores', 'komodo', 'manila', 'cebu', 'boracay', 'palawan', 'baguio', 'davao', 'iloilo',
  'hong kong', 'victoria peak', 'tsim sha tsui', 'central', 'causeway bay', 'macau', 'taipa',
  'cotai', 'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'xian', 'chengdu', 'hangzhou',
  'suzhou', 'nanjing', 'wuhan', 'chongqing', 'tianjin', 'harbin', 'shenyang', 'dalian',
  'qingdao', 'xiamen', 'kunming', 'guilin', 'yangshuo', 'zhangjiajie', 'huangshan', 'lhasa',
  'tokyo', 'osaka', 'kyoto', 'hiroshima', 'nara', 'nikko', 'hakone', 'mount fuji', 'takayama',
  'kanazawa', 'sendai', 'sapporo', 'nagoya', 'kobe', 'yokohama', 'fukuoka', 'okinawa',
  'seoul', 'busan', 'jeju', 'incheon', 'daegu', 'daejeon', 'gwangju', 'suwon', 'ulsan',
  'jeonju', 'gyeongju', 'andong', 'sokcho', 'gangneung', 'taipei', 'kaohsiung', 'taichung',
  'tainan', 'hualien', 'taroko', 'sun moon lake', 'alishan', 'kenting', 'hanoi', 'ho chi minh',
  'saigon', 'da nang', 'hoi an', 'hue', 'nha trang', 'phu quoc', 'sapa', 'halong bay',
  'siem reap', 'angkor wat', 'phnom penh', 'sihanoukville', 'battambang', 'kampot', 'kep',
  'vientiane', 'luang prabang', 'vang vieng', 'pakse', 'savannakhet', 'thakhek', 'yangon',
  'mandalay', 'bagan', 'inle lake', 'naypyidaw', 'mawlamyine', 'pathein', 'taunggyi',
  'male', 'hulhule', 'maafushi', 'thulusdhoo', 'guraidhoo', 'colombo', 'kandy', 'galle',
  'sigiriya', 'anuradhapura', 'polonnaruwa', 'ella', 'nuwara eliya', 'bentota', 'hikkaduwa',
  'mirissa', 'arugam bay', 'kathmandu', 'pokhara', 'lumbini', 'chitwan', 'everest', 'annapurna',
  'mustang', 'thimphu', 'paro', 'punakha', 'wangdue', 'trongsa', 'bumthang', 'dhaka',
  'chittagong', 'sylhet', 'cox bazar', 'sundarbans', 'rangamati', 'bandarban', 'khulna',
  'istanbul', 'ankara', 'izmir', 'antalya', 'cappadocia', 'pamukkale', 'ephesus', 'bodrum',
  'kas', 'fethiye', 'marmaris', 'side', 'alanya', 'trabzon', 'bursa', 'konya', 'gaziantep',
  'cairo', 'alexandria', 'luxor', 'aswan', 'hurghada', 'sharm el sheikh', 'dahab', 'marsa alam',
  'siwa', 'abu simbel', 'karnak', 'valley of kings', 'casablanca', 'marrakech', 'fez', 'rabat',
  'tangier', 'agadir', 'essaouira', 'meknes', 'chefchaouen', 'ouarzazate', 'merzouga',
  'tunis', 'sousse', 'hammamet', 'monastir', 'kairouan', 'tozeur', 'djerba', 'sidi bou said',
  'algiers', 'oran', 'constantine', 'annaba', 'setif', 'batna', 'blida', 'biskra',
  'london', 'manchester', 'edinburgh', 'glasgow', 'liverpool', 'birmingham', 'bristol',
  'leeds', 'sheffield', 'bradford', 'cardiff', 'belfast', 'brighton', 'oxford', 'cambridge',
  'bath', 'york', 'canterbury', 'stonehenge', 'windsor', 'stratford', 'lake district',
  'cotswolds', 'scottish highlands', 'isle of skye', 'loch ness', 'ben nevis', 'snowdonia',
  'paris', 'lyon', 'marseille', 'nice', 'toulouse', 'strasbourg', 'bordeaux', 'lille',
  'rennes', 'reims', 'nancy', 'metz', 'orleans', 'tours', 'angers', 'dijon', 'besancon',
  'versailles', 'fontainebleau', 'loire valley', 'normandy', 'brittany', 'provence', 'alps',
  'pyrenees', 'riviera', 'cannes', 'monaco', 'antibes', 'saint tropez', 'avignon', 'arles',
  'rome', 'milan', 'venice', 'florence', 'naples', 'turin', 'bologna', 'genoa', 'palermo',
  'catania', 'bari', 'messina', 'verona', 'padua', 'trieste', 'perugia', 'pisa', 'siena',
  'amalfi', 'cinque terre', 'tuscany', 'sicily', 'sardinia', 'capri', 'pompeii', 'vatican',
  'madrid', 'barcelona', 'valencia', 'seville', 'bilbao', 'granada', 'toledo', 'cordoba',
  'santiago', 'mallorca', 'ibiza', 'canary islands', 'andalusia', 'catalonia', 'basque',
  'galicia', 'asturias', 'castile', 'leon', 'murcia', 'extremadura', 'aragon', 'navarre',
  'berlin', 'munich', 'hamburg', 'cologne', 'frankfurt', 'stuttgart', 'dresden', 'leipzig',
  'hanover', 'nuremberg', 'dortmund', 'essen', 'bremen', 'duisburg', 'bochum', 'wuppertal',
  'bavaria', 'baden', 'wurttemberg', 'rhineland', 'westphalia', 'saxony', 'thuringia',
  'amsterdam', 'rotterdam', 'the hague', 'utrecht', 'eindhoven', 'tilburg', 'groningen',
  'breda', 'nijmegen', 'enschede', 'haarlem', 'arnhem', 'zaanstad', 'haarlemmermeer',
  'vienna', 'salzburg', 'innsbruck', 'graz', 'linz', 'klagenfurt', 'villach', 'wels',
  'hallstatt', 'melk', 'hallein', 'bad ischl', 'schonbrunn', 'melk abbey', 'wachau',
  'zurich', 'geneva', 'basel', 'bern', 'lausanne', 'winterthur', 'lucerne', 'st gallen',
  'lugano', 'biel', 'thun', 'koniz', 'la chaux', 'rapperswil', 'davos', 'st moritz',
  'brussels', 'antwerp', 'ghent', 'bruges', 'liege', 'namur', 'mons', 'aalst', 'mechelen',
  'louvain', 'kortrijk', 'hasselt', 'ostend', 'tournai', 'genk', 'seraing', 'roeselare',
  'copenhagen', 'aarhus', 'odense', 'aalborg', 'esbjerg', 'randers', 'kolding', 'horsens',
  'vejle', 'roskilde', 'herning', 'silkeborg', 'naestved', 'fredericia', 'viborg', 'elsinore',
  'stockholm', 'gothenburg', 'malmo', 'uppsala', 'vasteras', 'orebro', 'linkoping', 'helsingborg',
  'jonkoping', 'norrkoping', 'lund', 'umea', 'gavle', 'boras', 'sodertalje', 'eskilstuna',
  'oslo', 'bergen', 'trondheim', 'stavanger', 'baerum', 'kristiansand', 'fredrikstad',
  'sandnes', 'tromsø', 'sarpsborg', 'skien', 'ålesund', 'sandefjord', 'haugesund',
  'helsinki', 'espoo', 'tampere', 'vantaa', 'turku', 'oulu', 'lahti', 'kuopio', 'jyvaskyla',
  'pori', 'lappeenranta', 'vaasa', 'kotka', 'joensuu', 'hameenlinna', 'rovaniemi',
  'reykjavik', 'akureyri', 'keflavik', 'hafnarfjordur', 'akranes', 'gardabaer', 'kopavogur',
  'dublin', 'cork', 'galway', 'waterford', 'limerick', 'kilkenny', 'wexford', 'sligo',
  'drogheda', 'dundalk', 'bray', 'navan', 'ennis', 'tralee', 'carlow', 'naas', 'athlone',
  'lisbon', 'porto', 'faro', 'coimbra', 'funchal', 'amadora', 'braga', 'setubal', 'agualva',
  'queluz', 'almada', 'abrantes', 'aveiro', 'evora', 'leiria', 'cascais', 'vila nova',
  'athens', 'thessaloniki', 'patras', 'heraklion', 'larissa', 'volos', 'rhodes', 'ioannina',
  'chania', 'chalcis', 'serres', 'xanthi', 'drama', 'katerini', 'trikala', 'lamia',
  'warsaw', 'krakow', 'lodz', 'wroclaw', 'poznan', 'gdansk', 'szczecin', 'bydgoszcz',
  'lublin', 'katowice', 'bialystok', 'gdynia', 'czestochowa', 'radom', 'sosnowiec', 'torun',
  'prague', 'brno', 'ostrava', 'plzen', 'liberec', 'olomouc', 'usti nad labem', 'hradec kralove',
  'ceske budejovice', 'pardubice', 'havirov', 'zlin', 'kladno', 'most', 'opava', 'frydek',
  'budapest', 'debrecen', 'szeged', 'miskolc', 'pecs', 'gyor', 'nyiregyhaza', 'kecskemet',
  'szekesfehervar', 'szombathely', 'szolnok', 'tatabanya', 'kaposvar', 'bekes', 'zalaegerszeg',
  'bucharest', 'cluj napoca', 'timisoara', 'iasi', 'constanta', 'craiova', 'brasov', 'galati',
  'ploiesti', 'oradea', 'braila', 'arad', 'pitesti', 'sibiu', 'bacau', 'targu mures',
  'sofia', 'plovdiv', 'varna', 'burgas', 'ruse', 'stara zagora', 'pleven', 'sliven',
  'dobrich', 'shumen', 'pernik', 'haskovo', 'yambol', 'pazardzhik', 'blagoevgrad', 'veliko',
  'zagreb', 'split', 'rijeka', 'osijek', 'zadar', 'slavonski brod', 'pula', 'sesvete',
  'karlovac', 'varazdin', 'sibenik', 'sisak', 'vinkovci', 'vukovar', 'dubrovnik', 'bjelovar',
  'belgrade', 'novi sad', 'nis', 'kragujevac', 'subotica', 'zrenjanin', 'pancevo', 'cacak',
  'novi pazar', 'leskovac', 'krujevac', 'vranje', 'zajecar', 'smederevo', 'valjevo', 'kikinda',
  'ljubljana', 'maribor', 'celje', 'kranj', 'velenje', 'koper', 'novo mesto', 'ptuj',
  'trbovlje', 'kamnik', 'jesenice', 'nova gorica', 'domzale', 'skolja loka', 'idrija',
  'moscow', 'st petersburg', 'novosibirsk', 'yekaterinburg', 'nizhny novgorod', 'kazan',
  'chelyabinsk', 'omsk', 'samara', 'rostov on don', 'ufa', 'krasnoyarsk', 'perm', 'voronezh',
  'volgograd', 'krasnodar', 'saratov', 'tolyatti', 'izhevsk', 'ulyanovsk', 'barnaul',
  'vladivostok', 'irkutsk', 'khabarovsk', 'yaroslavl', 'makhachkala', 'tomsk', 'orenburg',
  'kemerovo', 'ryazan', 'tyumen', 'lipetsk', 'penza', 'astrakhan', 'tula', 'kirov',
  'cheboksary', 'kaliningrad', 'bryansk', 'ivanovo', 'magnitogorsk', 'tver', 'stavropol',
  'belgorod', 'sochi', 'murmansk', 'kaluga', 'kursk', 'oryol', 'vladimir', 'arkhangelsk',
  'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio',
  'san diego', 'dallas', 'san jose', 'austin', 'jacksonville', 'fort worth', 'columbus',
  'charlotte', 'san francisco', 'indianapolis', 'seattle', 'denver', 'washington dc',
  'boston', 'el paso', 'detroit', 'nashville', 'portland', 'memphis', 'oklahoma city',
  'las vegas', 'louisville', 'baltimore', 'milwaukee', 'albuquerque', 'tucson', 'fresno',
  'mesa', 'sacramento', 'atlanta', 'kansas city', 'colorado springs', 'miami', 'raleigh',
  'omaha', 'long beach', 'virginia beach', 'oakland', 'minneapolis', 'tulsa', 'tampa',
  'arlington', 'new orleans', 'wichita', 'cleveland', 'bakersfield', 'aurora', 'anaheim',
  'honolulu', 'santa ana', 'corpus christi', 'riverside', 'lexington', 'stockton', 'toledo',
  'st paul', 'newark', 'greensboro', 'plano', 'henderson', 'lincoln', 'buffalo', 'jersey city',
  'chula vista', 'fort wayne', 'orlando', 'st petersburg', 'chandler', 'laredo', 'norfolk',
  'madison', 'lubbock', 'irvine', 'winston salem', 'glendale', 'garland', 'hialeah', 'reno',
  'chesapeake', 'gilbert', 'baton rouge', 'irving', 'scottsdale', 'north las vegas', 'fremont',
  'boise', 'richmond', 'san bernardino', 'birmingham', 'spokane', 'rochester', 'des moines',
  'modesto', 'fayetteville', 'tacoma', 'oxnard', 'fontana', 'montgomery', 'moreno valley',
  'shreveport', 'yonkers', 'akron', 'huntington beach', 'little rock', 'augusta', 'amarillo',
  'mobile', 'grand rapids', 'salt lake city', 'tallahassee', 'huntsville', 'grand prairie',
  'knoxville', 'worcester', 'newport news', 'brownsville', 'overland park', 'santa clarita',
  'providence', 'garden grove', 'chattanooga', 'oceanside', 'jackson', 'fort lauderdale',
  'santa rosa', 'rancho cucamonga', 'port st lucie', 'tempe', 'ontario', 'vancouver',
  'st louis', 'pembroke pines', 'cape coral', 'sioux falls', 'springfield', 'peoria',
  'hayward', 'corona', 'paterson', 'palmdale', 'salinas', 'pasadena', 'joliet', 'naperville',
  'bridgeport', 'clarksville', 'lakewood', 'rockford', 'bellevue', 'memphis', 'torrance',
  'sunnyvale', 'escondido', 'mckinney', 'mesquite', 'fullerton', 'orange', 'thornton',
  'roseville', 'denton', 'waco', 'carrollton', 'surprise', 'sterling heights', 'west valley',
  'columbia', 'inglewood', 'hartford', 'pearland', 'midland', 'killeen', 'cedar rapids',
  'college station', 'baldwin park', 'miami gardens', 'thousand oaks', 'elizabeth', 'round rock',
  'el monte', 'toronto', 'montreal', 'calgary', 'ottawa', 'edmonton', 'mississauga', 'winnipeg',
  'hamilton', 'quebec city', 'brampton', 'surrey', 'laval', 'halifax', 'london ontario',
  'markham', 'vaughan', 'gatineau', 'saskatoon', 'longueuil', 'burnaby', 'regina', 'richmond',
  'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'gold coast', 'canberra', 'newcastle',
  'wollongong', 'logan city', 'geelong', 'hobart', 'townsville', 'cairns', 'toowoomba', 'darwin',
  'ballarat', 'bendigo', 'albury', 'launceston', 'mackay', 'rockhampton', 'bunbury', 'bundaberg',
  'auckland', 'wellington', 'christchurch', 'hamilton', 'tauranga', 'napier', 'hastings',
  'dunedin', 'palmerston north', 'nelson', 'rotorua', 'new plymouth', 'whangarei', 'invercargill'
];

// Function to determine if a tour package is domestic or international
function categorizeTourPackage(tourPackage) {
  // Get all text fields to analyze
  const locationLabel = tourPackage.location?.label?.toLowerCase() || '';
  const tourPackageName = tourPackage.tourPackageName?.toLowerCase() || '';
  const highlights = '';
  const customerName = tourPackage.customerName?.toLowerCase() || '';
  
  // Combine all text for analysis
  const allText = `${locationLabel} ${tourPackageName} ${customerName}`.toLowerCase();
  
  console.log(`🔍 Analyzing: "${tourPackage.tourPackageName}" (Location: ${tourPackage.location?.label})`);
  console.log(`   Text to analyze: "${allText.substring(0, 100)}..."`);
  
  // Check for domestic keywords
  const domesticMatches = DOMESTIC_KEYWORDS.filter(keyword => 
    allText.includes(keyword.toLowerCase())
  );
  
  // Check for international keywords  
  const internationalMatches = INTERNATIONAL_KEYWORDS.filter(keyword => 
    allText.includes(keyword.toLowerCase())
  );
  
  console.log(`   Domestic matches: [${domesticMatches.slice(0, 3).join(', ')}${domesticMatches.length > 3 ? '...' : ''}] (${domesticMatches.length} total)`);
  console.log(`   International matches: [${internationalMatches.slice(0, 3).join(', ')}${internationalMatches.length > 3 ? '...' : ''}] (${internationalMatches.length} total)`);
  
  // Decision logic
  if (domesticMatches.length > 0 && internationalMatches.length === 0) {
    console.log(`   ✅ Decision: DOMESTIC (${domesticMatches.length} domestic keywords found)`);
    return 'Domestic';
  } else if (internationalMatches.length > 0 && domesticMatches.length === 0) {
    console.log(`   ✅ Decision: INTERNATIONAL (${internationalMatches.length} international keywords found)`);
    return 'International';
  } else if (domesticMatches.length > 0 && internationalMatches.length > 0) {
    // Both found - use location field as primary indicator
    const locationDomestic = DOMESTIC_KEYWORDS.some(keyword => 
      locationLabel.includes(keyword.toLowerCase())
    );
    const locationInternational = INTERNATIONAL_KEYWORDS.some(keyword => 
      locationLabel.includes(keyword.toLowerCase())
    );
    
    if (locationDomestic && !locationInternational) {
      console.log(`   ✅ Decision: DOMESTIC (location field indicates domestic despite mixed signals)`);
      return 'Domestic';
    } else if (locationInternational && !locationDomestic) {
      console.log(`   ✅ Decision: INTERNATIONAL (location field indicates international despite mixed signals)`);
      return 'International';
    } else {
      // If still unclear, count which has more matches
      if (domesticMatches.length > internationalMatches.length) {
        console.log(`   ✅ Decision: DOMESTIC (more domestic keywords: ${domesticMatches.length} vs ${internationalMatches.length})`);
        return 'Domestic';
      } else {
        console.log(`   ✅ Decision: INTERNATIONAL (more international keywords: ${internationalMatches.length} vs ${domesticMatches.length})`);
        return 'International';
      }
    }
  } else {
    // No clear indicators - default to domestic
    console.log(`   ⚠️  Decision: DOMESTIC (default - no clear indicators found)`);
    return 'Domestic';
  }
}

async function categorizeTourPackages() {
  console.log('🚀 Starting Tour Package Categorization...');
  console.log('   This script will analyze tour packages and set them as Domestic or International');
  console.log('   based on their location, name, highlights, and other text fields.\n');

  try {
    console.log('📡 Fetching all tour packages from database...');
    
    // Fetch all tour packages with their location data
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
    
    console.log(`📦 Found ${tourPackages.length} tour packages to categorize\n`);
    
    if (tourPackages.length === 0) {
      console.log('ℹ️  No tour packages found in the database.');
      return;
    }
    
    let domesticCount = 0;
    let internationalCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process packages in batches to avoid overwhelming the database
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < tourPackages.length; i += batchSize) {
      batches.push(tourPackages.slice(i, i + batchSize));
    }
    
    console.log(`📊 Processing ${tourPackages.length} packages in ${batches.length} batches of ${batchSize}...\n`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} packages):`);
      
      for (let packageIndex = 0; packageIndex < batch.length; packageIndex++) {
        const tourPackage = batch[packageIndex];
        const overallIndex = batchIndex * batchSize + packageIndex + 1;
        
        console.log(`\n📋 [${overallIndex}/${tourPackages.length}] Processing package:`);
        
        const currentCategory = tourPackage.tourCategory;
        const suggestedCategory = categorizeTourPackage(tourPackage);
        
        // Count for final statistics
        if (suggestedCategory === 'Domestic') {
          domesticCount++;
        } else {
          internationalCount++;
        }
        
        // Only update if the category is different or null/undefined
        if (currentCategory !== suggestedCategory) {
          try {
            await prisma.tourPackage.update({
              where: { id: tourPackage.id },
              data: { tourCategory: suggestedCategory }
            });
            
            const changeText = currentCategory ? 
              `${currentCategory} → ${suggestedCategory}` : 
              `null → ${suggestedCategory}`;
            
            console.log(`   💾 UPDATED: "${tourPackage.tourPackageName?.substring(0, 50)}..." (${changeText})`);
            updatedCount++;
          } catch (error) {
            console.error(`   ❌ ERROR updating package ${tourPackage.id}: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`   ⏭️  SKIPPED: Already categorized as ${currentCategory}`);
          skippedCount++;
        }
        
        // Small delay to prevent overwhelming the database
        if (packageIndex < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Delay between batches
      if (batchIndex < batches.length - 1) {
        console.log(`\n⏳ Completed batch ${batchIndex + 1}. Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL CATEGORIZATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`🏠 Domestic packages:     ${domesticCount.toString().padStart(4)} (${((domesticCount / tourPackages.length) * 100).toFixed(1)}%)`);
    console.log(`🌍 International packages: ${internationalCount.toString().padStart(4)} (${((internationalCount / tourPackages.length) * 100).toFixed(1)}%)`);
    console.log('─'.repeat(40));
    console.log(`✨ Packages updated:      ${updatedCount.toString().padStart(4)}`);
    console.log(`⏭️  Packages skipped:      ${skippedCount.toString().padStart(4)}`);
    console.log(`❌ Packages with errors:  ${errorCount.toString().padStart(4)}`);
    console.log('─'.repeat(40));
    console.log(`📝 Total packages:        ${tourPackages.length.toString().padStart(4)}`);
    console.log('='.repeat(60));
    
    if (errorCount > 0) {
      console.log(`⚠️  Warning: ${errorCount} packages had errors during update. Check logs above.`);
    }
    
    if (updatedCount > 0) {
      console.log(`🎉 Successfully categorized ${updatedCount} tour packages!`);
    } else {
      console.log('ℹ️  All packages were already properly categorized.');
    }
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR during categorization:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the categorization
categorizeTourPackages().catch(console.error);
