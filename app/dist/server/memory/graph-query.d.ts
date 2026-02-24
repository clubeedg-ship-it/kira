import { entities, facts, relationships } from '../../db/schema';
type Entity = typeof entities.$inferSelect;
type Fact = typeof facts.$inferSelect;
type Relationship = typeof relationships.$inferSelect;
export declare function searchEntities(userId: string, query: string, limit?: number): Promise<Entity[]>;
export declare function getEntityFacts(userId: string, entityName: string): Promise<Fact[]>;
export declare function getRelatedEntities(userId: string, entityName: string): Promise<Relationship[]>;
export declare function queryContextForText(userId: string, text: string): Promise<{
    entities: Entity[];
    facts: Fact[];
    relations: Relationship[];
}>;
export {};
