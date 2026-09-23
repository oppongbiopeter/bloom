import { createFileRoute } from "@tanstack/react-router";
import { HqLayout } from "@/components/hq-shell";

export const Route = createFileRoute("/hq")({ component: HqLayout });
