import { Suspense } from "react";
import { Test } from "@/components/Test/Test";

export default function TestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Test />
    </Suspense>
  );
}
