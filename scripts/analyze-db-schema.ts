#!/usr/bin/env tsx
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { sql } from 'drizzle-orm';

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  udt_name: string;
}

interface ConstraintInfo {
  table_name: string;
  constraint_name: string;
  constraint_type: string;
  column_name: string;
  foreign_table_name: string | null;
  foreign_column_name: string | null;
}

interface IndexInfo {
  table_name: string;
  index_name: string;
  column_name: string;
  is_unique: boolean;
  is_primary: boolean;
}

interface SchemaDiscrepancy {
  type: 'error' | 'warning' | 'info';
  category: string;
  table?: string;
  column?: string;
  message: string;
  suggestion?: string;
}

class SchemaAnalyzer {
  private db: ReturnType<typeof drizzle>;
  private discrepancies: SchemaDiscrepancy[] = [];
  private databaseColumns: Map<string, ColumnInfo[]> = new Map();
  private databaseConstraints: Map<string, ConstraintInfo[]> = new Map();
  private databaseIndexes: Map<string, IndexInfo[]> = new Map();
  private zodSchemas: Map<string, any> = new Map();

  constructor(databaseUrl: string) {
    const queryClient = neon(databaseUrl);
    this.db = drizzle(queryClient, { schema });
  }

  async introspectDatabase() {
    console.log('🔍 Introspecting database schema...');
    
    // Get all columns
    const columnsResult = await this.db.execute<ColumnInfo>(sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    const columns = columnsResult.rows || [];

    // Get all constraints
    const constraintsResult = await this.db.execute<ConstraintInfo>(sql`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_type
    `);
    const constraints = constraintsResult.rows || [];

    // Get all indexes
    const indexesResult = await this.db.execute<IndexInfo>(sql`
      SELECT 
        t.relname AS table_name,
        i.relname AS index_name,
        a.attname AS column_name,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relkind = 'r'
      AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY t.relname, i.relname
    `);
    const indexes = indexesResult.rows || [];

    // Group by table
    for (const col of columns) {
      if (!this.databaseColumns.has(col.table_name)) {
        this.databaseColumns.set(col.table_name, []);
      }
      this.databaseColumns.get(col.table_name)!.push(col);
    }

    for (const con of constraints) {
      if (!this.databaseConstraints.has(con.table_name)) {
        this.databaseConstraints.set(con.table_name, []);
      }
      this.databaseConstraints.get(con.table_name)!.push(con);
    }

    for (const idx of indexes) {
      if (!this.databaseIndexes.has(idx.table_name)) {
        this.databaseIndexes.set(idx.table_name, []);
      }
      this.databaseIndexes.get(idx.table_name)!.push(idx);
    }

    console.log(`✅ Found ${this.databaseColumns.size} tables in database`);
  }

  parseZodSchemas() {
    console.log('📋 Parsing Zod schemas from code...');
    
    // Extract schema definitions from the schema export
    const tableSchemas = {
      users: schema.users,
      game_saves: schema.gameSaves,
      artists: schema.artists,
      mood_events: schema.moodEvents,
      roles: schema.roles,
      projects: schema.projects,
      songs: schema.songs,
      releases: schema.releases,
      release_songs: schema.releaseSongs,
      dialogue_choices: schema.dialogueChoices,
      game_events: schema.gameEvents,
      game_states: schema.gameStates,
      monthly_actions: schema.monthlyActions,
    };

    for (const [tableName, tableSchema] of Object.entries(tableSchemas)) {
      this.zodSchemas.set(tableName, tableSchema);
    }

    console.log(`✅ Parsed ${this.zodSchemas.size} table schemas from code`);
  }

  private mapDrizzleTypeToPostgres(field: any): string {
    const fieldType = field.dataType;
    const fieldName = field.name;
    
    if (fieldType === 'string') {
      if (fieldName.includes('uuid')) return 'uuid';
      if (fieldName.includes('text')) return 'text';
      if (fieldName.includes('varchar')) return 'character varying';
      return 'text';
    }
    if (fieldType === 'number') {
      if (fieldName.includes('integer')) return 'integer';
      if (fieldName.includes('real')) return 'real';
      return 'integer';
    }
    if (fieldType === 'boolean') return 'boolean';
    if (fieldType === 'json') return 'jsonb';
    if (fieldType === 'date') return 'timestamp without time zone';
    
    return fieldType;
  }

  compareSchemas() {
    console.log('🔄 Comparing database schema with Zod definitions...');

    // Check for missing tables
    for (const [tableName, tableSchema] of this.zodSchemas) {
      if (!this.databaseColumns.has(tableName)) {
        this.discrepancies.push({
          type: 'error',
          category: 'missing_table',
          table: tableName,
          message: `Table '${tableName}' is defined in Zod schema but missing in database`,
          suggestion: `Run migration to create table '${tableName}'`
        });
      }
    }

    // Check for extra tables in database
    for (const tableName of this.databaseColumns.keys()) {
      if (!this.zodSchemas.has(tableName)) {
        this.discrepancies.push({
          type: 'warning',
          category: 'extra_table',
          table: tableName,
          message: `Table '${tableName}' exists in database but not in Zod schema`,
          suggestion: `Consider removing table or adding to schema definition`
        });
      }
    }

    // Compare columns for each table
    for (const [tableName, tableSchema] of this.zodSchemas) {
      const dbColumns = this.databaseColumns.get(tableName);
      if (!dbColumns) continue;

      // Get column definitions from Drizzle table
      // Access the columns directly from the table object
      const tableColumns = Object.entries(tableSchema as any).filter(([key, value]) => {
        // Filter to get only column definitions (they have specific properties)
        return value && typeof value === 'object' && 
               'name' in value && 
               ('dataType' in value || 'columnType' in value);
      });
      
      const columnArray = tableColumns.map(([_, col]) => col);
      
      for (const column of columnArray) {
        const columnDef = column as any;
        const columnName = columnDef.name;
        const dbColumn = dbColumns.find(c => c.column_name === columnName);

        if (!dbColumn) {
          this.discrepancies.push({
            type: 'error',
            category: 'missing_column',
            table: tableName,
            column: columnName,
            message: `Column '${columnName}' is defined in schema but missing in database table '${tableName}'`,
            suggestion: `Add column via migration: ALTER TABLE ${tableName} ADD COLUMN ${columnName}`
          });
        } else {
          // Check type compatibility - improved mapping
          let expectedType = dbColumn.udt_name; // Default to actual type
          
          if (columnDef.dataType === 'string') {
            if (columnDef.columnType === 'PgUUID') expectedType = 'uuid';
            else if (columnDef.columnType === 'PgText') expectedType = 'text';
            else if (columnDef.columnType === 'PgVarchar') expectedType = 'varchar';
          } else if (columnDef.dataType === 'number') {
            if (columnDef.columnType === 'PgInteger') expectedType = 'int4';
            else if (columnDef.columnType === 'PgReal') expectedType = 'float4';
          } else if (columnDef.dataType === 'boolean') {
            expectedType = 'bool';
          } else if (columnDef.dataType === 'json') {
            expectedType = 'jsonb';
          } else if (columnDef.dataType === 'date') {
            expectedType = 'timestamp';
          }

          const actualType = dbColumn.udt_name;

          // Skip type check for compatible types
          const compatibleTypes = [
            ['text', 'text'],
            ['varchar', 'varchar'],
            ['int4', 'int4'],
            ['uuid', 'uuid'],
            ['bool', 'bool'],
            ['jsonb', 'jsonb'],
            ['timestamp', 'timestamp'],
            ['float4', 'float4']
          ];

          const isCompatible = compatibleTypes.some(([t1, t2]) => 
            (expectedType === t1 && actualType === t2) || (expectedType === t2 && actualType === t1)
          );

          if (!isCompatible && expectedType !== actualType) {
            this.discrepancies.push({
              type: 'warning',
              category: 'type_mismatch',
              table: tableName,
              column: columnName,
              message: `Type mismatch for '${tableName}.${columnName}': schema type '${columnDef.columnType}' vs database type '${actualType}'`,
              suggestion: `Review type compatibility and migrate if necessary`
            });
          }

          // Check nullable constraints
          const isNullable = !columnDef.notNull;
          const dbNullable = dbColumn.is_nullable === 'YES';

          if (isNullable !== dbNullable && !columnDef.hasDefault && !columnDef.isPrimaryKey) {
            this.discrepancies.push({
              type: 'warning',
              category: 'nullable_mismatch',
              table: tableName,
              column: columnName,
              message: `Nullable constraint mismatch for '${tableName}.${columnName}': schema says ${isNullable ? 'nullable' : 'NOT NULL'}, database has ${dbNullable ? 'nullable' : 'NOT NULL'}`,
              suggestion: `Update constraint: ALTER TABLE ${tableName} ALTER COLUMN ${columnName} ${isNullable ? 'DROP' : 'SET'} NOT NULL`
            });
          }
        }
      }

      // Check for extra columns in database
      for (const dbColumn of dbColumns) {
        const schemaHasColumn = columnArray.some((c: any) => c.name === dbColumn.column_name);
        if (!schemaHasColumn) {
          this.discrepancies.push({
            type: 'info',
            category: 'extra_column',
            table: tableName,
            column: dbColumn.column_name,
            message: `Column '${dbColumn.column_name}' exists in database table '${tableName}' but not in schema`,
            suggestion: `Consider removing column or adding to schema definition`
          });
        }
      }
    }
  }

  checkRelationships() {
    console.log('🔗 Checking foreign key relationships...');

    for (const [tableName, constraints] of this.databaseConstraints) {
      const foreignKeys = constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
      
      for (const fk of foreignKeys) {
        // Check if the relationship is defined in the Drizzle relations
        const tableSchema = this.zodSchemas.get(tableName);
        if (!tableSchema) continue;

        // Verify foreign key references exist
        if (!this.databaseColumns.has(fk.foreign_table_name!)) {
          this.discrepancies.push({
            type: 'error',
            category: 'invalid_foreign_key',
            table: tableName,
            column: fk.column_name,
            message: `Foreign key references non-existent table '${fk.foreign_table_name}'`,
            suggestion: `Fix foreign key constraint or create missing table`
          });
        }
      }
    }

    // Check for missing indexes on foreign keys
    for (const [tableName, constraints] of this.databaseConstraints) {
      const foreignKeys = constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
      const indexes = this.databaseIndexes.get(tableName) || [];

      for (const fk of foreignKeys) {
        const hasIndex = indexes.some(idx => idx.column_name === fk.column_name);
        if (!hasIndex) {
          this.discrepancies.push({
            type: 'warning',
            category: 'missing_index',
            table: tableName,
            column: fk.column_name,
            message: `Foreign key '${fk.column_name}' in table '${tableName}' lacks an index`,
            suggestion: `CREATE INDEX idx_${tableName}_${fk.column_name} ON ${tableName}(${fk.column_name})`
          });
        }
      }
    }
  }

  checkJsonbFields() {
    console.log('🎯 Checking JSONB field schemas...');

    for (const [tableName, columns] of this.databaseColumns) {
      const jsonbColumns = columns.filter(c => c.udt_name === 'jsonb');
      
      for (const jsonbCol of jsonbColumns) {
        // Check if we have Zod validation for this JSONB field
        const insertSchema = (schema as any)[`insert${tableName.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}Schema`];
        
        if (insertSchema) {
          this.discrepancies.push({
            type: 'info',
            category: 'jsonb_validation',
            table: tableName,
            column: jsonbCol.column_name,
            message: `JSONB field '${jsonbCol.column_name}' in table '${tableName}' should have structured validation`,
            suggestion: `Consider adding Zod schema validation for JSONB content`
          });
        }
      }
    }
  }

  calculateHealthScore(): number {
    const errorCount = this.discrepancies.filter(d => d.type === 'error').length;
    const warningCount = this.discrepancies.filter(d => d.type === 'warning').length;
    const infoCount = this.discrepancies.filter(d => d.type === 'info').length;

    // Base score starts at 100
    let score = 100;
    
    // Deduct points for issues:
    // - Critical errors: -10 points each
    // - Warnings: -3 points each  
    // - Info: -0.5 points each
    score -= errorCount * 10;
    score -= warningCount * 3;
    score -= infoCount * 0.5;

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));
    return Math.round(score * 100) / 100;
  }

  async generateReport() {
    console.log('📝 Generating analysis report...');

    const healthScore = this.calculateHealthScore();
    const errors = this.discrepancies.filter(d => d.type === 'error');
    const warnings = this.discrepancies.filter(d => d.type === 'warning');
    const infos = this.discrepancies.filter(d => d.type === 'info');

    const report = `# Database Schema Analysis Report

Generated: ${new Date().toISOString()}

## Executive Summary

**Health Score: ${healthScore}%** ${healthScore >= 90 ? '✅' : healthScore >= 70 ? '⚠️' : '❌'}

- **Critical Issues:** ${errors.length}
- **Warnings:** ${warnings.length}
- **Information:** ${infos.length}

## Database Overview

- **Total Tables in Database:** ${this.databaseColumns.size}
- **Total Tables in Schema:** ${this.zodSchemas.size}
- **Total Constraints:** ${Array.from(this.databaseConstraints.values()).flat().length}
- **Total Indexes:** ${Array.from(this.databaseIndexes.values()).flat().length}

## Critical Issues ${errors.length > 0 ? '❌' : '✅'}

${errors.length === 0 ? '*No critical issues found*' : errors.map(e => `
### ${e.category.replace(/_/g, ' ').toUpperCase()}

- **Table:** ${e.table || 'N/A'}
- **Column:** ${e.column || 'N/A'}
- **Issue:** ${e.message}
- **Fix:** ${e.suggestion || 'Manual review required'}
`).join('\n')}

## Warnings ⚠️

${warnings.length === 0 ? '*No warnings found*' : warnings.map(w => `
### ${w.category.replace(/_/g, ' ').toUpperCase()}

- **Table:** ${w.table || 'N/A'}
- **Column:** ${w.column || 'N/A'}
- **Issue:** ${w.message}
- **Recommendation:** ${w.suggestion || 'Consider reviewing'}
`).join('\n')}

## Information ℹ️

${infos.length === 0 ? '*No additional information*' : infos.map(i => `
### ${i.category.replace(/_/g, ' ').toUpperCase()}

- **Table:** ${i.table || 'N/A'}
- **Column:** ${i.column || 'N/A'}
- **Note:** ${i.message}
- **Suggestion:** ${i.suggestion || 'For your consideration'}
`).join('\n')}

## Recommended Actions

${this.generateRecommendations()}

## Migration Script Template

\`\`\`sql
-- Auto-generated migration suggestions
-- Review carefully before executing

${this.generateMigrationSuggestions()}
\`\`\`

## Table Details

${Array.from(this.databaseColumns.entries()).map(([tableName, columns]) => `
### ${tableName}

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
${columns.map(c => `| ${c.column_name} | ${c.data_type} | ${c.is_nullable} | ${c.column_default || 'NULL'} |`).join('\n')}

**Constraints:**
${(this.databaseConstraints.get(tableName) || []).map(c => `- ${c.constraint_type}: ${c.column_name}${c.foreign_table_name ? ` -> ${c.foreign_table_name}.${c.foreign_column_name}` : ''}`).join('\n')}

**Indexes:**
${(this.databaseIndexes.get(tableName) || []).map(i => `- ${i.index_name} on ${i.column_name} ${i.is_unique ? '(UNIQUE)' : ''} ${i.is_primary ? '(PRIMARY)' : ''}`).join('\n')}
`).join('\n')}

## Next Steps

1. Review critical issues and apply necessary migrations
2. Consider implementing suggested indexes for performance
3. Update schema definitions to match database reality
4. Run validation tests after any changes
5. Document any intentional discrepancies

---

*This report was generated automatically by the Database Schema Analyzer*
`;

    const reportPath = path.join(process.cwd(), 'docs', 'database-analysis-report.md');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);

    console.log(`✅ Report generated at: ${reportPath}`);
    console.log(`📊 Health Score: ${healthScore}%`);

    return report;
  }

  private generateRecommendations(): string {
    const recommendations: string[] = [];

    if (this.discrepancies.filter(d => d.type === 'error').length > 0) {
      recommendations.push('1. **Immediate Action Required:** Address all critical issues before deployment');
    }

    if (this.discrepancies.filter(d => d.category === 'missing_index').length > 0) {
      recommendations.push('2. **Performance Optimization:** Add missing indexes on foreign key columns');
    }

    if (this.discrepancies.filter(d => d.category === 'type_mismatch').length > 0) {
      recommendations.push('3. **Type Safety:** Review and fix type mismatches between schema and database');
    }

    if (this.discrepancies.filter(d => d.category === 'jsonb_validation').length > 0) {
      recommendations.push('4. **Data Validation:** Implement structured validation for JSONB fields');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Schema is in good health. Continue with regular maintenance.');
    }

    return recommendations.join('\n');
  }

  private generateMigrationSuggestions(): string {
    const migrations: string[] = [];

    for (const disc of this.discrepancies) {
      if (disc.type === 'error') {
        if (disc.category === 'missing_table') {
          migrations.push(`-- Create missing table: ${disc.table}`);
          migrations.push(`-- Review schema.ts for full table definition\n`);
        } else if (disc.category === 'missing_column' && disc.suggestion) {
          migrations.push(disc.suggestion + ';');
        }
      } else if (disc.type === 'warning' && disc.category === 'missing_index' && disc.suggestion) {
        migrations.push(disc.suggestion + ';');
      }
    }

    return migrations.join('\n') || '-- No automatic migrations suggested';
  }

  async run() {
    try {
      await this.introspectDatabase();
      this.parseZodSchemas();
      this.compareSchemas();
      this.checkRelationships();
      this.checkJsonbFields();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🚀 Starting Database Schema Analysis...\n');
  
  const analyzer = new SchemaAnalyzer(process.env.DATABASE_URL);
  await analyzer.run();

  console.log('\n✨ Analysis complete!');
}

main().catch(console.error);