import Navbar from "@/components/Navbar";
import SayGmBlock from "@/components/SayGmBlock";
import Background from "@/components/Background";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-transparent overflow-hidden selection:bg-brand selection:text-white">
      <Background />
      <Navbar />
      <SayGmBlock />
    </main>
  );
}
