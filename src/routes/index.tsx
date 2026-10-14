import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Landing } from "@/components/Landing";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  return (
    <Landing
      onLaunch={() => {
        void navigate({ to: "/game" });
      }}
    />
  );
}
