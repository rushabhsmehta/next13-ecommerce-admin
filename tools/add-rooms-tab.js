const fs = require('fs');

let content = fs.readFileSync('src/components/tour-package-query/QueryVariantsTab.tsx', 'utf8');

const placeholder = '{/* Room Allocations content will remain here */}';

const replacement = `<Card className="shadow-sm border border-slate-200/70">
                  <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 via-blue-25 to-transparent">
                    <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                      <BedDouble className="h-4 w-4 text-blue-600" />
                      Room Allocation & Transport Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <BedDouble className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p>Room allocation and transport management will be available here.</p>
                      <p className="text-xs mt-2">Configure rooms and transport for each day of the itinerary.</p>
                    </div>
                  </CardContent>
                </Card>`;

content = content.replace(placeholder, replacement);

fs.writeFileSync('src/components/tour-package-query/QueryVariantsTab.tsx', content);

console.log('✅ Replaced placeholder with Room Allocation card');
