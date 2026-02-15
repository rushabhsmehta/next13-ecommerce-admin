"use client"

import dynamic from "next/dynamic";

interface OverviewProps {
  data: any[]
};

const OverviewContent: React.FC<OverviewProps> = ({
  data
}) => {
  const { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } = require("recharts");
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
  )
};

export const Overview = dynamic(
  () => Promise.resolve(OverviewContent),
  { ssr: false, loading: () => <div className="h-[350px] w-full animate-pulse rounded-md bg-muted" /> }
);
