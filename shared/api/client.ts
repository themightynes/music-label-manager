import { AdvanceMonthRequest, AdvanceMonthResponse, SignArtistRequest, StartProjectRequest, ArtistResponse, ProjectResponse } from './contracts';

export class APIClient {
  constructor(private baseURL: string = '') {}
  
  async advanceMonth(request: AdvanceMonthRequest): Promise<AdvanceMonthResponse> {
    const response = await fetch(`${this.baseURL}/api/advance-month`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data as AdvanceMonthResponse;
  }

  async signArtist(request: SignArtistRequest): Promise<ArtistResponse> {
    const response = await fetch(`${this.baseURL}/api/artists/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }

  async startProject(request: StartProjectRequest): Promise<ProjectResponse> {
    const response = await fetch(`${this.baseURL}/api/projects/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }
}