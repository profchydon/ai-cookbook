import dotenv from "dotenv";
dotenv.config();

import { ChatOpenAI } from "@langchain/openai";
import { State, Update } from "./graph";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { getUserFromEmail } from "./utils";

export const agent = new ChatOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  model: "openai/gpt-4.1-mini",
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENROUTER_BASE_URL,
  },
});

export const conversationHandler = async (state: State) => {
  const SYSTEM_PROMPT =
    `You are an expert support agent.  You are to keep conversation ongoing until the user's intent is identified. 
    `;
  const response = await agent.invoke([
    [
      "system",
      SYSTEM_PROMPT,
    ],
    ["user", state.message.message],
  ]);

  console.log("Conversation Agent Response", response.content);
  
  return {
    message: response.content,
  };
}

export const processMessage = async (state: State): Promise<Update> => {

  const structuredllm = agent.withStructuredOutput(
    z.object({
      type: z.enum(["Feedback", "Support", "Spam", "Other"]).describe("The type of the complaint"),
      reason: z.string().describe("The reason why you selected the type"),
    })
  );

  const SYSTEM_PROMPT =
    `You are an expert email-analizer AI.  You are given emails and you give them one of the avaliable labels. 
    You answer with a json of this structure: 
    {
        type: 'Feedback' | 'Support' | 'Spam' | 'Other',
        reason: string
      }
    You must be concise in your response and only return the type and reason.
    `;

  console.log("Processing message", state.message.message);

  const response = await structuredllm.invoke([
    [
      "system",
      SYSTEM_PROMPT,
    ],
    ["user", state.message.message],
  ]);

  console.log("Process Message Result", response);

  return {
    messageType: response.type,
  }
}

export const processFeedback = async (state: State): Promise<Update> => {

  const user = getUserFromEmail(state.message.sender);

  const structuredllm = agent.withStructuredOutput(
    z.object({
      isPositive: z.boolean().describe("Whether the feedback is positive or negative"),
      reason: z.string().describe("The reason why you selected the type"),
    })
  )

  const SYSTEM_PROMPT = `You are an expert sentiment analysis AI.
      You process feedback a company received and have to decide if it was positive or negative.
      You answer with a json of this structure: {
        isPositive: boolean,
        reason: string
      }
      You must be concise in your response and only return the isPositive and reason.
      `;

  const response = await structuredllm.invoke([
    [
      "system",
      SYSTEM_PROMPT,
    ],
    ["user", state.message.message],
  ]);

  console.log("Process Feedback Result", response);

  return {
    feedback: {
      userId: user,
      text: state.message.message,
      isPositive: response.isPositive,
    },
  };
}

export const processSupport = async (state: State): Promise<Update> => {
  const userId = getUserFromEmail(state.message.sender);

  const structuredLlm = agent.withStructuredOutput(
    z.object({
      type: z
        .enum(["Bug", "TechnicalQuestion"])
        .describe("If the support request is a bug or technical question"),
      reason: z.string().describe("The reason for your selection of the type"),
    })
  );

  const res = await structuredLlm.invoke([
    [
      "system",
      `You are an expert support request analizer AI. 
      You are given a support request and you give them one of the avaliable labels.
      You answer with a json of this structure: {
        type: 'Bug' | 'TechnicalQuestion',
        reason: string
      }`,
    ],
    ["human", state.message.message],
  ]);

  console.log("Process Support Result", res);

  return {
    support: {
      userId: userId,
      supportType: res.type,
    },
  };
};

export const processOther = async (state: State): Promise<Update> => {
  console.log("Process Other: Send email to support staff", state.message);
  return {};
};

export const supportBug = async (state: State): Promise<Update> => {
  const structuredLlm = agent.withStructuredOutput(
    z.object({
      severity: z
        .enum(["high", "medium", "low"])
        .describe("The severity of the bug"),
      description: z.string().describe("A detailed description of the bug"),
      reason: z.string().describe("The reason for your selection of severity"),
    })
  );

  const res = await structuredLlm.invoke([
    [
      "system",
      `You are an expert bug report handler AI. 
      You are given a bug report and decide a severity level and create a detailed description for the support staff.
      You answer with a json of this structure: {
        severity: "high" | "medium" | "low",
        description: string
        reason: string
      }`,
    ],
    ["human", state.message.message],
  ]);

  console.log("Process Bug Result", res);
  return {
    support: {
      ...state.support,
      bug: {
        description: res.description,
        severity: res.severity,
      },
    },
  };
};

export const supportTechnicalQuestion = async (
  state: State
): Promise<Update> => {
  const helpcenterResponse = [
    {
      article:
        "We support these 3rd party apps: Hubspot, Notion, Salesforce and Slack",
      link: "https://saas.helpcenter/get-started",
    },
    {
      article:
        "To connect 3rd party apps got to the settings page, find the tab of the app you want to connect to and paste the api key",
      link: "https://saas.helpcenter/connect-3rd-party-apps",
    },
  ];

  const structuredLlm = agent.withStructuredOutput(
    z.object({
      answer: z.string().describe("A answer based on the provided documents"),
      answerFound: z
        .boolean()
        .describe("If an answer was found in the documents"),
      reason: z
        .string()
        .describe(
          "The reason for your selection of 'answer' and 'answerFound'"
        ),
    })
  );

  const res = await structuredLlm.invoke([
    [
      "system",
      `You are an expert Support AI. 
      You are given a questoin from the user and the search result from the help center.
      Answer the users question using results form the helpcenter, if theres nothing useful in the results set answeresFound false.
       You answer with a json of this structure: {
        answer: string,
        answerFound: boolean
        reason: string
      }
      `,
    ],
    [
      "user",
      `# QUESTION: 
        ${state.message.message}  

      # HELPCENTER SEARCH RESULT
        ${helpcenterResponse.map((it) => it.article).join("\n")}
      `,
    ],
  ]);

  console.log("SUpport Tech Question Result", res);

  return {
    support: {
      ...state.support,
      technicalQuestion: {
        question: state.message.message,
        answer: res.answer,
        links: helpcenterResponse.map((it) => it.link),
        answerFound: res.answerFound,
      },
    },
  };
};

export const bugSeverityLow = async (state: State): Promise<Update> => {
  // todo create a new ticket
  console.log(
    "Creating a new ticket, Severity low",
    state.support.bug?.description
  );
  return {};
};

export const bugSeverityMedium = async (state: State): Promise<Update> => {
  // todo create a new ticket & send slack channel
  console.log(
    "Creating a new ticket, Severity medium",
    state.support.bug?.description
  );
  console.log("Send notification about ticket in the developer channel");
  return {};
};
export const bugSeverityHigh = async (state: State): Promise<Update> => {
  // todo create a new ticket & send message to staff on support duty
  console.log(
    "Creating a new ticket, Severity high",
    state.support.bug?.description
  );
  console.log(
    "Searching for staff on support duty and send notifcation via slack"
  );
  return {};
};

export const feedbackPositive = async (state: State): Promise<Update> => {
  console.log("Send feedback to feedback slack channel");
  return {};
};

export const feedbackNegative = async (state: State): Promise<Update> => {
  console.log("Send feedback to feedback slack channel");
  console.log("Notifiy PM about negaitve feedback");
  return {};
};

export const draftEmail = async (state: State): Promise<Update> => {
  if (state.messageType === "Feedback" && state.feedback.isPositive) {
    console.log("EMAIL: Thank you so much ❤️");
  }

  if (state.messageType === "Feedback" && !state.feedback.isPositive) {
    console.log(
      "EMAIL: Thank you for your feedback, we will look into it asap"
    );
  }

  if (state.messageType === "Support" && state.support.bug) {
    console.log("EMAIL: Our team is on it");
  }

  if (state.messageType === "Support" && state.support.technicalQuestion) {
    if (state.support.technicalQuestion.answerFound) {
      console.log(`EMAIL: 
        ${state.support.technicalQuestion.answer}
        
        Links: ${state.support.technicalQuestion.links.join(", ")}
        `);
    } else {
      console.log("EMAIL: Our team will reach out to you asap");
    }
  }

  return {};
};