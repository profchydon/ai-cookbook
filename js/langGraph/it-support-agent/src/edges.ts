import { State } from "./graph";

export const processMessageEdges = (state: State) => {
  switch (state.messageType) {
    case "Feedback":
      return "process-feedback";
    case "Support":
      return "process-support";
    case "Spam":
      return "process-spam";
    case "Other":
      return "process-other";
    default:
      return "__end__";
  }
};

export const processFeedbackEdges = (state: State) => {
  return state.feedback.isPositive ? "feedback-positive" : "feedback-negative";
};

export const processSupportEdge = (state: State) => {
  switch (state.support.bug?.severity) {
    case "Bug":
      return "support-bug";
    case "TechnicalQuestion":
      return "support-technical-question";
    default:
      return "__end__";
  }
};

export const processSupportEdges = async (
  state: State
): Promise<"support-bug" | "support-question"> => {
  return state.support.supportType === "Bug"
    ? "support-bug"
    : "support-question";
};

export const processSupportBugEdges = async (
  state: State
): Promise<
  "bug-severity-low" | "bug-severity-medium" | "bug-severity-high"
> => {
  switch (state.support.bug?.severity) {
    case "high":
      return "bug-severity-high";
    case "medium":
      return "bug-severity-medium";
    default:
      return "bug-severity-low";
  }
};