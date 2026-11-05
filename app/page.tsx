import App from "@/components/App";
import type { CaseData } from "@/lib/types";
import av from "@/data/cases/av.json";
import estop from "@/data/cases/estop.json";
import dsm from "@/data/cases/dsm.json";

const cases = [av, estop, dsm] as CaseData[];

export default function Page() {
  return <App cases={cases} />;
}
