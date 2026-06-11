import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPageHeading } from "@/components/account/primitives";
import { ProfileForm } from "@/components/account/ProfileForm";
import { getAccountUser } from "@/lib/account/data";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getAccountUser();
  if (!user) redirect("/login?redirect=/account/profile");

  return (
    <div>
      <AccountPageHeading title="Profile" description="Update your personal details and password." />
      <ProfileForm
        initial={{ name: user.name ?? "", email: user.email, phone: user.phone ?? "" }}
      />
    </div>
  );
}
