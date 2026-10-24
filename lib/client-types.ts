import type { Observation, Session, SessionEvent } from "@/lib/schemas";

/** Response body of POST /api/frame (mirrors FrameResult in lib/pipeline/frame.ts). */
export type FrameResultBody = {
  events: SessionEvent[];
  observation: Observation | null;
  currentStep: number;
  status: Session["status"];
};
