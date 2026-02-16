"use client"

import dynamic from "next/dynamic";

interface OverviewProps {
  data: any[]
};

// Import recharts components dynamically to enable proper code splitting
export const Overview = dynamic(
  () => import("recharts").then((recharts) => {
    const { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } = recharts;
    
    const OverviewContent: React.FC<OverviewProps> = ({ data }) => {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `₹ ${value}`}
            />
            <Bar dataKey="total" fill="#3498db" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    };
    
    return OverviewContent;
  }),
  { 
    ssr: false, 
    loading: () => <div className="h-[350px] w-full animate-pulse rounded-md bg-muted" /> 
  }
);
