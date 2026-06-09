import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md h-[400px] rounded-xl bg-sand animate-pulse" />}>
      <LoginForm />
    </Suspense>
  );
}
