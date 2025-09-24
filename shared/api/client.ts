import { 
  AdvanceWeekRequest, 
  AdvanceWeekResponse, 
  SelectActionsRequest,
  SelectActionsResponse,
  SignArtistRequest, 
  SignArtistResponse,
  StartProjectRequest,
  StartProjectResponse,
  GetGameStateResponse,
  ErrorResponse,
  validateRequest,
  createErrorResponse,
  API_ROUTES,
  gameEndpoints
} from './contracts';

class APIClient {
  private baseURL: string;
  private gameId: string | null = null;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  setGameId(gameId: string) {
    this.gameId = gameId;
  }

  private replaceParams(endpoint: string, params: Record<string, string> = {}): string {
    let url = endpoint;
    
    // Auto-inject gameId if available
    if (this.gameId && url.includes(':gameId')) {
      params.gameId = this.gameId;
    }
    
    // Replace all :param with actual values
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
    
    return url;
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = this.replaceParams(endpoint, params);
    const response = await fetch(`${this.baseURL}${url}`);
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  async post<T>(endpoint: string, data: any, params?: Record<string, string>): Promise<T> {
    const url = this.replaceParams(endpoint, params);
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }
  
  // Legacy methods for backward compatibility
  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'HTTP_ERROR', 
        message: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    return response.json();
  }
  
  async getGameState(gameId?: string): Promise<GetGameStateResponse> {
    const url = gameId ? `/api/game/${gameId}` : API_ROUTES.GAME_STATE;
    return this.request<GetGameStateResponse>(url);
  }
  
  async advanceWeek(request: AdvanceWeekRequest): Promise<AdvanceWeekResponse> {
    const validatedRequest = validateRequest(AdvanceWeekRequest, request);
    return this.request<AdvanceWeekResponse>(API_ROUTES.ADVANCE_WEEK, {
      method: 'POST',
      body: JSON.stringify(validatedRequest),
    });
  }
  
  async selectActions(request: SelectActionsRequest): Promise<SelectActionsResponse> {
    const validatedRequest = validateRequest(SelectActionsRequest, request);
    return this.request<SelectActionsResponse>(API_ROUTES.SELECT_ACTIONS, {
      method: 'POST',
      body: JSON.stringify(validatedRequest),
    });
  }
  
  async signArtist(request: SignArtistRequest): Promise<SignArtistResponse> {
    const validatedRequest = validateRequest(SignArtistRequest, request);
    const url = API_ROUTES.SIGN_ARTIST.replace(':gameId', request.gameId);
    return this.request<SignArtistResponse>(url, {
      method: 'POST',
      body: JSON.stringify(validatedRequest),
    });
  }
  
  async startProject(request: StartProjectRequest): Promise<StartProjectResponse> {
    const validatedRequest = validateRequest(StartProjectRequest, request);
    const url = API_ROUTES.START_PROJECT.replace(':gameId', request.gameId);
    return this.request<StartProjectResponse>(url, {
      method: 'POST',
      body: JSON.stringify(validatedRequest),
    });
  }
}

export const apiClient = new APIClient();