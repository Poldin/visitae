import type { Metadata } from "next";
import ProfileShowcasePage from "@/app/components/ProfileShowcasePage";

type ProfilePageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ embed?: string }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const readableSlug = slug.replace(/-/g, " ");

  return {
    title: `Profilo | ${readableSlug} | Visitae`,
    description:
      "Scopri il profilo del professionista, prova la prenotazione online e testa l'esperienza AI al telefono.",
  };
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const hideHeader = resolvedSearchParams.embed === "1";

  return <ProfileShowcasePage hideHeader={hideHeader} />;
}
