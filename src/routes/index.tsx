import { createFileRoute } from "@tanstack/react-router";
import { FilmPlayer } from "@/components/film-player";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <FilmPlayer />;
}
