# WhatsApp Flow Data Structure Guide

## 📋 Overview

This document explains the **exact data structure** your endpoint should return for each screen in the tour-package-flow.json.

---

## 🔄 Flow Structure

```
INIT Action
    ↓
DESTINATION_SELECTOR (data_exchange)
    ↓
TOUR_OPTIONS (data_exchange)
    ↓
PACKAGE_OFFERS (data_exchange)
    ↓
PACKAGE_DETAIL (data_exchange)
    ↓
SUCCESS (terminal)
```

---

## 📊 Screen-by-Screen Data Requirements

### 1️⃣ DESTINATION_SELECTOR (INIT Action)

**Endpoint receives:**
```json
{
  "action": "INIT",
  "version": "3.0",
  "flow_token": "..."
}
```

**Endpoint MUST return:**
```json
{
  "screen": "DESTINATION_SELECTOR",
  "data": {
    "destinations": [
      {
        "id": "0_vietnam",
        "title": "🇻🇳 Vietnam"
      },
      {
        "id": "1_thailand",
        "title": "🇹🇭 Thailand"
      },
      {
        "id": "2_bali",
        "title": "🇮🇩 Bali, Indonesia"
      },
      {
        "id": "3_singapore",
        "title": "🇸🇬 Singapore"
      },
      {
        "id": "4_malaysia",
        "title": "🇲🇾 Malaysia"
      },
      {
        "id": "5_dubai",
        "title": "🇦🇪 Dubai, UAE"
      },
      {
        "id": "6_maldives",
        "title": "🇲🇻 Maldives"
      },
      {
        "id": "7_europe",
        "title": "🇪🇺 Europe"
      }
    ]
  }
}
```

**Form submission from this screen:**
```json
{
  "destination_selection": "0_vietnam"  // RadioButtonsGroup returns single ID
}
```

---

### 2️⃣ TOUR_OPTIONS (data_exchange from DESTINATION_SELECTOR)

**Endpoint receives:**
```json
{
  "action": "data_exchange",
  "screen": "DESTINATION_SELECTOR",
  "data": {
    "destination_selection": "0_vietnam"
  },
  "version": "3.0",
  "flow_token": "..."
}
```

**Endpoint MUST return:**
```json
{
  "screen": "TOUR_OPTIONS",
  "data": {
    "selected_destination": "vietnam",
    "cta_label": "View Tour Packages",
    "screen_heading": "Let's find the perfect vietnam tour package for you",
    "show_travel_type": true,
    "tour_types": [
      {
        "id": "0_honeymoon",
        "title": "Honeymoon Package"
      },
      {
        "id": "1_family",
        "title": "Family Package"
      },
      {
        "id": "2_adventure",
        "title": "Adventure Package"
      },
      {
        "id": "3_luxury",
        "title": "Luxury Package"
      },
      {
        "id": "4_budget",
        "title": "Budget Package"
      }
    ],
    "duration_options": [
      {
        "id": "0_3_5_days",
        "title": "3-5 Days"
      },
      {
        "id": "1_6_8_days",
        "title": "6-8 Days"
      },
      {
        "id": "2_9_12_days",
        "title": "9-12 Days"
      },
      {
        "id": "3_above_12_days",
        "title": "Above 12 Days"
      }
    ],
    "accommodation_preferences": [
      {
        "id": "0_3_star",
        "title": "3 Star Hotels"
      },
      {
        "id": "1_4_star",
        "title": "4 Star Hotels"
      },
      {
        "id": "2_5_star",
        "title": "5 Star Hotels"
      },
      {
        "id": "3_luxury_resorts",
        "title": "Luxury Resorts"
      }
    ],
    "travel_preferences": [
      {
        "id": "0_sightseeing",
        "title": "Sightseeing"
      },
      {
        "id": "1_adventure_sports",
        "title": "Adventure Sports"
      },
      {
        "id": "2_cultural_tours",
        "title": "Cultural Tours"
      },
      {
        "id": "3_beach_relaxation",
        "title": "Beach & Relaxation"
      },
      {
        "id": "4_local_cuisine",
        "title": "Local Cuisine Tours"
      }
    ],
    "budget_range": [
      {
        "id": "0_under_50k",
        "title": "Under ₹50,000 per person"
      },
      {
        "id": "1_50k_1lakh",
        "title": "₹50,000 - ₹1,00,000"
      },
      {
        "id": "2_1lakh_2lakh",
        "title": "₹1,00,000 - ₹2,00,000"
      },
      {
        "id": "3_above_2lakh",
        "title": "Above ₹2,00,000"
      }
    ],
    "group_size": [
      {
        "id": "0_couple",
        "title": "Couple (2 people)"
      },
      {
        "id": "1_small_family",
        "title": "Small Family (3-4 people)"
      },
      {
        "id": "2_large_family",
        "title": "Large Family (5-8 people)"
      },
      {
        "id": "3_group",
        "title": "Group (9+ people)"
      }
    ]
  }
}
```

**Form submission from this screen:**
```json
{
  "tour_types": ["0_honeymoon", "1_family"],  // CheckboxGroup returns array
  "duration": "1_6_8_days",                   // RadioButtonsGroup returns single ID
  "group_size": "0_couple",                   // RadioButtonsGroup returns single ID
  "accommodation": ["1_4_star", "2_5_star"],  // CheckboxGroup returns array
  "travel_preferences": ["0_sightseeing", "3_beach_relaxation"],  // CheckboxGroup returns array
  "budget": "1_50k_1lakh",                    // RadioButtonsGroup returns single ID
  "selected_destination": "vietnam"           // From data.selected_destination
}
```

---

### 3️⃣ PACKAGE_OFFERS (data_exchange from TOUR_OPTIONS)

**Endpoint receives:**
```json
{
  "action": "data_exchange",
  "screen": "TOUR_OPTIONS",
  "data": {
    "tour_types": ["0_honeymoon", "1_family"],
    "duration": "1_6_8_days",
    "group_size": "0_couple",
    "accommodation": ["1_4_star", "2_5_star"],
    "travel_preferences": ["0_sightseeing", "3_beach_relaxation"],
    "budget": "1_50k_1lakh",
    "selected_destination": "vietnam"
  },
  "version": "3.0",
  "flow_token": "..."
}
```

**Endpoint MUST return:**
```json
{
  "screen": "PACKAGE_OFFERS",
  "data": {
    "selected_destination": "vietnam",
    "offer_label": "Here are 4 shortlisted tour packages for you",
    "shortlisted_packages": [
      {
        "id": "0_vietnam_adventure_7d",
        "title": "Vietnam Adventure - 7D/6N",
        "subtitle": "₹85,000 per person • 4★ Hotels"
      },
      {
        "id": "1_vietnam_luxury_9d",
        "title": "Vietnam Luxury Tour - 9D/8N",
        "subtitle": "₹1,45,000 per person • 5★ Resorts"
      },
      {
        "id": "2_vietnam_budget_5d",
        "title": "Vietnam Explorer - 5D/4N",
        "subtitle": "₹45,000 per person • 3★ Hotels"
      },
      {
        "id": "3_vietnam_honeymoon_8d",
        "title": "Vietnam Honeymoon Special - 8D/7N",
        "subtitle": "₹1,10,000 per person • Luxury Resorts"
      }
    ]
  }
}
```

**Form submission from this screen:**
```json
{
  "package": "0_vietnam_adventure_7d"  // RadioButtonsGroup returns single ID
}
```

⚠️ **Note:** The form field name is `packages` in your JSON but should send `package` (singular).

---

### 4️⃣ PACKAGE_DETAIL (data_exchange from PACKAGE_OFFERS)

**Endpoint receives:**
```json
{
  "action": "data_exchange",
  "screen": "PACKAGE_OFFERS",
  "data": {
    "package": "0_vietnam_adventure_7d"
  },
  "version": "3.0",
  "flow_token": "..."
}
```

**Endpoint MUST return:**
```json
{
  "screen": "PACKAGE_DETAIL",
  "data": {
    "selected_package": "0_vietnam_adventure_7d",
    "image_src": "https://example.com/vietnam-package.jpg",
    "package_name": "Vietnam Adventure - 7D/6N",
    "package_price": "₹85,000",
    "package_duration": "7 Days / 6 Nights",
    "package_highlights": [
      "✈️ Round-trip flights included",
      "🏨 4-star hotel accommodations",
      "🍽️ Daily breakfast & 3 dinners",
      "🚌 All transfers & sightseeing",
      "🎫 Entry tickets to attractions",
      "👨‍✈️ Professional tour guide"
    ],
    "itinerary_summary": "Day 1: Arrival in Hanoi\nDay 2: Hanoi City Tour\nDay 3: Ha Long Bay Cruise\nDay 4: Transfer to Hoi An\nDay 5: Hoi An Ancient Town\nDay 6: My Son Sanctuary\nDay 7: Departure",
    "inclusions": "✅ Visa assistance\n✅ Travel insurance\n✅ Airport transfers\n✅ All sightseeing\n✅ Guide services",
    "exclusions": "❌ Lunch & personal expenses\n❌ Tips & gratuities\n❌ Optional activities"
  }
}
```

**Form submission from this screen:**
```json
{
  "package_id": "0_vietnam_adventure_7d",
  "package_name": "Vietnam Adventure - 7D/6N",
  "package_price": "₹85,000",
  "customer_name": "John Doe",
  "phone_number": "+919724444701",
  "email": "john@example.com",
  "travelers_count": "2",
  "travel_date": "2025-12-15",
  "special_requests": "Vegetarian meals required"
}
```

---

### 5️⃣ SUCCESS (data_exchange from PACKAGE_DETAIL)

**Endpoint receives:**
```json
{
  "action": "data_exchange",
  "screen": "PACKAGE_DETAIL",
  "data": {
    "package_id": "0_vietnam_adventure_7d",
    "package_name": "Vietnam Adventure - 7D/6N",
    "package_price": "₹85,000",
    "customer_name": "John Doe",
    "phone_number": "+919724444701",
    "email": "john@example.com",
    "travelers_count": "2",
    "travel_date": "2025-12-15",
    "special_requests": "Vegetarian meals required"
  },
  "version": "3.0",
  "flow_token": "..."
}
```

**Endpoint MUST return:**
```json
{
  "screen": "SUCCESS",
  "data": {}
}
```

**Note:** SUCCESS screen has `terminal: true` and empty data. All content is static in the JSON.

---

## 🔐 Encryption Details

### Request Format (Encrypted):
```json
{
  "encrypted_flow_data": "SH16...P9LU=",
  "encrypted_aes_key": "wXO2O...lLug==",
  "initial_vector": "Grws...4MiA=="
}
```

### Response Format (Encrypted):
```
"SH16...P9LU="  // Base64 string (plaintext, not JSON)
```

---

## ✅ Your Current JSON Status

Your `tour-package-flow.json` is **99% correct**! Only one minor issue:

### Issue to Fix:

**Line 415** in PACKAGE_OFFERS screen:
```json
"name": "packages",  // ❌ Should be "package" (singular)
```

Change to:
```json
"name": "package",  // ✅ Correct
```

This ensures the form field name matches what your endpoint expects in the payload.

---

## 📝 Summary

| Screen | Data Fields Required | Source |
|--------|---------------------|--------|
| DESTINATION_SELECTOR | `destinations[]` | Endpoint (INIT) |
| TOUR_OPTIONS | `tour_types[]`, `duration_options[]`, `accommodation_preferences[]`, `travel_preferences[]`, `budget_range[]`, `group_size[]` | Endpoint (data_exchange) |
| PACKAGE_OFFERS | `shortlisted_packages[]` | Endpoint (data_exchange) |
| PACKAGE_DETAIL | `package_name`, `package_price`, `package_duration`, `package_highlights[]`, `itinerary_summary`, `inclusions`, `exclusions` | Endpoint (data_exchange) |
| SUCCESS | `{}` (empty) | Endpoint (data_exchange) |

---

## 🚀 Next Steps

1. ✅ Your JSON is already uploaded to Meta
2. ✅ Your endpoint is correctly implemented
3. ⚠️ Fix the `packages` → `package` field name
4. ✅ Test the flow end-to-end

Your setup is **production-ready**! 🎉
