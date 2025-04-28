import { Suspense } from "react";
import { Login } from "@/components/Login/Login";

export default function LoginPage() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <Login />
      </Suspense>
    </div>
  );
}
