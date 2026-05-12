"use client";

import { useRouter } from "next/navigation";
import WelcomeSlides, { type WelcomeSetupData } from "../components/WelcomeSlides";

export default function WelcomeConfigPage() {
  const router = useRouter();

  const handleFinish = (_data: WelcomeSetupData) => {
    router.push("/magazzino");
  };

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col">
      <WelcomeSlides onFinish={handleFinish} />
    </main>
  );
}
