import { createFileRoute } from "@tanstack/react-router";
import { EdgeOreApp } from "@/components/EdgeOreApp";

export const Route = createFileRoute("/game")({
  component: GamePage,
});

function GamePage() {
  return <EdgeOreApp autostart />;
}
