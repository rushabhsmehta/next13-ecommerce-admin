# Hotel Search Filter Update

## Summary
- Hotel listings now support searching by **location** and **destination** in addition to name.
- The hotels table uses the existing global search input, so no new UI elements are required.

## Implementation Notes
- `HotelColumn` already exposed `locationLabel` and `destinationName`. The table columns now bind to these fields directly, enabling filtering without extra queries.
- `HotelsClient` passes `searchKeys={["name", "locationLabel", "destinationName"]}` to `DataTableMultiple`, ensuring the search box matches all three values.
- No API or Prisma changes were necessary because filtering happens client-side across the fetched dataset.

## How to Use
1. Navigate to **Dashboard → Hotels**.
2. Use the search box above the table.
3. Type part of a hotel name, location label, or destination name to instantly filter the list.

## Future Enhancements
- Introduce server-side filtering when the hotels dataset grows too large for client-side search.
- Add dropdown filters for quick exact matches on location or destination when needed.
