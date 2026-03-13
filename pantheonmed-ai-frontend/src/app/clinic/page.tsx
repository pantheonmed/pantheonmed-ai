import dynamic from "next/dynamic";

/**
 * AI Clinic — new premium medical chat interface.
 * Dynamically imported to avoid SSR issues with browser APIs
 * (SpeechRecognition, getUserMedia, etc.)
 */
const MedicalChatInterface = dynamic(
  () => import("@/components/MedicalChatInterface"),
  { ssr: false },
);

export const metadata = {
  title: "AI Clinic | PantheonMed",
  description: "Clinical-grade AI medical consultation with structured diagnosis, red flag detection, and multi-mode analysis.",
};

export default function ClinicPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <MedicalChatInterface />
    </div>
  );
}
