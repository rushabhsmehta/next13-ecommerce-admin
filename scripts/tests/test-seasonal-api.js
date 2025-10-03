// Quick test script to verify the seasonal periods API endpoints are working
const axios = require('axios')

const BASE_URL = 'http://localhost:3000'

async function testSeasonalPeriodsAPI() {
  try {
    console.log('🧪 Testing Seasonal Periods API Endpoints...\n')
    
    // First, get a location to test with
    console.log('1. Fetching locations...')
    const locationsResponse = await axios.get(`${BASE_URL}/api/locations`)
    
    if (!locationsResponse.data || locationsResponse.data.length === 0) {
      console.log('❌ No locations found')
      return
    }
    
    const testLocation = locationsResponse.data[0]
    console.log(`✅ Using location: ${testLocation.label} (ID: ${testLocation.id})`)
    
    // Test GET seasonal periods for a location
    console.log('\n2. Testing GET seasonal periods...')
    const seasonalPeriodsResponse = await axios.get(`${BASE_URL}/api/locations/${testLocation.id}/seasonal-periods`)
    
    console.log(`✅ Found ${seasonalPeriodsResponse.data.length} seasonal periods for ${testLocation.label}`)
    
    if (seasonalPeriodsResponse.data.length > 0) {
      const firstPeriod = seasonalPeriodsResponse.data[0]
      console.log(`   📋 Sample period: ${firstPeriod.name} (${firstPeriod.seasonType})`)
      console.log(`   📅 Dates: ${firstPeriod.startMonth}/${firstPeriod.startDay} - ${firstPeriod.endMonth}/${firstPeriod.endDay}`)
      
      // Test GET individual period
      console.log('\n3. Testing GET individual period...')
      const individualPeriodResponse = await axios.get(`${BASE_URL}/api/locations/${testLocation.id}/seasonal-periods/${firstPeriod.id}`)
      
      console.log(`✅ Retrieved individual period: ${individualPeriodResponse.data.name}`)
      console.log(`   🏢 Location: ${individualPeriodResponse.data.location.label}`)
      console.log(`   💰 Linked pricing periods: ${individualPeriodResponse.data.tourPackagePricings.length}`)
    }
    
    console.log('\n🎉 All API endpoint tests passed!')
    console.log('\n📊 Summary:')
    console.log(`   • Location tested: ${testLocation.label}`)
    console.log(`   • Seasonal periods: ${seasonalPeriodsResponse.data.length}`)
    console.log(`   • API endpoints: Working correctly`)
    console.log(`   • Data integration: Successful`)
    
  } catch (error) {
    console.error('❌ API test failed:', error.message)
    if (error.response) {
      console.error('   Status:', error.response.status)
      console.error('   Data:', error.response.data)
    }
  }
}

// Run the test
testSeasonalPeriodsAPI()
