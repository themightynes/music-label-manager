import { 
  AdvanceMonthRequest, 
  AdvanceMonthResponse, 
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
  API_ROUTES
} from './contracts';

export class APIClient {
  constructor(private baseURL: string = '') {}
  
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
  
  async advanceMonth(request: AdvanceMonthRequest): Promise<AdvanceMonthResponse> {
    const validatedRequest = validateRequest(AdvanceMonthRequest, request);
    return this.request<AdvanceMonthResponse>(API_ROUTES.ADVANCE_MONTH, {
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

// Create a default client instance
export const apiClient = new APIClient();