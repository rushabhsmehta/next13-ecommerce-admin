'use client';

import { TourPackageQuery } from "@prisma/client";
import Link from "next/link";

interface QueryLinkProps {
  query: TourPackageQuery;
}

export const QueryLink: React.FC<QueryLinkProps> = ({ query }) => {
  return (
    <Link
      href={`/queries/${query.id}`}
      className="text-blue-600 hover:underline cursor-pointer"
    >
      {query.tourPackageQueryName || `Query #${query.id}`}
    </Link>
  );
};
