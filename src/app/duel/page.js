import { readFileSync } from "fs";
import { join } from "path";
import VulnerabilityClient from "../vulnerability-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Practice — DebugRoyale",
};

export default function DuelPage() {
  const raw      = JSON.parse(readFileSync(join(process.cwd(), "public", "data", "data.json"), "utf-8"));
  const problems = raw.Problems;
  const problem  = problems[Math.floor(Math.random() * problems.length)];

  const initialCode = readFileSync(join(process.cwd(), "public", "codes", problem.Code), "utf-8");

  return <VulnerabilityClient data={problem} initialCode={initialCode} />;
}
