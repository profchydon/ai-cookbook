export type MessageType =
  | "Feedback" // if positive -> post to slack, if negative -> notify PM
  | "Support" // prepare email for staff
  | "Spam" // ignore
  | "Other"; // send to staff

export type SupportType =
  | "Bug" // "Login stopped working" -> define severity, create ticket, alert staff, draft reply
  | "TechnicalQuestion"; // "how to connect with hubspot" -> RAG search helpcenter, draft email, alert staff

export type Message = {
  sender: string; // email address
  message: string;
};

export type Feedback = {
  userId?: string;
  text: string;
  isPositive: boolean;
};

export type Support = {
  userId?: string;
  supportType: SupportType;
  bug?: {
    description: string;
    severity: string;
  };
  technicalQuestion?: {
    question: string;
    answer?: string;
    links: string[];
    answerFound: boolean;
  };
};