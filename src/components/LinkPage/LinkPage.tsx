"use client";

import Link from "next/link";
import { FC } from "react";

export const LinkPage: FC = () => {
  return (
    <div className="list-group">
      <Link href="/furniset" className="list-group-item list-group-item-action">
        Furniset
      </Link>
      <Link
        href="/green-house"
        className="list-group-item list-group-item-action"
      >
        Green House
      </Link>
      <Link href="/test" className="list-group-item list-group-item-action">
        Test
      </Link>
    </div>
  );
};
