import { HumidityMonitor } from "@/components/HumidityMonitor";

export default function HumidityTestPage() {
  return (
    <main className="min-h-screen p-6 bg-white text-black">
      <h1 className="text-2xl font-bold mb-6">🔥 Тест вологості з датчика</h1>
      <HumidityMonitor />
    </main>
  );
}
