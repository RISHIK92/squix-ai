import { PrismaClient } from "@prisma/client";
import { getDatabaseSchema } from "./db/introspector.js";
import {
  genAI,
  GeminiModel,
  DEFAULT_GEMINI_CLASSIFIER,
  DEFAULT_GEMINI_SQL,
  DEFAULT_GEMINI_COACH,
  DEFAULT_GEMINI_CHAT,
} from "./ai/gemini.js";
import { parseIntelligentJson } from "./utils/parser.js";

const DEFAULT_COACH_PERSONA_PROMPT = `You are "Ace," an expert AI coach for students preparing for competitive exams. Your tone is always encouraging, analytical, and focused on helping the student improve. You never just state data; you interpret it and provide insights. When you identify a weakness, you frame it constructively and suggest a clear, actionable next step. When you see a strength, you celebrate it and suggest how to leverage it.`;

export interface ConnectionParams {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

/**
 * Defines the names of the Gemini models to be used for each task.
 */
export interface GeminiModelNames {
  classifier?: string;
  sql?: string;
  coach?: string;
  chat?: string;
}

/**
 * Configuration options for the Squix agent.
 */
export interface SquixOptions {
  models?: GeminiModelNames;
  defaultSystemPrompt?: string;
}

/**
 * Options for a single chat interaction.
 */
export interface ChatOptions {
  systemPrompt?: string;
}

export class Squix {
  private prisma!: PrismaClient;
  private dbSchema!: string;
  private provider!: "postgresql" | "mysql";
  private defaultSystemPrompt: string;

  private geminiClassifier: GeminiModel;
  private geminiSQL: GeminiModel;
  private geminiCoach: GeminiModel;
  private geminiChat: GeminiModel;

  /**
   * Creates a new Squix AI agent.
   * @param options Configuration for the agent, including custom model names and a default system prompt.
   */
  constructor(options?: SquixOptions) {
    this.defaultSystemPrompt =
      options?.defaultSystemPrompt ?? DEFAULT_COACH_PERSONA_PROMPT;

    const classifierModel =
      options?.models?.classifier ?? DEFAULT_GEMINI_CLASSIFIER;
    const sqlModel = options?.models?.sql ?? DEFAULT_GEMINI_SQL;
    const coachModel = options?.models?.coach ?? DEFAULT_GEMINI_COACH;
    const chatModel = options?.models?.chat ?? DEFAULT_GEMINI_CHAT;

    this.geminiClassifier = genAI.getGenerativeModel({
      model: classifierModel,
    });
    this.geminiSQL = genAI.getGenerativeModel({ model: sqlModel });
    this.geminiCoach = genAI.getGenerativeModel({ model: coachModel });
    this.geminiChat = genAI.getGenerativeModel({ model: chatModel });
  }

  /**
   * Connects the agent to the specified database and introspects its schema.
   * This must be called before the chat() method.
   * @param provider The database type, either 'postgresql' or 'mysql'.
   * @param connection The database connection string or connection parameters.
   */
  public async connect(
    provider: "postgresql" | "mysql",
    connection: string | ConnectionParams
  ): Promise<void> {
    this.provider = provider;
    let datasourceUrl: string;

    if (typeof connection === "string") {
      datasourceUrl = connection;
    } else {
      const { host, port, user, password, database } = connection;
      if (!host || !port || !user || !password || !database) {
        throw new Error(
          "Missing required connection parameters: host, port, user, password, database"
        );
      }
      datasourceUrl = `${provider}://${user}:${password}@${host}:${port}/${database}`;
    }

    this.prisma = new PrismaClient({
      datasources: { db: { url: datasourceUrl } },
    });

    await this.prisma.$connect();
    this.dbSchema = await getDatabaseSchema(this.prisma, this.provider);
  }

  /**
   * Handles a user's chat message, routes it to the appropriate AI function,
   * and returns a natural language response.
   * @param userPrompt The message from the end-user.
   * @param options Options for this specific chat call, such as a custom system prompt.
   * @returns A string containing the AI's response.
   */
  public async chat(
    userPrompt: string,
    options?: ChatOptions
  ): Promise<string> {
    if (!this.prisma || !this.dbSchema) {
      throw new Error(
        "Database not connected. Please call the 'connect' method first."
      );
    }

    const systemPrompt = options?.systemPrompt ?? this.defaultSystemPrompt;

    const classificationPrompt = `
      ${systemPrompt}

      You are categorizing a user's request based on their message and the database schema.
      Respond with a valid JSON object with a key "intent". Possible values are:
      1. "database_query": The user is asking for specific data.
      2. "strategic_advice": The user is asking for a plan or advice based on data.
      3. "clarification_needed": The request is ambiguous. You MUST also include a "missing_info" key.
      4. "general_chat": The user is making a conversational request.

      Database Schema: ${this.dbSchema}
      User's message: "${userPrompt}"

      Respond with JSON only.
    `;

    const classificationResult = await this.geminiClassifier.generateContent(
      classificationPrompt
    );
    const { intent, missing_info } = parseIntelligentJson(
      classificationResult.response.text()
    );

    let finalAnswer: string;

    if (intent === "database_query" || intent === "strategic_advice") {
      const sqlDialectInstructions =
        this.provider === "mysql"
          ? `- Use backticks for column/table names (e.g., \`userId\`).\n- Return valid MySQL syntax.`
          : `- Use double quotes for column/table names (e.g., "userId").\n- Return valid PostgreSQL syntax.`;

      const sqlGenerationPrompt = `
        You are an expert ${
          this.provider === "mysql" ? "MySQL" : "PostgreSQL"
        } data analyst. Your task is to write a SINGLE SQL query to get the data needed to answer a user's question.
        
        CRITICAL RULES:
        - Write ONLY ONE SQL statement.
        - Do NOT include a semicolon at the end.
        ${sqlDialectInstructions}
        
        Schema: ${this.dbSchema}
        User's Question: "${userPrompt}"
        
        Respond with a JSON object with a single key "query" containing ONE SQL statement.
      `;

      const generatedQuery = await this.getSQLFromLLM(sqlGenerationPrompt);
      const queryResult: unknown = await this.prisma.$queryRawUnsafe(
        generatedQuery
      );

      const serializableResult = JSON.parse(
        JSON.stringify(queryResult, (_, value) =>
          typeof value === "bigint" ? value.toString() : value
        )
      );

      const analysisPrompt = `
        ${systemPrompt}

        A user asked: "${userPrompt}"
        We ran a query and got this data:
        ${JSON.stringify(serializableResult, null, 2)}

        Your task is to act as their personal coach.
        1. Directly answer their question using the data in a clear, friendly way.
        2. Analyze the data to find one key insight (a strength or weakness).
        3. Provide one piece of clear, actionable advice based on the insight.
        4. Be conversational, encouraging, and concise. Interpret the numbers to make them meaningful.
      `;

      const finalAnswerResult = await this.geminiCoach.generateContent(
        analysisPrompt
      );
      finalAnswer = finalAnswerResult.response.text();
    } else if (intent === "clarification_needed") {
      finalAnswer = `I can definitely help with that! To give you the best answer, could you please tell me ${
        missing_info || "more specific details"
      }?`;
    } else {
      // Default to "general_chat"
      const chatPrompt = `
        ${systemPrompt}
        The user sent the following message. Provide a short, encouraging, and conversational response in character.
        User's message: "${userPrompt}"
      `;
      const chatResult = await this.geminiChat.generateContent(chatPrompt);
      finalAnswer = chatResult.response.text();
    }

    return finalAnswer;
  }

  private async getSQLFromLLM(prompt: string): Promise<string> {
    const result = await this.geminiSQL.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const parsedJson = parseIntelligentJson(responseText);
      const query = parsedJson.query;
      if (!query || typeof query !== "string") {
        throw new Error(
          "Parsed JSON from LLM does not contain a valid 'query' key."
        );
      }

      let cleanQuery = query.trim().replace(/;+\s*$/g, "");
      if (cleanQuery.includes(";")) {
        throw new Error("SQL injection attempt detected: multiple statements.");
      }

      const dangerousKeywords = [
        "DROP",
        "DELETE",
        "TRUNCATE",
        "ALTER",
        "CREATE",
        "INSERT",
        "UPDATE",
        "GRANT",
        "REVOKE",
        "EXEC",
      ];
      const upperQuery = cleanQuery.toUpperCase();
      for (const keyword of dangerousKeywords) {
        const regex = new RegExp(`\\b${keyword}\\b`);
        if (regex.test(upperQuery)) {
          throw new Error(`Dangerous SQL operation detected: ${keyword}`);
        }
      }

      return cleanQuery;
    } catch (e: any) {
      console.error("Failed to parse SQL JSON from LLM:", responseText);
      throw new Error(
        `The AI failed to generate valid SQL query JSON. Details: ${e.message}`
      );
    }
  }
}
