import Header from "./Header";
import DoctorInfo from "./DoctorInfo";
import BookingBox from "./BookingBox";
import ChatWidget from "./ChatWidget";

type ProfileShowcasePageProps = {
  hideHeader?: boolean;
};

export default function ProfileShowcasePage({
  hideHeader = false,
}: ProfileShowcasePageProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50 text-slate-900">
      {!hideHeader ? <Header /> : null}

      <main className="min-h-0 flex-1 overflow-y-auto py-1 pb-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-start gap-5 flex-col lg:flex-row">
            <div className="min-w-0 flex-1 space-y-4">
              <DoctorInfo />
            </div>

            <aside className="w-full shrink-0 self-start lg:sticky lg:top-0 lg:w-[390px]">
              <BookingBox />
            </aside>
          </div>
        </div>
      </main>

      <ChatWidget />
    </div>
  );
}
