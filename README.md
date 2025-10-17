# Squix AI

A natural language interface for database interactions powered by Google Gemini AI. Squix AI enables conversational querying, intelligent data analysis, and personalized coaching insights from your PostgreSQL or MySQL databases.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Why Use Squix AI](#why-use-squix-ai)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Advanced Configuration](#advanced-configuration)
- [Best Practices](#best-practices)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

Squix AI is an intelligent database agent that translates natural language queries into SQL, executes them safely, and returns human-readable insights. Built on Google's Gemini AI models and Prisma ORM, it provides a conversational interface for data analysis, reporting, and coaching applications.

The library is particularly well-suited for educational platforms, analytics dashboards, and applications requiring non-technical users to interact with complex databases.

## Key Features

### Natural Language Processing
- Intent classification to route queries appropriately
- Context-aware response generation
- Conversational follow-up handling

### Multi-Model Architecture
- Dedicated models for classification, SQL generation, coaching, and general chat
- Optimized model selection for different task types
- Configurable model assignments

### Database Support
- PostgreSQL and MySQL compatibility
- Automatic schema introspection
- Dialect-aware SQL generation

### Security
- SQL injection prevention with multi-layer validation
- Read-only query enforcement
- Dangerous operation detection and blocking

### Intelligent Analysis
- Data interpretation with actionable insights
- Personalized coaching recommendations
- Strategic advice based on query results

## Why Use Squix AI

### For Educational Platforms
Transform raw student performance data into personalized coaching insights without requiring SQL knowledge from educators or students.

### For Analytics Applications
Enable business users to query databases conversationally, reducing dependency on data teams for routine reporting.

### For Customer Support Tools
Provide support agents with instant access to customer data through natural language queries, improving response times.

### For Internal Dashboards
Allow non-technical stakeholders to explore data independently, fostering data-driven decision-making across organizations.

### Key Advantages

**Developer Experience**: Minimal setup with automatic schema detection and intelligent routing eliminates boilerplate code.

**Safety First**: Built-in SQL injection protection and read-only enforcement ensure database security.

**Flexibility**: Customizable system prompts and model selection adapt to specific use cases.

**Scalability**: Schema caching and efficient query generation support production workloads.

## Installation

```bash
npm install squix-ai @prisma/client
```

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 12+ or MySQL 8+
- Google Gemini API key
- Existing Prisma setup (or use initialization tool)

## Quick Start

### 1. Initialize Your Project

```bash
npx squix-ai
```

This interactive command will:
- Create a `prisma/schema.prisma` file if needed
- Set up your `.env` file with required variables
- Guide you through database selection

### 2. Configure Environment Variables

Edit your `.env` file:

```env
GEMINI_API_KEY="your_gemini_api_key_here"
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. Basic Implementation

```typescript
import { Squix } from 'squix-ai';

const agent = new Squix();

await agent.connect('postgresql', process.env.DATABASE_URL);

const response = await agent.chat('How many users registered this month?');
console.log(response);
```

## Configuration

### Constructor Options

```typescript
interface SquixOptions {
  models?: {
    classifier?: string;
    sql?: string;
    coach?: string;
    chat?: string;
  };
  defaultSystemPrompt?: string;
}
```

### Connection Methods

**Using Connection String**:
```typescript
await agent.connect('postgresql', 'postgresql://user:pass@host:5432/db');
```

**Using Connection Parameters**:
```typescript
await agent.connect('mysql', {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'myapp'
});
```

## Core Concepts

### Intent Classification

Squix AI automatically categorizes user queries into four types:

1. **database_query**: Requests for specific data retrieval
2. **strategic_advice**: Questions requiring analysis and recommendations
3. **clarification_needed**: Ambiguous requests requiring more information
4. **general_chat**: Conversational messages without data needs

### Query Pipeline

1. User submits natural language query
2. Classifier determines intent
3. SQL generator creates appropriate query (if needed)
4. Query executes against database
5. Coach model analyzes results and generates response
6. Natural language answer returned to user

### Schema Introspection

The library automatically introspects your database schema on connection, including:
- Table structures
- Column types and constraints
- Foreign key relationships
- Primary and unique keys

This schema information is cached and used to generate accurate SQL queries.

## API Reference

### Class: Squix

#### constructor(options?: SquixOptions)

Creates a new Squix AI agent instance.

**Parameters**:
- `options.models`: Custom Gemini model names
- `options.defaultSystemPrompt`: Custom persona for the AI coach

**Example**:
```typescript
const agent = new Squix({
  models: {
    sql: 'gemini-2.5-pro',
    coach: 'gemini-2.5-pro'
  },
  defaultSystemPrompt: 'You are a financial advisor AI...'
});
```

#### async connect(provider, connection): Promise<void>

Establishes database connection and introspects schema.

**Parameters**:
- `provider`: `'postgresql'` or `'mysql'`
- `connection`: Connection string or ConnectionParams object

**Throws**: Error if connection fails or required parameters missing

#### async chat(userPrompt, options?): Promise<string>

Processes user query and returns natural language response.

**Parameters**:
- `userPrompt`: User's natural language question
- `options.systemPrompt`: Override default system prompt for this query

**Returns**: String containing AI-generated response

**Throws**: Error if called before `connect()`

## Usage Examples

### Example 1: Educational Analytics

```typescript
import { Squix } from 'squix-ai';

const agent = new Squix({
  defaultSystemPrompt: `You are an academic advisor helping students 
    understand their performance. Be encouraging and provide specific 
    study recommendations.`
});

await agent.connect('postgresql', process.env.DATABASE_URL);

// Natural language queries
const response1 = await agent.chat(
  'What is my average score in mathematics this semester?'
);

const response2 = await agent.chat(
  'Which subjects should I focus on to improve my overall grade?'
);

const response3 = await agent.chat(
  'How do I compare to the class average in physics?'
);
```

### Example 2: Business Analytics

```typescript
const salesAgent = new Squix({
  defaultSystemPrompt: `You are a business intelligence assistant. 
    Provide data-driven insights with clear recommendations for 
    revenue optimization.`
});

await salesAgent.connect('mysql', {
  host: 'analytics.company.com',
  port: 3306,
  user: 'analyst',
  password: process.env.DB_PASSWORD,
  database: 'sales_data'
});

// Revenue analysis
const revenueReport = await salesAgent.chat(
  'What were our top 5 products by revenue last quarter?'
);

// Trend identification
const trends = await salesAgent.chat(
  'Are there any concerning trends in customer retention?'
);

// Strategic recommendations
const strategy = await salesAgent.chat(
  'Based on recent sales data, which regions should we prioritize?'
);
```

### Example 3: Customer Support Integration

```typescript
const supportAgent = new Squix({
  defaultSystemPrompt: `You are a customer support assistant. 
    Provide accurate account information professionally and suggest 
    relevant solutions.`
});

await supportAgent.connect('postgresql', process.env.SUPPORT_DB_URL);

// Express.js endpoint example
app.post('/api/support-query', async (req, res) => {
  try {
    const { question, userId } = req.body;
    
    const response = await supportAgent.chat(
      `For user ${userId}: ${question}`
    );
    
    res.json({ answer: response });
  } catch (error) {
    res.status(500).json({ error: 'Query processing failed' });
  }
});
```

### Example 4: Dynamic System Prompts

```typescript
const agent = new Squix();
await agent.connect('postgresql', process.env.DATABASE_URL);

// Different contexts with custom prompts
const technicalAnalysis = await agent.chat(
  'Analyze the system performance metrics',
  {
    systemPrompt: `You are a DevOps engineer analyzing system metrics. 
      Focus on performance bottlenecks and optimization opportunities.`
  }
);

const executiveSummary = await agent.chat(
  'Summarize user engagement this quarter',
  {
    systemPrompt: `You are preparing an executive summary. 
      Be concise, focus on business impact, and highlight key metrics.`
  }
);
```

### Example 5: Handling Clarifications

```typescript
const agent = new Squix();
await agent.connect('mysql', process.env.DATABASE_URL);

// Ambiguous query
const response1 = await agent.chat('Show me the data');
// Returns: "I can definitely help with that! To give you the best 
// answer, could you please tell me which specific data you'd like 
// to see?"

// Follow-up with clarity
const response2 = await agent.chat('Show me user registration data');
// Returns actual data and insights
```

### Example 6: Multi-Database Application

```typescript
class MultiDatabaseApp {
  private analyticsAgent: Squix;
  private userAgent: Squix;
  
  async initialize() {
    // Analytics database
    this.analyticsAgent = new Squix({
      defaultSystemPrompt: 'You are a data analyst...'
    });
    await this.analyticsAgent.connect(
      'postgresql',
      process.env.ANALYTICS_DB_URL
    );
    
    // User database
    this.userAgent = new Squix({
      defaultSystemPrompt: 'You are a user support assistant...'
    });
    await this.userAgent.connect(
      'mysql',
      process.env.USER_DB_URL
    );
  }
  
  async getAnalytics(query: string) {
    return await this.analyticsAgent.chat(query);
  }
  
  async getUserInfo(query: string) {
    return await this.userAgent.chat(query);
  }
}
```

## Advanced Configuration

### Custom Model Selection

Choose specific Gemini models for different tasks:

```typescript
const agent = new Squix({
  models: {
    classifier: 'gemini-2.0-flash',      // Fast intent detection
    sql: 'gemini-2.5-flash',             // Accurate SQL generation
    coach: 'gemini-2.5-pro',             // Deep analysis
    chat: 'gemini-2.0-flash'             // Conversational responses
  }
});
```

### Persona Customization

Tailor the AI's communication style:

```typescript
const financialAdvisor = new Squix({
  defaultSystemPrompt: `You are "Finley," a certified financial advisor AI.
    
    Communication Style:
    - Professional yet approachable
    - Use financial terminology appropriately
    - Always include risk disclaimers
    - Provide context for numerical data
    
    When analyzing data:
    1. Identify key financial metrics
    2. Compare against benchmarks
    3. Highlight risks and opportunities
    4. Suggest actionable next steps
    
    Never provide specific investment advice or guarantee returns.`
});
```

### Schema Refresh

Force schema re-introspection after database changes:

```typescript
import { getDatabaseSchema } from 'squix-ai/db/introspector';

// After schema modifications
const updatedSchema = await getDatabaseSchema(
  prisma,
  'postgresql',
  true  // forceRefresh = true
);
```

## Best Practices

### Query Optimization

**Do**: Ask specific, well-scoped questions
```typescript
await agent.chat('What is the average test score for Grade 10 students in Math during Q1 2024?');
```

**Avoid**: Overly broad or multi-part questions
```typescript
await agent.chat('Tell me everything about all students and their performance and recommendations');
```

### Error Handling

Always wrap chat calls in try-catch blocks:

```typescript
try {
  const response = await agent.chat(userQuery);
  return { success: true, data: response };
} catch (error) {
  console.error('Query failed:', error);
  return { 
    success: false, 
    error: 'Unable to process query. Please try rephrasing.' 
  };
}
```

### Connection Management

Reuse agent instances rather than creating new connections:

```typescript
// Good: Single instance
const agent = new Squix();
await agent.connect('postgresql', dbUrl);

app.use((req, res, next) => {
  req.agent = agent;  // Attach to request
  next();
});

// Avoid: Creating new instances per request
app.post('/query', async (req, res) => {
  const agent = new Squix();  // Inefficient
  await agent.connect('postgresql', dbUrl);
  // ...
});
```

### System Prompt Design

Structure prompts for consistency:

```typescript
const prompt = `
Role: [Define the AI's role]

Expertise: [Specify domain knowledge]

Communication Style:
- [Style guideline 1]
- [Style guideline 2]

Response Structure:
1. [How to format answers]
2. [What to include/exclude]

Constraints:
- [Limitation 1]
- [Limitation 2]
`;
```

## Security Considerations

### Built-in Protections

Squix AI implements multiple security layers:

1. **SQL Injection Prevention**: Multi-statement detection and dangerous keyword blocking
2. **Read-Only Enforcement**: Blocks DROP, DELETE, UPDATE, INSERT, and other write operations
3. **Parameterized Queries**: Uses Prisma's `$queryRawUnsafe` with internal validation

### Additional Recommendations

**Environment Variables**: Never commit credentials to version control
```bash
# .gitignore
.env
.env.*
```

**API Key Rotation**: Regularly rotate Gemini API keys

**Database Permissions**: Use read-only database users:
```sql
-- PostgreSQL example
CREATE USER squix_reader WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE mydb TO squix_reader;
GRANT USAGE ON SCHEMA public TO squix_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO squix_reader;
```

**Rate Limiting**: Implement application-level rate limiting for the chat endpoint

**Input Validation**: Validate user input before passing to Squix:
```typescript
function sanitizeInput(query: string): string {
  if (query.length > 500) {
    throw new Error('Query too long');
  }
  return query.trim();
}
```

## Troubleshooting

### Common Issues

**Connection Failures**

Error: "Database not connected"
```typescript
// Solution: Ensure connect() is called before chat()
await agent.connect('postgresql', dbUrl);
await agent.chat('query');  // Now works
```

**SQL Generation Errors**

Error: "Failed to parse SQL JSON from LLM"
```typescript
// Solution: Simplify your query or provide more context
// Instead of: "Show data"
// Try: "Show the count of users registered in January 2024"
```

**Missing Environment Variables**

Error: "Missing required connection parameters"
```typescript
// Solution: Verify .env file
console.log(process.env.DATABASE_URL);  // Should not be undefined
```

### Debug Mode

Enable detailed logging:

```typescript
const agent = new Squix();
await agent.connect('postgresql', dbUrl);

// Log classification results
const originalChat = agent.chat.bind(agent);
agent.chat = async function(prompt: string, options?: any) {
  console.log('User Query:', prompt);
  const result = await originalChat(prompt, options);
  console.log('AI Response:', result);
  return result;
};
```

### Performance Optimization

**Schema Caching**: The library automatically caches database schema. To force refresh:
```typescript
import { getDatabaseSchema } from 'squix-ai/db/introspector';
await getDatabaseSchema(prisma, provider, true);
```

**Model Selection**: Use faster models for simple queries:
```typescript
const agent = new Squix({
  models: {
    classifier: 'gemini-2.0-flash',  // Faster
    chat: 'gemini-2.0-flash'         // Faster
  }
});
```

## License

MIT License - See LICENSE file for details

---

## Support and Contribution

For bug reports, feature requests, or contributions, please visit the project repository.

**Documentation**: Full API documentation and examples
**Issues**: Report bugs or request features
**Discussions**: Community support and use case sharing

---

**Note**: This library is in active development. API may change between versions. Always refer to the changelog when upgrading.
