import { PrismaClient } from "@prisma/client";

let schemaCache: string | null = null;

export async function getDatabaseSchema(
  prisma: PrismaClient,
  provider: "postgresql" | "mysql",
  forceRefresh: boolean = false
): Promise<string> {
  if (schemaCache && !forceRefresh) {
    return schemaCache;
  }

  let schemaDescription = "";

  if (provider === "postgresql") {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_catalog.pg_tables
      WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';
    `;

    for (const table of tables) {
      if (table.tablename === "_prisma_migrations") continue;
      schemaDescription += await getPostgresTableSchema(
        prisma,
        table.tablename
      );
    }
  } else if (provider === "mysql") {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT table_name as tablename FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name != '_prisma_migrations';
    `;

    for (const table of tables) {
      schemaDescription += await getMysqlTableSchema(prisma, table.tablename);
    }
  }

  schemaCache = schemaDescription;
  return schemaDescription;
}

async function getPostgresTableSchema(
  prisma: PrismaClient,
  tablename: string
): Promise<string> {
  let tableDescription = `Table "${tablename}":\n`;

  const columns = await prisma.$queryRaw<
    Array<{ column_name: string; data_type: string; is_nullable: string }>
  >`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = ${tablename} ORDER BY ordinal_position;
  `;

  for (const c of columns) {
    const constraints: string[] = [];
    if (c.is_nullable === "NO") constraints.push("NOT NULL");
    const constraintsString =
      constraints.length > 0 ? ` (${constraints.join(", ")})` : "";
    tableDescription += `  - "${c.column_name}" (${c.data_type})${constraintsString}\n`;
  }

  const foreignKeys = await prisma.$queryRaw<
    Array<{ fk_column: string; target_table: string; target_column: string }>
  >`
    SELECT
        kcu.column_name as fk_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = ${tablename};
  `;

  if (foreignKeys.length > 0) {
    tableDescription += `  Relationships:\n`;
    foreignKeys.forEach((fk: any) => {
      tableDescription += `    - "${fk.fk_column}" references "${fk.target_table}"("${fk.target_column}")\n`;
    });
  }

  return tableDescription + "\n";
}

async function getMysqlTableSchema(
  prisma: PrismaClient,
  tablename: string
): Promise<string> {
  let tableDescription = `Table \`${tablename}\`:\n`;

  const columns = await prisma.$queryRaw<
    Array<{
      column_name: string;
      column_type: string;
      is_nullable: string;
      column_key: string;
    }>
  >`
    SELECT column_name, column_type, is_nullable, column_key
    FROM information_schema.columns
    WHERE table_name = ${tablename} AND table_schema = DATABASE()
    ORDER BY ordinal_position;
  `;

  for (const c of columns) {
    const constraints: string[] = [];
    if (c.column_key === "PRI") constraints.push("PRIMARY KEY");
    if (c.column_key === "UNI") constraints.push("UNIQUE");
    if (c.is_nullable === "NO") constraints.push("NOT NULL");
    const constraintsString =
      constraints.length > 0 ? ` (${constraints.join(", ")})` : "";
    tableDescription += `  - \`${c.column_name}\` (${c.column_type})${constraintsString}\n`;
  }

  const foreignKeys = await prisma.$queryRaw<
    Array<{ fk_column: string; target_table: string; target_column: string }>
  >`
    SELECT
        kcu.column_name as fk_column,
        kcu.referenced_table_name AS target_table,
        kcu.referenced_column_name AS target_column
    FROM information_schema.key_column_usage AS kcu
    WHERE kcu.table_name = ${tablename}
      AND kcu.table_schema = DATABASE()
      AND kcu.referenced_table_name IS NOT NULL;
  `;

  if (foreignKeys.length > 0) {
    tableDescription += `  Relationships:\n`;
    foreignKeys.forEach((fk: any) => {
      tableDescription += `    - \`${fk.fk_column}\` references \`${fk.target_table}\`(\`${fk.target_column}\`)\n`;
    });
  }

  return tableDescription + "\n";
}
