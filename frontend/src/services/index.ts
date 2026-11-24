import type { CopilotApiClient } from '../types/api';
import { HttpCopilotApiClient } from './httpApiClient';
import { MockCopilotApiClient } from './mockApiClient';

const useMockApi = (import.meta.env.VITE_USE_MOCK_API ?? 'true') !== 'false';
const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api';

export const apiClient: CopilotApiClient = useMockApi
  ? new MockCopilotApiClient()
  : new HttpCopilotApiClient(apiBaseUrl);

export const IS_MOCK_API_CLIENT = useMockApi;
