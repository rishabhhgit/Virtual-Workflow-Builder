import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <SignUp
        signInUrl="/sign-in"
        afterSignUpUrl="/workflows"
        forceRedirectUrl="/workflows"
      />
    </div>
  );
}

