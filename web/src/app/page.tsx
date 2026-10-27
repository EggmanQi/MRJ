import { DrawClient } from "@/components/DrawClient";
import { Nav } from "@/components/Nav";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <Nav current="/" />
      <DrawClient />
    </div>
  );
}
