import { 
  users, gameSaves, artists, roles, projects, dialogueChoices, 
  gameEvents, gameStates, monthlyActions,
  type User, type InsertUser, type GameSave, type InsertGameSave,
  type Artist, type InsertArtist, type Project, type InsertProject,
  type GameState, type InsertGameState, type MonthlyAction, type InsertMonthlyAction,
  type DialogueChoice, type GameEvent, type Role
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Game saves
  getGameSaves(userId: string): Promise<GameSave[]>;
  getGameSave(id: string): Promise<GameSave | undefined>;
  createGameSave(gameSave: InsertGameSave): Promise<GameSave>;
  updateGameSave(id: string, gameSave: Partial<InsertGameSave>): Promise<GameSave>;
  deleteGameSave(id: string): Promise<void>;

  // Game state
  getGameState(id: string): Promise<GameState | undefined>;
  createGameState(gameState: InsertGameState): Promise<GameState>;
  updateGameState(id: string, gameState: Partial<InsertGameState>): Promise<GameState>;

  // Artists
  getArtistsByGame(gameId: string): Promise<Artist[]>;
  getArtist(id: string): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;
  updateArtist(id: string, artist: Partial<InsertArtist>): Promise<Artist>;

  // Projects
  getProjectsByGame(gameId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;

  // Roles
  getRolesByGame(gameId: string): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  updateRole(id: string, role: Partial<Role>): Promise<Role>;

  // Dialogue and events
  getDialogueChoices(roleType: string, sceneId?: string): Promise<DialogueChoice[]>;
  getGameEvents(): Promise<GameEvent[]>;

  // Monthly actions
  getMonthlyActions(gameId: string, month?: number): Promise<MonthlyAction[]>;
  createMonthlyAction(action: InsertMonthlyAction): Promise<MonthlyAction>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Game saves
  async getGameSaves(userId: string): Promise<GameSave[]> {
    return await db.select().from(gameSaves)
      .where(eq(gameSaves.userId, userId))
      .orderBy(desc(gameSaves.updatedAt));
  }

  async getGameSave(id: string): Promise<GameSave | undefined> {
    const [save] = await db.select().from(gameSaves).where(eq(gameSaves.id, id));
    return save || undefined;
  }

  async createGameSave(gameSave: InsertGameSave): Promise<GameSave> {
    const [save] = await db.insert(gameSaves).values(gameSave).returning();
    return save;
  }

  async updateGameSave(id: string, gameSave: Partial<InsertGameSave>): Promise<GameSave> {
    const [save] = await db.update(gameSaves)
      .set({ ...gameSave, updatedAt: new Date() })
      .where(eq(gameSaves.id, id))
      .returning();
    return save;
  }

  async deleteGameSave(id: string): Promise<void> {
    await db.delete(gameSaves).where(eq(gameSaves.id, id));
  }

  // Game state
  async getGameState(id: string): Promise<GameState | undefined> {
    const [state] = await db.select().from(gameStates).where(eq(gameStates.id, id));
    return state || undefined;
  }

  async createGameState(gameState: InsertGameState): Promise<GameState> {
    const [state] = await db.insert(gameStates).values(gameState).returning();
    return state;
  }

  async updateGameState(id: string, gameState: Partial<InsertGameState>): Promise<GameState> {
    const [state] = await db.update(gameStates)
      .set({ ...gameState, updatedAt: new Date() })
      .where(eq(gameStates.id, id))
      .returning();
    return state;
  }

  // Artists
  async getArtistsByGame(gameId: string): Promise<Artist[]> {
    return await db.select().from(artists).where(eq(artists.gameId, gameId));
  }

  async getArtist(id: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.id, id));
    return artist || undefined;
  }

  async createArtist(artist: InsertArtist): Promise<Artist> {
    const [newArtist] = await db.insert(artists).values(artist).returning();
    return newArtist;
  }

  async updateArtist(id: string, artist: Partial<InsertArtist>): Promise<Artist> {
    const [updatedArtist] = await db.update(artists)
      .set(artist)
      .where(eq(artists.id, id))
      .returning();
    return updatedArtist;
  }

  // Projects
  async getProjectsByGame(gameId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.gameId, gameId));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db.update(projects)
      .set(project)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  // Roles
  async getRolesByGame(gameId: string): Promise<Role[]> {
    return await db.select().from(roles).where(eq(roles.gameId, gameId));
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async updateRole(id: string, role: Partial<Role>): Promise<Role> {
    const [updatedRole] = await db.update(roles)
      .set(role)
      .where(eq(roles.id, id))
      .returning();
    return updatedRole;
  }

  // Dialogue and events
  async getDialogueChoices(roleType: string, sceneId?: string): Promise<DialogueChoice[]> {
    const conditions = sceneId 
      ? and(eq(dialogueChoices.roleType, roleType), eq(dialogueChoices.sceneId, sceneId))
      : eq(dialogueChoices.roleType, roleType);
    
    return await db.select().from(dialogueChoices).where(conditions);
  }

  async getGameEvents(): Promise<GameEvent[]> {
    return await db.select().from(gameEvents);
  }

  // Monthly actions
  async getMonthlyActions(gameId: string, month?: number): Promise<MonthlyAction[]> {
    const conditions = month 
      ? and(eq(monthlyActions.gameId, gameId), eq(monthlyActions.month, month))
      : eq(monthlyActions.gameId, gameId);
    
    return await db.select().from(monthlyActions).where(conditions);
  }

  async createMonthlyAction(action: InsertMonthlyAction): Promise<MonthlyAction> {
    const [newAction] = await db.insert(monthlyActions).values(action).returning();
    return newAction;
  }
}

export const storage = new DatabaseStorage();
